import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import type { PeriodFilter } from '@/hooks/useFinanceStatsByPeriod';

type ColorTuple = [number, number, number];

const COLORS: { [key: string]: ColorTuple } = {
    primary: [16, 185, 129],
    primaryDark: [5, 150, 105],
    primaryLight: [167, 243, 208],
    textDark: [17, 24, 39],
    textMedium: [75, 85, 99],
    textLight: [107, 114, 128],
    textBody: [55, 65, 81],
    background: [249, 250, 251],
    white: [255, 255, 255],
    success: [34, 197, 94],
    danger: [239, 68, 68],
};

const MARGIN = 15;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

const DEFAULT_COMPANY_INFO = {
    name: '@COCCINELLE',
    addresses: ['44, Kokolo, Q/Mbinza Pigeon, C/Ngaliema - Kinshasa'],
    phone: '(+243) 970 746 213 / (+243) 851 958 937',
    email: 'sales@coccinelledrc.com',
};

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
            addresses: DEFAULT_COMPANY_INFO.addresses,
            phone: map['telephone_entreprise'] || DEFAULT_COMPANY_INFO.phone,
            email: map['email_entreprise'] || DEFAULT_COMPANY_INFO.email,
        };
    } catch {
        return DEFAULT_COMPANY_INFO;
    }
};

const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
};

const getPeriodTitle = (period: PeriodFilter): string => {
    const titles: Record<PeriodFilter, string> = { day: 'Journalier', week: 'Hebdomadaire', month: 'Mensuel', year: 'Annuel' };
    return titles[period] || '';
};

