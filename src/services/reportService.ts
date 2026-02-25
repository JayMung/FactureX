import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export interface ReportData {
    summary: {
        totalRevenue: { usd: number; cdf: number; cny: number };
        totalExpense: { usd: number; cdf: number; cny: number };
        netProfit: number;
        transactionCount: number;
    };
    details: any[];
    period: string;
}

export const ReportService = {
    /**
     * Fetch and aggregate transaction data for a given period
     */
    async getFinancialReport(startDate: Date, endDate: Date, page: number = 1, pageSize: number = 20): Promise<ReportData> {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        // Fetch paginated transactions for the table
        const { data: transactions, error, count } = await supabase
            .from('transactions')
            .select(`
        *,
        client:clients(nom)
      `, { count: 'exact' })
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // Fetch all transactions for the summary (since we need volume and totals)
        const { data: allTransactions, error: summaryError } = await supabase
            .from('transactions')
            .select('montant, devise, type_transaction')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

        if (summaryError) throw summaryError;

        const summary = {
            totalRevenue: { usd: 0, cdf: 0, cny: 0 },
            totalExpense: { usd: 0, cdf: 0, cny: 0 },
            netProfit: 0,
            transactionCount: allTransactions?.length || 0
        };

        allTransactions?.forEach(tx => {
            const montant = Number(tx.montant) || 0;
            const devise = tx.devise as 'USD' | 'CDF' | 'CNY';

            if (tx.type_transaction === 'revenue') {
                if (devise === 'USD') summary.totalRevenue.usd += montant;
                else if (devise === 'CDF') summary.totalRevenue.cdf += montant;
                else if (devise === 'CNY') summary.totalRevenue.cny += montant;
            } else if (tx.type_transaction === 'expense' || tx.type_transaction === 'depense') {
                if (devise === 'USD') summary.totalExpense.usd += montant;
                else if (devise === 'CDF') summary.totalExpense.cdf += montant;
                else if (devise === 'CNY') summary.totalExpense.cny += montant;
            }
        });

        summary.netProfit = summary.totalRevenue.usd - summary.totalExpense.usd;

        return {
            summary,
            details: transactions || [],
            period: `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`
        };
    },

    /**
     * Export data to Excel
     */
    exportToExcel(data: ReportData, fileName: string) {
        const wsData = data.details.map(tx => ({
            'Date': format(new Date(tx.created_at), 'dd/MM/yyyy HH:mm'),
            'Type': tx.type_transaction,
            'Client': tx.client?.nom || 'N/A',
            'Motif': tx.motif,
            'Montant': tx.montant,
            'Devise': tx.devise,
            'Frais': tx.frais,
            'Bénéfice': tx.benefice,
            'Statut': tx.statut
        }));

        const ws = XLSX.utils.json_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    },

    /**
     * Build a jsPDF document for the given period — shared by export and preview
     */
    async _buildPDFDoc(startDate: Date, endDate: Date, period: string, summary: any): Promise<InstanceType<typeof jsPDF>> {
        const { data: allTransactions, error } = await supabase
            .from('transactions')
            .select('*, client:clients(nom)')
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;

        const doc = new jsPDF();

        doc.setFontSize(22);
        doc.setTextColor(16, 185, 129);
        doc.text('FACTUREX', 14, 20);

        doc.setFontSize(16);
        doc.setTextColor(31, 41, 55);
        doc.text('Rapport Financier Périodique', 14, 30);

        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.text(`Période : ${period}`, 14, 38);
        doc.text(`Généré le : ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 44);

        doc.setFontSize(14);
        doc.setTextColor(31, 41, 55);
        doc.text('Résumé des flux', 14, 55);

        const summaryBody = [
            ['RECETTES', `${summary.totalRevenue.usd.toFixed(2)} USD`, `${summary.totalRevenue.cdf.toLocaleString()} CDF`, `${summary.totalRevenue.cny.toFixed(2)} CNY`],
            ['DÉPENSES', `${summary.totalExpense.usd.toFixed(2)} USD`, `${summary.totalExpense.cdf.toLocaleString()} CDF`, `${summary.totalExpense.cny.toFixed(2)} CNY`]
        ];

        autoTable(doc, {
            startY: 60,
            head: [['Type de flux', 'Monnaie USD', 'Monnaie CDF', 'Monnaie CNY']],
            body: summaryBody,
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129], fontStyle: 'bold' },
            styles: { fontSize: 10, cellPadding: 3 }
        });

        const lastY = (doc as any).lastAutoTable.finalY || 80;
        doc.setFontSize(14);
        doc.text('Détail des transactions', 14, lastY + 15);

        const typeLabel = (type: string) => {
            if (type === 'revenue') return 'RECETTE';
            if (type === 'depense' || type === 'expense') return 'DÉPENSE';
            if (type === 'transfert' || type === 'swap') return 'TRANSFERT';
            return type.toUpperCase();
        };

        const detailsRows = (allTransactions || []).map(tx => [
            format(new Date(tx.created_at), 'dd/MM/yyyy'),
            typeLabel(tx.type_transaction),
            (tx.client as any)?.nom || 'PASSAGER',
            tx.motif || '-',
            `${Number(tx.montant).toFixed(2)} ${tx.devise}`
        ]);

        autoTable(doc, {
            startY: lastY + 20,
            head: [['Date', 'Type', 'Client', 'Motif', 'Montant']],
            body: detailsRows,
            theme: 'striped',
            headStyles: { fillColor: [55, 65, 81] },
            styles: { fontSize: 8, cellPadding: 2 },
            columnStyles: { 4: { halign: 'right', fontStyle: 'bold' } }
        });

        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.text(`Page ${i} sur ${pageCount} - Généré par FactureX`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        }

        return doc;
    },

    /**
     * Export data to PDF (download)
     */
    async exportToPDF(startDate: Date, endDate: Date, period: string, summary: any, fileName: string) {
        try {
            const doc = await this._buildPDFDoc(startDate, endDate, period, summary);
            doc.save(`${fileName}.pdf`);
        } catch (err) {
            console.error('CRITICAL ERROR during PDF generation:', err);
            throw err;
        }
    },

    /**
     * Generate PDF and return as Blob for inline preview
     */
    async generatePDFBlob(startDate: Date, endDate: Date, period: string, summary: any): Promise<Blob> {
        const doc = await this._buildPDFDoc(startDate, endDate, period, summary);
        return doc.output('blob');
    }
};
