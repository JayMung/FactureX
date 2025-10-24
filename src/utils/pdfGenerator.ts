import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Facture } from '@/types';

// Déclare l'extension autoTable pour jsPDF
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

// --- CONFIGURATION DU DESIGN ---

const COLORS = {
    primary: [16, 185, 129],      // emerald-600
    primaryLight: [209, 250, 229], // emerald-100
    primaryLighter: [240, 253, 244], // emerald-50
    textDark: [17, 24, 39],       // gray-900
    textBody: [55, 65, 81],        // gray-700
    textLight: [107, 114, 128],    // gray-500
    border: [229, 231, 235],      // gray-200
    background: [249, 250, 251],  // gray-50
    white: [255, 255, 255],
};

const MARGIN = 15;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

const COMPANY_INFO = {
    name: '@COCCINELLE',
    addresses: [
        '44, Kokolo, Q/Mbinza Pigeon, C/Ngaliema - Kinshasa',
        '45, Avenue Nyangwe - Elie Mbayo, Q/Lido, C/Lubumbashi'
    ],
    phone: '(+243) 970 746 213 / (+243) 851 958 937',
    email: 'sales@coccinelledrc.com',
    website: 'www.coccinelledrc.com',
    rccm: 'CD/KNG/RCCM/21-B-02464',
    idnat: '01-F4300-N89171B',
    impot: 'A2173499P',
    banks: [
        { name: 'EQUITY BCDC', details: '| 0001105023-32000099001-60 | COCCINELLE' },
        { name: 'RAWBANK', details: '| 65101-00941018001-91 | COCCINELLE SARL' }
    ],
    paymentMethods: '097 074 6213 / 085 195 8937 / 082 835 8721 / 083 186 3288',
    deliveryTime: '65-75 Jours selon les types de marchandises',
    feesDescription: 'Les frais de 15% inclus dans le coût global contiennent les frais de services & frais de transfert.'
};

// --- FONCTION PRINCIPALE DE GÉNÉRATION PDF ---

