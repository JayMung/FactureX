import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Facture, FactureItem, CompanySettings } from '@/types';
import { supabase } from '@/integrations/supabase/client';

// Helper pour récupérer et convertir une image en base64 pour l'intégrer au PDF
async function fetchImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    // Utilise un proxy pour éviter les problèmes de CORS si nécessaire
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error("Échec de la récupération de l'image pour le PDF:", e);
    return null;
  }
}

export const generateFacturePDF = async (facture: Facture & { items: FactureItem[] }) => {
  const doc = new jsPDF();
  const companySettings = await getCompanySettings();

  const primaryColor = '#004A64'; // Bleu sarcelle foncé
  const secondaryColor = '#FFC107'; // Jaune
  const headerGreenColor = '#2E7D67'; // Vert foncé
  const footerGreenColor = '#2E7D67';

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // --- EN-TÊTE ---
  const headerY = 15;
  // Côté gauche : Logo et informations de l'entreprise
  if (companySettings.logo_url) {
    const logoData = await fetchImageAsBase64(companySettings.logo_url);
    if (logoData) {
      doc.addImage(logoData, 'PNG', margin, headerY, 45, 22);
    }
  }
  
  doc.setFontSize(9);
  doc.setTextColor('#333');
  let y = headerY + 30;
  doc.text(companySettings.adresse_entreprise || '', margin, y);
  y += 4;
  doc.text(`Tel: ${companySettings.telephone_entreprise || ''}`, margin, y);
  y += 4;
  doc.text(`Email: ${companySettings.email_entreprise || ''}`, margin, y);
  y += 4;
  doc.text(`Web: www.coccinelledrc.com`, margin, y);

  // Côté droit : Boîte verte
  const boxWidth = 65;
  const boxX = pageWidth - margin - boxWidth;
  doc.setFillColor(headerGreenColor);
  doc.rect(boxX, headerY, boxWidth, 28, 'F');

  doc.setTextColor(255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(facture.type.toUpperCase(), boxX + boxWidth / 2, headerY + 10, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Facture No.: ${facture.facture_number}`, boxX + 5, headerY + 19);
  doc.text(`Date Facture: ${new Date(facture.date_emission).toLocaleDateString('fr-FR')}`, boxX + 5, headerY + 25);

  // --- INFORMATIONS CLIENT & LIVRAISON ---
  y = headerY + 50;
  doc.setTextColor(primaryColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT(E):', margin, y);
  doc.text('LIEU:', margin, y + 4);
  doc.text('PHONE:', margin, y + 8);

  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  const client = facture.clients || facture.client;
  doc.text(client?.nom || '', margin + 20, y);
  doc.text(client?.ville || '', margin + 20, y + 4);
  doc.text(client?.telephone || '', margin + 20, y + 8);

  doc.setTextColor(primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.text('LIVRAISON:', pageWidth / 2, y);
  doc.text('METHODE:', pageWidth / 2, y + 4);

  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  doc.text(client?.ville || '', pageWidth / 2 + 25, y);
  doc.text(facture.mode_livraison === 'aerien' ? 'AVION' : 'BATEAU', pageWidth / 2 + 25, y + 4);

  // --- TABLEAU ---
  const tableY = y + 20;
  const head = [['NUM', 'IMAGE', 'QTY', 'DESCRIPTION', 'PRIX UNIT', 'POIDS/CBM', 'MONTANT']];
  const body = await Promise.all(facture.items.map(async item => ([
    item.numero_ligne,
    await fetchImageAsBase64(item.image_url || '') || '', // Pré-charger l'image
    item.quantite,
    item.description,
    formatCurrency(item.prix_unitaire, facture.devise),
    item.poids,
    formatCurrency(item.montant_total, facture.devise)
  ])));

  (doc as any).autoTable({
    startY: tableY,
    head: head,
    body: body,
    theme: 'grid',
    headStyles: {
      fillColor: primaryColor,
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 25, minCellHeight: 25 },
      2: { halign: 'center', cellWidth: 10 },
      3: { cellWidth: 60 },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'right' },
    },
    didDrawCell: (data: any) => {
      if (data.column.index === 1 && data.cell.section === 'body' && data.cell.raw) {
        const imgData = data.cell.raw as string;
        if (imgData.startsWith('data:image')) {
          doc.addImage(imgData, 'PNG', data.cell.x + 2.5, data.cell.y + 2.5, 20, 20);
        }
      }
    },
  });

  // --- TOTAUX ---
  let finalY = (doc as any).lastAutoTable.finalY;
  const totalsX = pageWidth - margin - 80;
  const totalRowHeight = 7;

  const drawTotalRow = (label: string, value: string, y: number, labelColor: string | number[] = '#000', valueColor: string | number[] = '#000') => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(labelColor as any);
    doc.text(label, totalsX, y);
    doc.setTextColor(valueColor as any);
    doc.text(value, pageWidth - margin, y, { align: 'right' });
  };

  finalY += 7;
  drawTotalRow('SOUS-TOTAL', formatCurrency(facture.subtotal, facture.devise), finalY);
  finalY += totalRowHeight;
  
  const frais = facture.subtotal * 0.10; // Supposons 10% de frais comme dans le modèle
  drawTotalRow('Frais', formatCurrency(frais, facture.devise), finalY);
  finalY += totalRowHeight;

  doc.setFillColor(primaryColor);
  doc.rect(totalsX - 20, finalY - 5, 100, totalRowHeight, 'F');
  drawTotalRow('TRANSPORT & DOUANE', formatCurrency(facture.frais_transport_douane, facture.devise), finalY, '#fff', '#fff');
  finalY += totalRowHeight;

  const totalGeneral = facture.subtotal + frais + facture.frais_transport_douane;
  doc.setFillColor(primaryColor);
  doc.rect(totalsX - 20, finalY - 5, 50, totalRowHeight, 'F');
  doc.setFillColor(secondaryColor);
  doc.rect(totalsX + 30, finalY - 5, 50, totalRowHeight, 'F');
  drawTotalRow('TOTAL GÉNÉRALE', formatCurrency(totalGeneral, facture.devise), finalY, '#fff', '#000');

  // --- PIED DE PAGE ---
  const footerY = doc.internal.pageSize.getHeight() - 30;
  doc.setFillColor(footerGreenColor);
  doc.rect(margin, footerY, pageWidth - (margin * 2), 20, 'F');

  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const bankInfo = facture.informations_bancaires || companySettings.informations_bancaires || '';
  doc.text(bankInfo, pageWidth / 2, footerY + 7, { align: 'center', maxWidth: pageWidth - (margin * 2) - 10 });

  doc.setTextColor(0);
  doc.setFontSize(8);
  const legalInfo = `RCCM: ${companySettings.rccm || ''} | ID.NAT: ${companySettings.idnat || ''} | NIF: ${companySettings.nif || ''}`;
  doc.text(legalInfo, pageWidth / 2, footerY + 15, { align: 'center' });
  const contactInfo = `Email: ${companySettings.email_entreprise || ''} | Site Web: https://coccinelledrc.com`;
  doc.text(contactInfo, pageWidth / 2, footerY + 19, { align: 'center' });

  // --- SAUVEGARDER ---
  doc.save(`${facture.type}_${facture.facture_number}.pdf`);
};

const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

const getCompanySettings = async (): Promise<Partial<CompanySettings>> => {
  try {
    const { data } = await supabase
      .from('settings')
      .select('cle, valeur')
      .eq('categorie', 'company');

    const settings: any = {};
    data?.forEach(item => {
      settings[item.cle] = item.valeur;
    });
    return settings;
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    return {};
  }
};