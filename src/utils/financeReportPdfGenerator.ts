import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import type { PeriodFilter } from '@/utils/dateUtils';

// --- CONFIGURATION DU DESIGN MODERNE ---

type ColorTuple = [number, number, number];

// Copie des couleurs de pdfGenerator.ts pour consistance
const COLORS: { [key: string]: ColorTuple } = {
    primary: [16, 185, 129],      // emerald-600
    primaryDark: [5, 150, 105],   // emerald-700
    primaryLight: [167, 243, 208], // emerald-300
    primaryLighter: [209, 250, 229], // emerald-100
    textDark: [17, 24, 39],       // gray-900
    textBody: [55, 65, 81],       // gray-700
    textMedium: [75, 85, 99],     // gray-600
    textLight: [107, 114, 128],   // gray-500
    border: [229, 231, 235],      // gray-200
    background: [249, 250, 251],  // gray-50
    white: [255, 255, 255],
    success: [34, 197, 94],       // green-500
    danger: [239, 68, 68],        // red-500
};

const MARGIN = 15;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

const DEFAULT_COMPANY_INFO = {
    name: '@COCCINELLE',
    addresses: [
        '44, Kokolo, Q/Mbinza Pigeon, C/Ngaliema - Kinshasa',
        '45, Avenue Nyangwe - Elie Mbayo, Q/Lido, C/Lubumbashi'
    ],
    phone: '(+243) 970 746 213 / (+243) 851 958 937',
    email: 'sales@coccinelledrc.com',
};

interface Transaction {
    montant: number;
    motif?: string;
    type_transaction?: string;
    devise?: string;
    benefice?: number;
    created_at?: string;
}

interface FinanceReportData {
    period: PeriodFilter;
    periodLabel: string;
    dateStart: Date;
    dateEnd: Date;
    totalRevenue: number;
    totalDepenses: number;
    totalTransferts: number;
    soldeNet: number;
    revenueChange: number;
    depensesChange: number;
    transactionsCount: number;
    transactions?: Transaction[];
}

const loadCompanySettings = async () => {
    try {
        const { data: settings } = await supabase
            .from('settings')
            .select('cle, valeur')
            .in('categorie', ['company', 'invoice']);

        if (!settings?.length) return DEFAULT_COMPANY_INFO;

        const map: Record<string, string> = {};
        settings.forEach(s => { map[s.cle] = s.valeur || ''; });

        return {
            name: map['nom_entreprise'] || DEFAULT_COMPANY_INFO.name,
            addresses: [
                DEFAULT_COMPANY_INFO.addresses[0],
                map['adresse_entreprise'] || DEFAULT_COMPANY_INFO.addresses[1]
            ],
            phone: map['telephone_entreprise'] || DEFAULT_COMPANY_INFO.phone,
            email: map['email_entreprise'] || DEFAULT_COMPANY_INFO.email,
        };
    } catch {
        return DEFAULT_COMPANY_INFO;
    }
};

const formatCurrency = (amount: number, currency: string = 'USD'): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 2 }).format(amount);
};

const getPeriodTitle = (period: PeriodFilter): string => {
    const titles: Record<PeriodFilter, string> = { day: 'Journalier', week: 'Hebdomadaire', month: 'Mensuel', year: 'Annuel', all: 'Global' };
    return titles[period] || 'Rapport';
};