export const generateFacturePDF = async (facture: Facture) => {
    try {
        const doc = new jsPDF('p', 'mm', 'a4');
        let y = MARGIN;

        const setFont = (style: 'normal' | 'bold' = 'normal') => doc.setFont('helvetica', style);
        const formatCurrency = (amount: number, currency: string) => {
            const options = { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 };
            const formatted = new Intl.NumberFormat('en-US', options).format(amount);
            return currency === 'USD' ? `$${formatted}` : `${formatted} FC`;
        };

        // ========================================
        // 1. EN-TÊTE
        // ========================================
        setFont('bold');
        doc.setFontSize(24);
        doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.text(COMPANY_INFO.name, MARGIN, y);
        
        setFont('normal');
        doc.setFontSize(8);
        doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
        
        y += 8;
        setFont('bold');
        doc.text("Sièges:", MARGIN, y);
        setFont('normal');
        y += 3.5;
        doc.text(COMPANY_INFO.addresses[0], MARGIN, y);
        y += 3.5;
        doc.text(COMPANY_INFO.addresses[1], MARGIN, y);
        
        y += 5;
        doc.text(`Tél: ${COMPANY_INFO.phone}`, MARGIN, y);
        y += 3.5;
        doc.text(`Email: ${COMPANY_INFO.email}`, MARGIN, y);
        y += 3.5;
        doc.text(`Site: ${COMPANY_INFO.website}`, MARGIN, y);

        const headerRightX = 120;
        const headerRightY = MARGIN;
        doc.setFillColor(COLORS.background[0], COLORS.background[1], COLORS.background[2]);
        doc.roundedRect(headerRightX, headerRightY, PAGE_WIDTH - headerRightX - MARGIN, 25, 3, 3, 'F');

        setFont('bold');
        doc.setFontSize(22);
        doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
        doc.text("FACTURE", headerRightX + 10, headerRightY + 10);

        setFont('normal');
        doc.setFontSize(9);
        doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
        doc.text("Facture No.:", headerRightX + 10, headerRightY + 18);
        setFont('bold');
        doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
        doc.text(facture.facture_number, headerRightX + 35, headerRightY + 18);

        setFont('normal');
        doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
        doc.text("Date Facture:", headerRightX + 10, headerRightY + 22);
        setFont('bold');
        doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
        doc.text(format(new Date(facture.date_emission), 'dd/MM/yyyy', { locale: fr }), headerRightX + 35, headerRightY + 22);

        y = Math.max(y, headerRightY + 25) + 5;
        doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.setLineWidth(1.5);
        doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
        doc.setLineWidth(0.2);

        y += 8;

        // ========================================
        // 2. INFORMATIONS CLIENT & LIVRAISON
        // ========================================
        const client = facture.client || facture.clients;
        if (client) {
            doc.setFillColor(COLORS.primaryLighter[0], COLORS.primaryLighter[1], COLORS.primaryLighter[2]);
            doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 22, 3, 3, 'F');
            y += 6;

            setFont('bold');
            doc.setFontSize(10);
            doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
            doc.text("Client(e)", MARGIN + 5, y);
            doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
            doc.line(MARGIN + 5, y + 1, MARGIN + 25, y + 1);

            setFont('normal');
            doc.setFontSize(9);
            doc.text(`Nom: ${client.nom}`, MARGIN + 5, y + 6);
            doc.text(`Lieu: ${client.ville}`, MARGIN + 5, y + 10);
            doc.text(`Téléphone: ${client.telephone}`, MARGIN + 5, y + 14);

            const deliveryX = MARGIN + (CONTENT_WIDTH / 2);
            setFont('bold');
            doc.text("Livraison", deliveryX, y);
            doc.line(deliveryX, y + 1, deliveryX + 25, y + 1);

            setFont('normal');
            doc.text(`Destination: ${client.ville}`, deliveryX, y + 6);
            doc.text(`Méthode: ${facture.mode_livraison === 'aerien' ? 'Aérien' : 'BATEAU'}`, deliveryX, y + 10);
        }
        y += 28;

        // ========================================
        // 3. TABLEAU DES ARTICLES
        // ========================================
        if (facture.items && facture.items.length > 0) {
            const tableHeaders = ['NUM', 'IMAGE', 'QTY', 'DESCRIPTION', 'PRIX UNIT', 'POIDS/CBM', 'MONTANT'];
            const tableData = facture.items.map(item => [
                item.numero_ligne,
                item.image_url || '(img)',
                item.quantite,
                item.description,
                formatCurrency(item.prix_unitaire, facture.devise),
                `${item.poids.toFixed(2)}`,
                formatCurrency(item.montant_total, facture.devise)
            ]);

            doc.autoTable({
                startY: y,
                head: [tableHeaders],
                body: tableData,
                theme: 'grid',
                headStyles: {
                    fillColor: COLORS.primary,
                    textColor: COLORS.white,
                    fontStyle: 'bold',
                    fontSize: 8,
                    halign: 'center'
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 10 },
                    1: { halign: 'center', cellWidth: 20 },
                    2: { halign: 'center', cellWidth: 10 },
                    3: { halign: 'left', cellWidth: 65 },
                    4: { halign: 'right', cellWidth: 25 },
                    5: { halign: 'right', cellWidth: 20 },
                    6: { halign: 'right', cellWidth: 25, fontStyle: 'bold' },
                },
                didDrawCell: (data: any) => {
                    if (data.section === 'body' && data.column.index === 1) {
                        const url = data.cell.raw;
                        if (typeof url === 'string' && url.startsWith('http')) {
                            try {
                                doc.addImage(url, 'JPEG', data.cell.x + 2, data.cell.y + 2, 15, 15);
                            } catch (e) {
                                doc.setFillColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
                                doc.rect(data.cell.x + 2, data.cell.y + 2, 15, 15, 'F');
                                doc.text('(img)', data.cell.x + 9.5, data.cell.y + 9.5, { align: 'center' });
                            }
                        } else {
                            doc.setFillColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
                            doc.rect(data.cell.x + 2, data.cell.y + 2, 15, 15, 'F');
                            doc.text('(img)', data.cell.x + 9.5, data.cell.y + 9.5, { align: 'center' });
                        }
                    }
                },
                margin: { left: MARGIN, right: MARGIN },
            });
            y = doc.autoTable.previous.finalY + 10;
        }

        // ========================================
        // 4. TOTAUX
        // ========================================
        const totalsX = 110;
        const valueX = PAGE_WIDTH - MARGIN;
        const fees = facture.subtotal * 0.15; // Frais de service à 15%
        const grandTotal = facture.subtotal + fees + facture.shipping_fee;

        setFont('normal');
        doc.setFontSize(9);
        doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
        doc.text("SOUS-TOTAL", totalsX, y);
        setFont('bold');
        doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
        doc.text(formatCurrency(facture.subtotal, facture.devise), valueX, y, { align: 'right' });
        y += 6;
        doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
        doc.line(totalsX, y - 2.5, valueX, y - 2.5);

        setFont('normal');
        doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
        doc.text("Frais (15% de services & transfert)", totalsX, y);
        setFont('bold');
        doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
        doc.text(formatCurrency(fees, facture.devise), valueX, y, { align: 'right' });
        y += 6;
        doc.line(totalsX, y - 2.5, valueX, y - 2.5);

        setFont('normal');
        doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
        doc.text("TRANSPORT & DOUANE", totalsX, y);
        setFont('bold');
        doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
        doc.text(formatCurrency(facture.shipping_fee, facture.devise), valueX, y, { align: 'right' });
        y += 6;

        doc.setFillColor(COLORS.primaryLight[0], COLORS.primaryLight[1], COLORS.primaryLight[2]);
        doc.roundedRect(totalsX, y - 2, valueX - totalsX, 10, 2, 2, 'F');
        setFont('bold');
        doc.setFontSize(12);
        doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
        doc.text("TOTAL GÉNÉRAL", totalsX + 5, y + 4);
        doc.setFontSize(14);
        doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.text(formatCurrency(grandTotal, facture.devise), valueX - 5, y + 4, { align: 'right' });

        y += 20;

        // ========================================
        // 5. PIED DE PAGE
        // ========================================
        doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
        doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
        y += 6;

        setFont('bold');
        doc.setFontSize(8);
        doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
        doc.text("Conditions:", MARGIN, y);
        setFont('normal');
        doc.text(COMPANY_INFO.feesDescription, MARGIN + 18, y);
        y += 5;

        setFont('bold');
        doc.text("Délais de livraison:", MARGIN, y);
        setFont('normal');
        doc.text(COMPANY_INFO.deliveryTime, MARGIN + 30, y);
        y += 5;

        setFont('bold');
        doc.text("Paiement par Mobile Money:", MARGIN, y);
        setFont('normal');
        doc.text(COMPANY_INFO.paymentMethods, MARGIN + 45, y);
        y += 8;

        doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
        y += 5;

        setFont('bold');
        doc.setFontSize(9);
        doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
        doc.text("INFORMATIONS BANCAIRES ET LÉGALES:", PAGE_WIDTH / 2, y, { align: 'center' });
        y += 6;

        setFont('normal');
        doc.setFontSize(8);
        COMPANY_INFO.banks.forEach(bank => {
            const bankNameWidth = doc.getTextWidth(bank.name);
            setFont('bold');
            doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
            doc.text(bank.name, PAGE_WIDTH / 2 - doc.getTextWidth(bank.name + bank.details) / 2, y);
            setFont('normal');
            doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
            doc.text(bank.details, PAGE_WIDTH / 2 - doc.getTextWidth(bank.name + bank.details) / 2 + bankNameWidth, y);
            y += 4;
        });
        y += 2;

        doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
        const legalInfo = `RCCM: ${COMPANY_INFO.rccm} | ID.NAT: ${COMPANY_INFO.idnat} | IMPOT: ${COMPANY_INFO.impot}`;
        doc.text(legalInfo, PAGE_WIDTH / 2, y, { align: 'center' });

        // --- SAUVEGARDE DU FICHIER ---
        const fileName = `${facture.type}_${facture.facture_number}.pdf`;
        doc.save(fileName);

    } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
        throw new Error('Impossible de générer le PDF.');
    }
};