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

        // Fetch rates for conversion
        const { data: settings } = await supabase
            .from('settings')
            .select('cle, valeur, categorie')
            .in('categorie', ['taux_change'])
            .in('cle', ['usdToCny', 'usdToCdf']);

        const rates = { usdToCny: 6.95, usdToCdf: 2200 };
        settings?.forEach((setting: any) => {
            if (setting.cle === 'usdToCny') rates.usdToCny = parseFloat(setting.valeur) || 6.95;
            if (setting.cle === 'usdToCdf') rates.usdToCdf = parseFloat(setting.valeur) || 2200;
        });

        // Fetch paginated transactions for the table
        const { data: transactions, error, count } = await supabase
            .from('transactions')
            .select(`
        *,
        client:clients(nom)
      `, { count: 'exact' })
            .in('type_transaction', ['revenue', 'depense', 'expense'])
            .gte('date_paiement', startDate.toISOString())
            .lte('date_paiement', endDate.toISOString())
            .order('date_paiement', { ascending: false })
            .range(from, to);

        if (error) throw error;

        // Fetch all transactions for the summary (since we need volume and totals)
        const { data: allTransactions, error: summaryError } = await supabase
            .from('transactions')
            .select('montant, devise, type_transaction')
            .in('type_transaction', ['revenue', 'depense', 'expense'])
            .gte('date_paiement', startDate.toISOString())
            .lte('date_paiement', endDate.toISOString());

        if (summaryError) throw summaryError;

        const summary = {
            totalRevenue: { usd: 0, cdf: 0, cny: 0 },
            totalExpense: { usd: 0, cdf: 0, cny: 0 },
            netProfit: 0,
            transactionCount: allTransactions?.length || 0
        };

        // Variables pour le calcul du Net Profit global en USD
        let totalRevenueConvertedUSD = 0;
        let totalExpenseConvertedUSD = 0;

        allTransactions?.forEach(tx => {
            const montant = Number(tx.montant) || 0;
            const devise = tx.devise as 'USD' | 'CDF' | 'CNY';

            // Calcul du montant converti en USD pour le Net Profit global
            let montantUSD = montant;
            if (devise === 'CDF') montantUSD = montant / rates.usdToCdf;
            else if (devise === 'CNY') montantUSD = montant / rates.usdToCny;

            if (tx.type_transaction === 'revenue') {
                if (devise === 'USD') summary.totalRevenue.usd += montant;
                else if (devise === 'CDF') summary.totalRevenue.cdf += montant;
                else if (devise === 'CNY') summary.totalRevenue.cny += montant;
                
                totalRevenueConvertedUSD += montantUSD;
            } else if (tx.type_transaction === 'expense' || tx.type_transaction === 'depense') {
                if (devise === 'USD') summary.totalExpense.usd += montant;
                else if (devise === 'CDF') summary.totalExpense.cdf += montant;
                else if (devise === 'CNY') summary.totalExpense.cny += montant;
                
                totalExpenseConvertedUSD += montantUSD;
            }
        });

        // Le profit net est maintenant calculé sur la base de toutes les transactions converties en USD
        summary.netProfit = totalRevenueConvertedUSD - totalExpenseConvertedUSD;

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
            .in('type_transaction', ['revenue', 'depense', 'expense'])
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString())
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Fetch company settings
        const { data: settingsData } = await supabase
            .from('settings')
            .select('cle, valeur')
            .eq('categorie', 'company');

        const companySettings = (settingsData || []).reduce((acc: any, curr) => {
            acc[curr.cle] = curr.valeur;
            return acc;
        }, {});

        const boName = companySettings['nom_entreprise']?.toUpperCase() || 'FACTUREX';
        const rawRccm = companySettings['rccm'] || '';
        const idNat = companySettings['idnat'] || '';
        const numImpot = companySettings['nif'] || '';

        const doc = new jsPDF();

        // ------------------ HEADER ------------------
        // Corporate Blue Line at the top
        doc.setFillColor(16, 185, 129); // Emerald
        doc.rect(0, 0, doc.internal.pageSize.width, 6, 'F');

        // Logo / App Name
        doc.setFontSize(24);
        doc.setTextColor(16, 185, 129);
        doc.setFont('helvetica', 'bold');
        doc.text(boName, 14, 25);

        // Legal Info
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.setFont('helvetica', 'normal');
        let legalText = [];
        if (rawRccm) legalText.push(`RCCM: ${rawRccm}`);
        if (idNat) legalText.push(`ID NAT: ${idNat}`);
        if (numImpot) legalText.push(`NIF: ${numImpot}`);
        if (legalText.length > 0) {
            doc.text(legalText.join(' | '), 14, 30);
        }

        // Title
        doc.setFontSize(14);
        doc.setTextColor(55, 65, 81);
        doc.setFont('helvetica', 'bold');
        // Push the title slightly down to account for the legal text
        doc.text('BILAN FINANCIER PÉRIODIQUE', 14, 42);

        // Meta Info (Right aligned)
        doc.setFontSize(10);
        doc.setTextColor(107, 114, 128);
        doc.setFont('helvetica', 'normal');
        const rightColX = doc.internal.pageSize.width - 14;
        doc.text(`Période du :`, rightColX, 25, { align: 'right' });
        doc.setFont('helvetica', 'bold');
        doc.text(period, rightColX, 30, { align: 'right' });

        doc.setFont('helvetica', 'normal');
        doc.text(`Édité le :`, rightColX, 36, { align: 'right' });
        doc.text(format(new Date(), 'dd/MM/yyyy à HH:mm'), rightColX, 41, { align: 'right' });

        // Horizontal Rule
        doc.setDrawColor(229, 231, 235);
        doc.line(14, 48, doc.internal.pageSize.width - 14, 48);

        // ------------------ SUMMARY TABLE ------------------
        doc.setFontSize(12);
        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'bold');
        doc.text('RÉSUMÉ DES FLUX', 14, 58);

        const netUsd = summary.totalRevenue.usd - summary.totalExpense.usd;
        const netCdf = summary.totalRevenue.cdf - summary.totalExpense.cdf;
        const netCny = summary.totalRevenue.cny - summary.totalExpense.cny;

        const summaryBody = [
            ['ENCAISSEMENTS (+)', `${summary.totalRevenue.usd.toFixed(2)} USD`, `${summary.totalRevenue.cdf.toLocaleString()} CDF`, `${summary.totalRevenue.cny.toFixed(2)} CNY`],
            ['DÉCAISSEMENTS (-)', `${summary.totalExpense.usd.toFixed(2)} USD`, `${summary.totalExpense.cdf.toLocaleString()} CDF`, `${summary.totalExpense.cny.toFixed(2)} CNY`],
            ['SOLDE NET (=)', `${netUsd.toFixed(2)} USD`, `${netCdf.toLocaleString()} CDF`, `${netCny.toFixed(2)} CNY`]
        ];

        autoTable(doc, {
            startY: 63,
            head: [['Catégorie', 'Compte USD ($)', 'Compte CDF (FC)', 'Compte CNY (¥)']],
            body: summaryBody,
            theme: 'grid',
            headStyles: { fillColor: [243, 244, 246], textColor: [55, 65, 81], fontStyle: 'bold', halign: 'center' },
            bodyStyles: { textColor: [31, 41, 55], fontSize: 10 },
            columnStyles: {
                0: { fontStyle: 'bold', halign: 'left' },
                1: { halign: 'right' },
                2: { halign: 'right' },
                3: { halign: 'right' }
            },
            didParseCell: function (data) {
                // Apply green/red specifically for the last row (Solde Net)
                if (data.section === 'body' && data.row.index === 2 && data.column.index > 0) {
                    const txt = data.cell.text[0] || '';
                    if (txt.startsWith('-')) {
                        data.cell.styles.textColor = [239, 68, 68]; // Red
                    } else {
                        data.cell.styles.textColor = [16, 185, 129]; // Emerald
                    }
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        });

        // ------------------ DETAILS TABLE ------------------
        const lastY = (doc as any).lastAutoTable.finalY || 80;
        doc.setFontSize(12);
        doc.setTextColor(31, 41, 55);
        doc.setFont('helvetica', 'bold');
        doc.text('DÉTAIL DES TRANSACTIONS', 14, lastY + 15);

        const typeLabel = (type: string) => {
            if (type === 'revenue') return 'RECETTE';
            if (type === 'depense' || type === 'expense') return 'DÉPENSE';
            return type.toUpperCase();
        };

        const detailsRows = (allTransactions || []).map(tx => {
            const isRecette = tx.type_transaction === 'revenue';
            return [
                format(new Date(tx.created_at), 'dd/MM/yyyy'),
                typeLabel(tx.type_transaction),
                (tx.client as any)?.nom || '—',
                tx.motif || '—',
                `${isRecette ? '+' : '-'}${Number(tx.montant).toFixed(2)} ${tx.devise}`
            ];
        });

        autoTable(doc, {
            startY: lastY + 20,
            head: [['Date', 'Opération', 'Client / Tiers', 'Description', 'Montant']],
            body: detailsRows,
            theme: 'plain',
            headStyles: {
                fillColor: [249, 250, 251],
                textColor: [107, 114, 128],
                fontStyle: 'bold',
                lineWidth: { bottom: 0.5 },
                lineColor: [229, 231, 235]
            },
            bodyStyles: {
                textColor: [55, 65, 81],
                fontSize: 9,
                lineWidth: { bottom: 0.1 },
                lineColor: [243, 244, 246]
            },
            columnStyles: {
                4: { halign: 'right', fontStyle: 'bold' },
                1: { fontSize: 8 }
            },
            didParseCell: function (data) {
                // Colorize amounts based on +/-
                if (data.section === 'body' && data.column.index === 4) {
                    const txt = data.cell.text[0] || '';
                    if (txt.startsWith('+')) {
                        data.cell.styles.textColor = [16, 185, 129];
                    } else if (txt.startsWith('-')) {
                        data.cell.styles.textColor = [239, 68, 68];
                    }
                }
            }
        });

        // ------------------ FOOTER ------------------
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);

            // Footer line
            doc.setDrawColor(229, 231, 235);
            doc.line(14, doc.internal.pageSize.height - 15, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 15);

            doc.setFontSize(8);
            doc.setTextColor(156, 163, 175);
            doc.setFont('helvetica', 'normal');

            doc.text(`Document financier généré pour ${boName}.`, 14, doc.internal.pageSize.height - 10);
            doc.text(`Page 0${i} / 0${pageCount}`, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 10, { align: 'right' });
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