export const generateFinanceReportPDF = async (data: FinanceReportData, previewMode: boolean = false): Promise<Blob | string> => {
    const COMPANY_INFO = await loadCompanySettings();
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = MARGIN;

    const setFont = (style: 'normal' | 'bold' = 'normal') => doc.setFont('helvetica', style);

    // ========================================
    // 1. EN-TÊTE COMPANY (DESIGN MODERNE)
    // ========================================

    doc.setFillColor(...COLORS.primaryDark);
    doc.rect(0, 0, PAGE_WIDTH, 1.5, 'F');
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 1.5, PAGE_WIDTH, 1.5, 'F');
    doc.setFillColor(...COLORS.primaryLight);
    doc.rect(0, 3, PAGE_WIDTH, 1, 'F');

    y += 2;

    setFont('bold');
    doc.setFontSize(20);
    doc.setTextColor(...COLORS.primary);
    doc.text(COMPANY_INFO.name, MARGIN, y);

    y += 7;
    setFont('normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMedium);
    COMPANY_INFO.addresses.forEach(addr => {
        doc.text(addr, MARGIN, y);
        y += 3.5;
    });
    doc.text(`Tél: ${COMPANY_INFO.phone}`, MARGIN, y);
    y += 3.5;
    doc.text(`Email: ${COMPANY_INFO.email}`, MARGIN, y);

    // Info box (droite)
    const headerRightX = 118;
    const headerRightY = MARGIN + 2;
    const boxWidth = PAGE_WIDTH - headerRightX - MARGIN;
    const boxHeight = 32;

    doc.setFillColor(...COLORS.background);
    doc.rect(headerRightX, headerRightY, boxWidth, boxHeight, 'F');

    setFont('bold');
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.textDark);
    doc.text(`RAPPORT FINANCIER`, PAGE_WIDTH - MARGIN - 8, headerRightY + 10, { align: 'right' });

    // Ligne décorative info box
    doc.setDrawColor(...COLORS.primaryLight);
    doc.setLineWidth(0.5);
    doc.line(headerRightX + 8, headerRightY + 14, headerRightX + boxWidth - 8, headerRightY + 14);

    setFont('bold');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.primary);
    doc.text(getPeriodTitle(data.period).toUpperCase(), PAGE_WIDTH - MARGIN - 8, headerRightY + 20, { align: 'right' });

    setFont('normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textMedium);
    doc.text(data.periodLabel, PAGE_WIDTH - MARGIN - 8, headerRightY + 26, { align: 'right' });

    y = Math.max(y, headerRightY + boxHeight) + 8;

    // Ligne séparation principale
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(1.5);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 10;

    // ========================================
    // 2. EXECUTIVE SUMMARY (CARDS)
    // ========================================

    setFont('bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.textDark);
    doc.text('PERFORMANCE FINANCIÈRE', MARGIN, y);
    y += 6;

    const cards = [
        { title: 'REVENUS TOTAL', value: data.totalRevenue, change: data.revenueChange, color: COLORS.success }, // Green
        { title: 'DÉPENSES TOTAL', value: data.totalDepenses, change: data.depensesChange, color: COLORS.danger },  // Red
        { title: 'TRANSFERTS', value: data.totalTransferts, change: 0, color: [59, 130, 246] as ColorTuple }, // Blue
        { title: 'RÉSULTAT NET', value: data.soldeNet, change: 0, color: data.soldeNet >= 0 ? COLORS.success : COLORS.danger } // Dynamic
    ];

    const cardGap = 4;
    const cardWidth = (CONTENT_WIDTH - (cardGap * (cards.length - 1))) / cards.length;
    const cardHeight = 30;

    cards.forEach((card, i) => {
        const x = MARGIN + (i * (cardWidth + cardGap));

        // Card background
        doc.setFillColor(...COLORS.background); // Gray background
        doc.rect(x, y, cardWidth, cardHeight, 'F');

        // Color top border
        doc.setFillColor(...card.color);
        doc.rect(x, y, cardWidth, 2, 'F');

        // Title
        setFont('bold');
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.textLight);
        doc.text(card.title, x + (cardWidth / 2), y + 10, { align: 'center' });

        // Value
        setFont('bold');
        doc.setFontSize(11); // Slightly larger
        doc.setTextColor(...card.color);
        doc.text(formatCurrency(card.value), x + (cardWidth / 2), y + 19, { align: 'center' });

        // Change %
        if (card.change !== 0) {
            const isPos = card.change > 0;
            const changeText = `${isPos ? '+' : ''}${card.change}% vs précédent`;
            setFont('normal');
            doc.setFontSize(6);
            doc.setTextColor(...(isPos ? COLORS.success : COLORS.danger));
            doc.text(changeText, x + (cardWidth / 2), y + 25, { align: 'center' });
        }
    });

    y += cardHeight + 12;

    // ========================================
    // 3. TABLEAU DES TRANSACTIONS
    // ========================================

    if (data.transactions && data.transactions.length > 0) {
        setFont('bold');
        doc.setFontSize(12);
        doc.setTextColor(...COLORS.textDark);
        doc.text('DÉTAIL DES TRANSACTIONS', MARGIN, y);
        y += 4; // Space before table

        // Transform data for autotable
        const tableBody = data.transactions.map(t => [
            format(new Date(t.created_at || new Date()), 'dd/MM/yyyy HH:mm'),
            t.motif || t.type_transaction || 'N/A',
            t.type_transaction?.toUpperCase() || '-',
            formatCurrency(t.montant),
            // Utiliser une couleur différente pour le type (montant > 0 ou < 0 visuel uniquement dans PDF)
            // Ceci est géré par didParseCell ou hooks, ici on garde simple
        ]);

        autoTable(doc, {
            startY: y,
            head: [['DATE', 'MOTIF / DESCRIPTION', 'TYPE', 'MONTANT']],
            body: tableBody,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 3,
                textColor: COLORS.textBody,
                lineColor: COLORS.border,
                lineWidth: 0.1,
            },
            headStyles: {
                fillColor: COLORS.primary,
                textColor: COLORS.white,
                fontStyle: 'bold',
                halign: 'left',
            },
            columnStyles: {
                0: { cellWidth: 35 },
                1: { cellWidth: 'auto' }, // Fill remaining
                2: { cellWidth: 30 },
                3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
            },
            alternateRowStyles: {
                fillColor: COLORS.background,
            },
            didParseCell: function (data) {
                // Coloriser le montant en fonction du type ou valeur si besoin
                // Pour l'instant on garde standard
            },
        });

        // Set y to end of table
        y = (doc as any).lastAutoTable.finalY + 15;
    } else {
        // No transactions
        setFont('normal');
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.textLight);
        doc.text("Aucune transaction détaillée disponible pour cette période.", MARGIN, y + 10);
        y += 20;
    }

    // ========================================
    // 4. FOOTER
    // ========================================

    // Add new page if y is too low
    if (y > 270) {
        doc.addPage();
        y = MARGIN;
    }

    // Bas de page
    const footerY = 285;

    doc.setDrawColor(...COLORS.primaryLight);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, footerY - 5, PAGE_WIDTH - MARGIN, footerY - 5);

    setFont('normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textLight);

    const now = format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr });
    doc.text(`Généré par FactureX le ${now}`, MARGIN, footerY);

    const pageCount = doc.getNumberOfPages();
    // Impossible d'ajouter "Page X/Y" facilement sans plugin alias, mais on peut mettre le total à la fin ou page courant
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.text(`Page ${i}/${pageCount}`, PAGE_WIDTH - MARGIN, 285, { align: 'right' });
    }

    if (previewMode) {
        return doc.output('blob');
    } else {
        const fileName = `Rapport_${getPeriodTitle(data.period)}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        doc.save(fileName);
        return fileName;
    }
};

export default generateFinanceReportPDF;
