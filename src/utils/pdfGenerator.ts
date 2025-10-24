import jsPDF from 'jspdf';
import type { Facture, FactureItem } from '@/types';

// Définir l'interface CompanySettings localement pour éviter les erreurs
interface CompanySettings {
  nom_entreprise: string;
  logo_url: string;
  rccm: string;
  idnat: string;
  nif: string;
  email_entreprise: string;
  telephone_entreprise: string;
  adresse_entreprise: string;
  signature_url?: string;
}

export const generateFacturePDF = async (facture: Facture & { items: FactureItem[] }) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const leftCol = 20;
  const rightCol = pageWidth - 20;
  let yPosition = 20;

  // Récupérer les paramètres entreprise
  const companySettings = await getCompanySettings();  
  // En-tête avec logo et infos entreprise
  if (companySettings.logo_url) {
    try {
      doc.addImage(companySettings.logo_url, 'PNG', leftCol, yPosition, 40, 20);
    } catch (error) {
      console.warn('Impossible de charger le logo:', error);
    }
    yPosition += 30;
  }

  // Informations entreprise à droite
  doc.setFontSize(10);
  doc.text(companySettings.nom_entreprise || 'CoxiPay', rightCol - 80, yPosition - 20);
  doc.text(companySettings.email_entreprise || '', rightCol - 80, yPosition - 15);
  doc.text(companySettings.telephone_entreprise || '', rightCol - 80, yPosition - 10);
  doc.text(companySettings.adresse_entreprise || '', rightCol - 80, yPosition - 5);

  // Titre et numéro
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(facture.type === 'devis' ? 'DEVIS' : 'FACTURE', leftCol, yPosition);
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`N°: ${facture.facture_number}`, leftCol, yPosition + 10);
  doc.text(`Date: ${new Date(facture.date_emission).toLocaleDateString('fr-FR')}`, leftCol, yPosition + 15);
  
  if (facture.date_validation) {
    doc.text(`Validé le: ${new Date(facture.date_validation).toLocaleDateString('fr-FR')}`, leftCol, yPosition + 20);
  }

  // Informations client
  const clientData = facture.clients || facture.client;
  yPosition += 35;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT:', leftCol, yPosition);
  doc.setFont('helvetica', 'normal');
  doc.text(clientData?.nom || 'N/A', leftCol, yPosition + 7);
  doc.text(clientData?.telephone || '', leftCol, yPosition + 12);
  doc.text(clientData?.ville || '', leftCol, yPosition + 17);

  // Mode de livraison et devise
  doc.text(`Mode livraison: ${facture.mode_livraison === 'aerien' ? 'Aérien' : 'Maritime'}`, rightCol - 80, yPosition + 7);
  doc.text(`Devise: ${facture.devise}`, rightCol - 80, yPosition + 12);

  // Tableau des articles
  yPosition += 30;
  const headers = [
    'N°',
    'Description',
    'Quantité',
    'Prix Unitaire',
    'Poids',
    'Montant Total'
  ];

  const data = facture.items?.map((item, index) => [
    (index + 1).toString(),
    item.description,
    item.quantite.toString(),
    formatCurrency(item.prix_unitaire, facture.devise),
    `${item.poids} ${facture.mode_livraison === 'aerien' ? 'kg' : 'cbm'}`,
    formatCurrency(item.montant_total, facture.devise)
  ]) || [];

  // Créer le tableau manuellement
  let currentY = yPosition;
  const rowHeight = 10;
  const colWidths = [15, 80, 30, 40, 30, 40];
  
  // En-têtes
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  let currentX = leftCol;
  headers.forEach((header, index) => {
    doc.text(header, currentX, currentY);
    currentX += colWidths[index];
  });
  
  // Lignes
  currentY += rowHeight;
  doc.setFont('helvetica', 'normal');
  data.forEach((row) => {
    currentX = leftCol;
    row.forEach((cell, index) => {
      doc.text(cell, currentX, currentY);
      currentX += colWidths[index];
    });
    currentY += rowHeight;
  });

  // Position finale après le tableau
  yPosition = currentY + 20;

  // Totaux
  doc.setFontSize(12);
  doc.text(`Sous-total: ${formatCurrency(facture.subtotal, facture.devise)}`, rightCol - 80, yPosition);
  doc.text(`Frais transport: ${formatCurrency(facture.shipping_fee, facture.devise)}`, rightCol - 80, yPosition + 7);
  doc.text(`Frais douane: ${formatCurrency(facture.frais_transport_douane, facture.devise)}`, rightCol - 80, yPosition + 14);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(`TOTAL: ${formatCurrency(facture.total_general, facture.devise)}`, rightCol - 80, yPosition + 22);

  // Conditions de vente
  if (facture.conditions_vente) {
    yPosition += 35;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Conditions de vente:', leftCol, yPosition);
    doc.setFont('helvetica', 'normal');
    const splitConditions = doc.splitTextToSize(facture.conditions_vente, pageWidth - 40);
    doc.text(splitConditions, leftCol, yPosition + 7);
  }

  // Signature
  if (companySettings.signature_url) {
    try {
      const signatureY = doc.internal.pageSize.getHeight() - 40;
      doc.addImage(companySettings.signature_url, 'PNG', leftCol, signatureY, 60, 30);
    } catch (error) {
      console.warn('Impossible de charger la signature:', error);
    }
  }

  // Informations légales
  yPosition = doc.internal.pageSize.getHeight() - 25;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`RCCM: ${companySettings.rccm || ''}`, leftCol, yPosition);
  doc.text(`ID.NAT: ${companySettings.idnat || ''}`, leftCol + 60, yPosition);
  doc.text(`NIF: ${companySettings.nif || ''}`, leftCol + 120, yPosition);

  // Sauvegarder le PDF
  const clientDataForName = facture.clients || facture.client;
  const fileName = `${facture.type === 'devis' ? 'Devis' : 'Facture'}_${facture.facture_number}_${clientDataForName?.nom || 'Client'}.pdf`;
  doc.save(fileName);
};

// Fonction utilitaire pour formater la devise
const formatCurrency = (amount: number, currency: string): string => {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'CDF') {
    return `${amount.toLocaleString('fr-FR')} FC`;
  }
  return amount.toString();
};

// Fonction pour récupérer les paramètres entreprise
const getCompanySettings = async (): Promise<CompanySettings> => {
  try {
    const { supabase } = await import('@/integrations/supabase/client');
    const { data } = await supabase
      .from('settings')
      .select('cle, valeur')
      .eq('categorie', 'company');

    const settings: any = {};
    data?.forEach(item => {
      settings[item.cle] = item.valeur;
    });

    return {
      nom_entreprise: settings.nom_entreprise || 'CoxiPay',
      logo_url: settings.logo_url || '',
      rccm: settings.rccm || '',
      idnat: settings.idnat || '',
      nif: settings.nif || '',
      email_entreprise: settings.email_entreprise || '',
      telephone_entreprise: settings.telephone_entreprise || '',
      adresse_entreprise: settings.adresse_entreprise || '',
      signature_url: settings.signature_url
    };
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    return {
      nom_entreprise: 'CoxiPay',
      logo_url: '',
      rccm: '',
      idnat: '',
      nif: '',
      email_entreprise: '',
      telephone_entreprise: '',
      adresse_entreprise: '',
      signature_url: ''
    };
  }
};