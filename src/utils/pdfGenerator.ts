import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Facture, FactureItem } from '@/types';
import { supabase } from '@/integrations/supabase/client';

// Helper pour récupérer et convertir une image en base64 pour l'intégrer au PDF
async function fetchImageAsBase64(url: string): Promise<string | null> {
  if (!url) return null;
  try {
    // Pour les images externes (AliExpress, etc.), on ne peut pas les charger à cause du CSP
    // On retourne null pour ignorer silencieusement l'erreur
    if (url.includes('alicdn.com') || url.startsWith('http')) {
      console.log('Image externe ignorée pour le PDF:', url);
      return null;
    }
    
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
    // Ignorer silencieusement les erreurs d'images
    return null;
  }
}

export const generateFacturePDF = async (facture: Facture & { items: FactureItem[] }) => {
  const doc = new jsPDF();
  const companySettings = await getCompanySettings();

  // Couleurs du thème émeraude moderne
  const primaryColor = '#10b981'; // Emerald-500
  const primaryDark = '#059669'; // Emerald-600
  const secondaryColor = '#fbbf24'; // Amber-400 (jaune moderne)
  const accentColor = '#3b82f6'; // Blue-500
  const darkColor = '#1f2937'; // Gray-800
  const lightBg = '#f9fafb'; // Gray-50

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

  // Côté droit : Boîte moderne émeraude avec coins arrondis
  const boxWidth = 68;
  const boxX = pageWidth - margin - boxWidth;
  doc.setFillColor(primaryColor);
  doc.roundedRect(boxX, headerY, boxWidth, 30, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(facture.type.toUpperCase(), boxX + boxWidth / 2, headerY + 11, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`N° ${facture.facture_number}`, boxX + boxWidth / 2, headerY + 20, { align: 'center' });
  doc.setFontSize(8);
  doc.text(new Date(facture.date_emission).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }), boxX + boxWidth / 2, headerY + 26, { align: 'center' });

  // --- CARDS CLIENT & LIVRAISON ---
  y = headerY + 52;
  
  // Card Client
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.setFillColor(lightBg);
  doc.roundedRect(margin, y, 85, 20, 2, 2, 'FD');
  
  doc.setTextColor(accentColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT', margin + 3, y + 5);
  
  const client = facture.clients || facture.client;
  doc.setTextColor(darkColor);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(client?.nom || '', margin + 3, y + 10);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`📍 ${client?.ville || ''}  |  📞 ${client?.telephone || ''}`, margin + 3, y + 15);

  // Card Livraison
  doc.setFillColor(lightBg);
  doc.roundedRect(pageWidth / 2, y, 85, 20, 2, 2, 'FD');
  
  doc.setTextColor(accentColor);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('LIVRAISON', pageWidth / 2 + 3, y + 5);
  
  doc.setTextColor(darkColor);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Destination: ${client?.ville || ''}`, pageWidth / 2 + 3, y + 10);
  doc.text(`Mode: ${facture.mode_livraison === 'aerien' ? '✈️ Aérien' : '🚢 Maritime'}`, pageWidth / 2 + 3, y + 15);

  // --- TABLEAU ---
  const tableY = y + 25;
  const head = [['NUM', 'QTY', 'DESCRIPTION', 'PRIX UNIT', 'POIDS/CBM', 'MONTANT']];
  
  // Ne pas inclure les images dans le tableau pour éviter les problèmes CSP
  const body = facture.items.map(item => ([
    item.numero_ligne.toString(),
    item.quantite.toString(),
    item.description,
    formatCurrency(item.prix_unitaire, facture.devise),
    `${item.poids}`,
    formatCurrency(item.montant_total, facture.devise)
  ]));

  autoTable(doc, {
    startY: tableY,
    head: head,
    body: body,
    theme: 'striped',
    headStyles: {
      fillColor: [16, 185, 129], // Emerald-500
      textColor: [255, 255, 255],
      fontSize: 9,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 4
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [31, 41, 55],
      cellPadding: 3
    },
    alternateRowStyles: {
      fillColor: [249, 250, 251]
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15, fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 15 },
      2: { cellWidth: 70 },
      3: { halign: 'right', cellWidth: 25 },
      4: { halign: 'center', cellWidth: 22 },
      5: { halign: 'right', cellWidth: 30, fontStyle: 'bold', textColor: [16, 185, 129] }
    }
  });

  // --- TOTAUX ---
  let finalY = (doc as any).lastAutoTable?.finalY || tableY + 100;
  const totalsX = pageWidth - margin - 80;
  const totalRowHeight = 7;

  const drawTotalRow = (label: string, value: string, y: number, labelColor: string | number[] = '#000', valueColor: string | number[] = '#000') => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(labelColor as any);
    doc.text(label, totalsX, y);
    doc.setTextColor(valueColor as any);
    doc.text(value, pageWidth - margin, y, { align: 'right' });
  };

  finalY += 10;
  
  // Encadré pour les totaux
  const totalsBoxY = finalY - 3;
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.5);
  doc.roundedRect(totalsX - 5, totalsBoxY, 85, 32, 2, 2, 'S');
  
  drawTotalRow('SOUS-TOTAL', formatCurrency(facture.subtotal, facture.devise), finalY);
  finalY += totalRowHeight;
  
  const frais = facture.subtotal * 0.15;
  drawTotalRow('Frais (15%)', formatCurrency(frais, facture.devise), finalY, [100, 100, 100]);
  finalY += totalRowHeight;

  drawTotalRow('TRANSPORT & DOUANE', formatCurrency(facture.frais_transport_douane, facture.devise), finalY, [100, 100, 100]);
  finalY += totalRowHeight + 2;

  // Total Général avec fond jaune
  const totalGeneral = facture.subtotal + frais + facture.frais_transport_douane;
  doc.setFillColor(secondaryColor);
  doc.roundedRect(totalsX - 5, finalY - 5, 85, 10, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  drawTotalRow('TOTAL GÉNÉRALE', formatCurrency(totalGeneral, facture.devise), finalY, darkColor, darkColor);

  // --- PIED DE PAGE MODERNE ---
  const footerY = doc.internal.pageSize.getHeight() - 32;
  
  // Barre supérieure émeraude
  doc.setFillColor(primaryColor);
  doc.rect(0, footerY, pageWidth, 2, 'F');
  
  // Zone principale du footer
  doc.setFillColor(primaryDark);
  doc.rect(0, footerY + 2, pageWidth, 30, 'F');

  // Informations bancaires
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const bankInfo = (facture as any).informations_bancaires || '';
  if (bankInfo) {
    const bankLines = doc.splitTextToSize(bankInfo, pageWidth - (margin * 2));
    doc.text(bankLines, pageWidth / 2, footerY + 8, { align: 'center' });
  }

  // Ligne de séparation
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY + 18, pageWidth - margin, footerY + 18);

  // Informations légales
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  const legalInfo = `RCCM: ${companySettings.rccm || ''} | ID.NAT: ${companySettings.idnat || ''} | IMPÔT: ${companySettings.nif || ''}`;
  doc.text(legalInfo, pageWidth / 2, footerY + 23, { align: 'center' });
  
  const contactInfo = `Email: ${companySettings.email_entreprise || ''} | Site Web: www.coccinelledrc.com`;
  doc.text(contactInfo, pageWidth / 2, footerY + 28, { align: 'center' });

  // --- SAUVEGARDER ---
  doc.save(`${facture.type}_${facture.facture_number}.pdf`);
};

// Fonction pour récupérer les paramètres entreprise
const getCompanySettings = async (): Promise<any> => {
  try {
    const { data } = await supabase
      .from('settings')
      .select('cle, valeur')
      .eq('categorie', 'company');

    const settings: any = {};
    data?.forEach(item => {
      settings[item.cle] = item.valeur;
    });

    return {
      nom_entreprise: settings.nom_entreprise || 'COCCINELLE',
      logo_url: settings.logo_url || '',
      rccm: settings.rccm || '',
      idnat: settings.idnat || '',
      nif: settings.nif || '',
      email_entreprise: settings.email_entreprise || '',
      telephone_entreprise: settings.telephone_entreprise || '',
      adresse_entreprise: settings.adresse_entreprise || ''
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    return {
      nom_entreprise: 'COCCINELLE',
      logo_url: '',
      rccm: '',
      idnat: '',
      nif: '',
      email_entreprise: '',
      telephone_entreprise: '',
      adresse_entreprise: ''
    };
  }
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