export const generateFinanceReportPDF = async (data: FinanceReportData, previewMode: boolean = false): Promise<Blob | string> => {
    const COMPANY_INFO = await loadCompanySettings();
    const doc = new jsPDF('p', 'mm', 'a4');
    let y = MARGIN;

    const setFont = (style: 'normal' | 'bold' = 'normal') => doc.setFont('helvetica', style);

    // Header bars
    doc.setFillColor(...COLORS.primaryDark);
    doc.rect(0, 0, PAGE_WIDTH, 1.5, 'F');
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 1.5, PAGE_WIDTH, 1.5, 'F');
    doc.setFillColor(...COLORS.primaryLight);
    doc.rect(0, 3, PAGE_WIDTH, 1, 'F');

    y += 2;

    // Company name
    setFont('bold');
    doc.setFontSize(20);
    doc.setTextColor(...COLORS.primary);
    doc.text(COMPANY_INFO.name, MARGIN, y);

    y += 7;
    setFont('normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.textMedium);
    doc.text(COMPANY_INFO.addresses[0], MARGIN, y);
    y += 3;
    doc.text(`Tél: ${COMPANY_INFO.phone}`, MARGIN, y);
    y += 3;
    doc.text(`Email: ${COMPANY_INFO.email}`, MARGIN, y);

    // Report info box
    const headerRightX = 118;
    const headerRightY = MARGIN + 2;
    const boxWidth = PAGE_WIDTH - headerRightX - MARGIN;
    const boxHeight = 32;

    doc.setFillColor(...COLORS.background);
    doc.rect(headerRightX, headerRightY, boxWidth, boxHeight, 'F');

    setFont('bold');
    doc.setFontSize(14);
    doc.setTextColor(...COLORS.textDark);
    doc.text(`RAPPORT ${getPeriodTitle(data.period).toUpperCase()}`, PAGE_WIDTH - MARGIN - 8, headerRightY + 10, { align: 'right' });

    doc.setDrawColor(...COLORS.primaryLight);
    doc.setLineWidth(0.5);
    doc.line(headerRightX + 8, headerRightY + 14, headerRightX + boxWidth - 8, headerRightY + 14);

    setFont('normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textLight);
    doc.text("Période:", headerRightX + 8, headerRightY + 21);
    setFont('bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textDark);
    doc.text(data.periodLabel, headerRightX + boxWidth - 8, headerRightY + 21, { align: 'right' });

    setFont('normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textLight);
    doc.text("Généré le:", headerRightX + 8, headerRightY + 27);
    setFont('bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.textDark);
    doc.text(format(new Date(), 'dd/MM/yyyy HH:mm', { locale: fr }), headerRightX + boxWidth - 8, headerRightY + 27, { align: 'right' });

    y = Math.max(y, headerRightY + boxHeight) + 8;

    // Separator
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(2);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    doc.setLineWidth(0.2);

    y += 15;

    // Summary title
    setFont('bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLORS.textDark);
    doc.text('RÉSUMÉ FINANCIER', MARGIN, y);
    y += 8;

    // Stats cards
    const cardWidth = (CONTENT_WIDTH - 15) / 4;
    const cardHeight = 30;
    const cardY = y;

    const statsCards = [
        { title: 'Revenus', value: data.totalRevenue, change: data.revenueChange, color: COLORS.success, isPositive: true },
        { title: 'Dépenses', value: data.totalDepenses, change: data.depensesChange, color: COLORS.danger, isPositive: false },
        { title: 'Transferts', value: data.totalTransferts, change: 0, color: [59, 130, 246] as ColorTuple, isPositive: true },
        { title: 'Solde Net', value: data.soldeNet, change: 0, color: data.soldeNet >= 0 ? COLORS.success : COLORS.danger, isPositive: data.soldeNet >= 0 },
    ];

    statsCards.forEach((stat, index) => {
        const cardX = MARGIN + (index * (cardWidth + 5));
        doc.setFillColor(...COLORS.white);
        doc.rect(cardX, cardY, cardWidth, cardHeight, 'F');
        doc.setFillColor(...stat.color);
        doc.rect(cardX, cardY, cardWidth, 3, 'F');

        setFont('normal');
        doc.setFontSize(8);
        doc.setTextColor(...COLORS.textLight);
        doc.text(stat.title, cardX + cardWidth / 2, cardY + 10, { align: 'center' });

        setFont('bold');
        doc.setFontSize(12);
        doc.setTextColor(...stat.color);
        doc.text(formatCurrency(stat.value), cardX + cardWidth / 2, cardY + 19, { align: 'center' });

        if (stat.change !== 0) {
            setFont('normal');
            doc.setFontSize(7);
            const changeColor = stat.isPositive ? (stat.change > 0 ? COLORS.success : COLORS.danger) : (stat.change > 0 ? COLORS.danger : COLORS.success);
            doc.setTextColor(...changeColor);
            doc.text(`${stat.change > 0 ? '+' : ''}${stat.change.toFixed(1)}%`, cardX + cardWidth / 2, cardY + 26, { align: 'center' });
        }
    });

    y = cardY + cardHeight + 15;

    // Table
    setFont('bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.textDark);
    doc.text('ANALYSE DÉTAILLÉE', MARGIN, y);
    y += 8;

    const summaryData = [
        ['Revenus', formatCurrency(data.totalRevenue), `${data.revenueChange > 0 ? '+' : ''}${data.revenueChange.toFixed(1)}%`],
        ['Dépenses', formatCurrency(data.totalDepenses), `${data.depensesChange > 0 ? '+' : ''}${data.depensesChange.toFixed(1)}%`],
        ['Transferts/Swap', formatCurrency(data.totalTransferts), '-'],
        ['Solde Net', formatCurrency(data.soldeNet), data.soldeNet >= 0 ? 'Bénéfice' : 'Perte'],
    ];

    autoTable(doc, {
        startY: y,
        head: [['Type', 'Montant', 'Variation']],
        body: summaryData,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: COLORS.primary, textColor: COLORS.white, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 60 }, 1: { cellWidth: 50, halign: 'right', fontStyle: 'bold' }, 2: { cellWidth: 40, halign: 'center' } },
        margin: { left: MARGIN, right: MARGIN },
    });

    y = (doc as any).lastAutoTable.finalY + 15;

    // Bar chart
    setFont('bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.textDark);
    doc.text('RÉPARTITION REVENUS VS DÉPENSES', MARGIN, y);
    y += 10;

    const maxWidth = CONTENT_WIDTH - 40;
    const maxValue = Math.max(data.totalRevenue, data.totalDepenses, 1);

    setFont('normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.textBody);
    doc.text('Revenus', MARGIN, y);
    const revenueWidth = (data.totalRevenue / maxValue) * maxWidth;
    doc.setFillColor(...COLORS.success);
    doc.rect(MARGIN + 30, y - 4, revenueWidth, 6, 'F');
    setFont('bold');
    doc.text(formatCurrency(data.totalRevenue), MARGIN + 35 + revenueWidth, y);
    y += 12;

    setFont('normal');
    doc.setTextColor(...COLORS.textBody);
    doc.text('Dépenses', MARGIN, y);
    const depensesWidth = (data.totalDepenses / maxValue) * maxWidth;
    doc.setFillColor(...COLORS.danger);
    doc.rect(MARGIN + 30, y - 4, depensesWidth, 6, 'F');
    setFont('bold');
    doc.text(formatCurrency(data.totalDepenses), MARGIN + 35 + depensesWidth, y);

    // Footer
    const footerY = 280;
    doc.setDrawColor(...COLORS.primary);
    doc.setLineWidth(1);
    doc.line(MARGIN, footerY - 8, PAGE_WIDTH - MARGIN, footerY - 8);
    setFont('normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textLight);
    doc.text(`Rapport généré par FactureX | ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, PAGE_WIDTH / 2, footerY - 3, { align: 'center' });
    doc.setFillColor(...COLORS.primary);
    doc.rect(0, 294, PAGE_WIDTH, 3, 'F');

    if (previewMode) {
        return doc.output('blob');
    } else {
        const fileName = `Rapport_${getPeriodTitle(data.period)}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        doc.save(fileName);
        return fileName;
    }
};

export default generateFinanceReportPDF;
