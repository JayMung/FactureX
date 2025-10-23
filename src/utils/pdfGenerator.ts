import jsPDF from 'jspdf';
import type { Facture, CompanySettings } from '@/types';

interface PDFGeneratorOptions {
  facture: Facture;
  companySettings: CompanySettings;
  signatureUrl?: string;
  logoUrl?: string;
}

export const generateFacturePDF = async ({
  facture,
  companySettings,
  signatureUrl,
  logoUrl
}: PDFGeneratorOptions) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let yPosition = 20;

  // Couleurs
  const primaryColor = { r: 16, g: 185, b: 129 }; // emerald-600
  const textColor = { r: 31, g: 41, b: 55 }; // gray-800
  const lightGray = { r: 243, g: 244, b: 246 }; // gray-100

  // Helper pour ajouter du texte centré
  const addCenteredText = (text: string, y: number, fontSize: number = 12, isBold: boolean = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, y);
  };

  // Helper pour formater la devise
  const formatCurrency = (amount: number, devise: string) => {
    const formatted = amount.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return devise === 'USD' ? `$${formatted}` : `${formatted} FC`;
  };

  try {
    // ============ EN-TÊTE ============
    // Logo de l'entreprise (si disponible)
    if (logoUrl) {
      try {
        // Note: Pour les images externes, il faut les convertir en base64
        // Pour l'instant, on skip si l'URL n'est pas disponible
        // doc.addImage(logoUrl, 'PNG', 15, 10, 30, 30);
      } catch (error) {
        console.warn('Logo non chargé:', error);
      }
    }

    // Informations de l'entreprise (à droite ou centré)
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    addCenteredText(companySettings.nom_entreprise || 'ENTREPRISE', yPosition);
    yPosition += 8;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textColor.r, textColor.g, textColor.b);
    
    if (companySettings.adresse_entreprise) {
      addCenteredText(companySettings.adresse_entreprise, yPosition);
      yPosition += 5;
    }
    
    if (companySettings.telephone_entreprise) {
      addCenteredText(`Tél: ${companySettings.telephone_entreprise}`, yPosition);
      yPosition += 5;
    }
    
    if (companySettings.email_entreprise) {
      addCenteredText(`Email: ${companySettings.email_entreprise}`, yPosition);
      yPosition += 5;
    }

    // RCCM, IDNAT, NIF sur une ligne
    const registrationInfo = [];
    if (companySettings.rccm) registrationInfo.push(`RCCM: ${companySettings.rccm}`);
    if (companySettings.idnat) registrationInfo.push(`IDNAT: ${companySettings.idnat}`);
    if (companySettings.nif) registrationInfo.push(`NIF: ${companySettings.nif}`);
    
    if (registrationInfo.length > 0) {
      addCenteredText(registrationInfo.join(' | '), yPosition);
      yPosition += 10;
    }

    // Ligne de séparation
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.5);
    doc.line(15, yPosition, pageWidth - 15, yPosition);
    yPosition += 10;

    // ============ TITRE DU DOCUMENT ============
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    addCenteredText(facture.type === 'devis' ? 'DEVIS' : 'FACTURE', yPosition);
    yPosition += 10;

    // ============ INFORMATIONS FACTURE & CLIENT ============
    const leftCol = 15;
    const rightCol = pageWidth / 2 + 5;

    // Colonne gauche - Informations client
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textColor.r, textColor.g, textColor.b);
    doc.text('CLIENT:', leftCol, yPosition);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    yPosition += 5;
    const clientInfo = facture.clients || facture.client;
    doc.text(clientInfo?.nom || 'N/A', leftCol, yPosition);
    yPosition += 4;
    if (clientInfo?.adresse) {
      doc.text(clientInfo.adresse, leftCol, yPosition);
      yPosition += 4;
    }
    if (clientInfo?.ville) {
      doc.text(clientInfo.ville, leftCol, yPosition);
      yPosition += 4;
    }
    if (clientInfo?.telephone) {
      doc.text(`Tél: ${clientInfo.telephone}`, leftCol, yPosition);
      yPosition += 4;
    }
    if (clientInfo?.email) {
      doc.text(`Email: ${clientInfo.email}`, leftCol, yPosition);
    }

    // Colonne droite - Informations facture
    let rightYPosition = yPosition - 21; // Remonter au même niveau que "CLIENT:"
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`N° ${facture.type === 'devis' ? 'Devis' : 'Facture'}:`, rightCol, rightYPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(facture.facture_number, rightCol + 40, rightYPosition);
    
    rightYPosition += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Date d\'émission:', rightCol, rightYPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(new Date(facture.date_emission).toLocaleDateString('fr-FR'), rightCol + 40, rightYPosition);
    
    rightYPosition += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Statut:', rightCol, rightYPosition);
    doc.setFont('helvetica', 'normal');
    const statutColors: any = {
      brouillon: { r: 156, g: 163, b: 175 },
      en_attente: { r: 251, g: 191, b: 36 },
      validee: { r: 16, g: 185, b: 129 },
      annulee: { r: 239, g: 68, b: 68 }
    };
    const statutColor = statutColors[facture.statut] || textColor;
    doc.setTextColor(statutColor.r, statutColor.g, statutColor.b);
    doc.text(facture.statut.toUpperCase(), rightCol + 40, rightYPosition);
    doc.setTextColor(textColor.r, textColor.g, textColor.b);

    rightYPosition += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Mode de livraison:', rightCol, rightYPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(facture.mode_livraison === 'aerien' ? '✈️ Aérien' : '🚢 Maritime', rightCol + 40, rightYPosition);

    yPosition = Math.max(yPosition, rightYPosition) + 10;

    // ============ TABLEAU DES ARTICLES ============
    // En-tête du tableau
    doc.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.rect(15, yPosition, pageWidth - 30, 8, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('#', 18, yPosition + 5.5);
    doc.text('Description', 30, yPosition + 5.5);
    doc.text('Qté', 105, yPosition + 5.5);
    doc.text('P.U', 120, yPosition + 5.5);
    doc.text(`Poids (${facture.mode_livraison === 'aerien' ? 'kg' : 'cbm'})`, 140, yPosition + 5.5);
    doc.text('Total', 175, yPosition + 5.5);
    
    yPosition += 10;
    doc.setTextColor(textColor.r, textColor.g, textColor.b);
    doc.setFont('helvetica', 'normal');

    // Lignes du tableau
    facture.items?.forEach((item, index) => {
      // Vérifier si on a assez d'espace, sinon nouvelle page
      if (yPosition > pageHeight - 60) {
        doc.addPage();
        yPosition = 20;
      }

      // Ligne alternée
      if (index % 2 === 0) {
        doc.setFillColor(lightGray.r, lightGray.g, lightGray.b);
        doc.rect(15, yPosition - 4, pageWidth - 30, 7, 'F');
      }

      doc.text(item.numero_ligne.toString(), 18, yPosition);
      
      // Description (tronquée si trop longue)
      const maxDescWidth = 70;
      let description = item.description;
      if (doc.getTextWidth(description) > maxDescWidth) {
        while (doc.getTextWidth(description + '...') > maxDescWidth && description.length > 0) {
          description = description.slice(0, -1);
        }
        description += '...';
      }
      doc.text(description, 30, yPosition);
      
      doc.text(item.quantite.toString(), 105, yPosition);
      doc.text(formatCurrency(item.prix_unitaire, facture.devise), 120, yPosition);
      doc.text(item.poids.toFixed(2), 140, yPosition);
      doc.text(formatCurrency(item.montant_total, facture.devise), 175, yPosition);
      
      yPosition += 7;
    });

    yPosition += 5;

    // ============ TOTAUX ============
    const totalsX = pageWidth - 80;
    
    // Sous-total
    doc.setFont('helvetica', 'normal');
    doc.text('Sous-total:', totalsX, yPosition);
    doc.text(formatCurrency(facture.subtotal, facture.devise), totalsX + 35, yPosition, { align: 'right' });
    yPosition += 6;

    // Frais transport et douane
    doc.text(`Frais transport & douane (${facture.mode_livraison === 'aerien' ? 'aérien' : 'maritime'}):`, totalsX, yPosition);
    doc.text(formatCurrency(facture.frais_transport_douane, facture.devise), totalsX + 35, yPosition, { align: 'right' });
    yPosition += 6;

    // Poids total
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`(${facture.total_poids.toFixed(2)} ${facture.mode_livraison === 'aerien' ? 'kg' : 'cbm'})`, totalsX, yPosition);
    yPosition += 6;
    doc.setFontSize(9);
    doc.setTextColor(textColor.r, textColor.g, textColor.b);

    // Ligne de séparation
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(0.5);
    doc.line(totalsX - 5, yPosition - 1, pageWidth - 15, yPosition - 1);
    yPosition += 5;

    // Total général
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.text('TOTAL GÉNÉRAL:', totalsX, yPosition);
    doc.text(formatCurrency(facture.total_general, facture.devise), totalsX + 35, yPosition, { align: 'right' });
    yPosition += 10;

    // ============ CONDITIONS DE VENTE ============
    if (facture.conditions_vente) {
      yPosition += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(textColor.r, textColor.g, textColor.b);
      doc.text('Conditions de vente:', 15, yPosition);
      yPosition += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const conditions = doc.splitTextToSize(facture.conditions_vente, pageWidth - 30);
      doc.text(conditions, 15, yPosition);
      yPosition += conditions.length * 4;
    }

    // ============ NOTES ============
    if (facture.notes) {
      yPosition += 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('Notes:', 15, yPosition);
      yPosition += 5;
      
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const notes = doc.splitTextToSize(facture.notes, pageWidth - 30);
      doc.text(notes, 15, yPosition);
      yPosition += notes.length * 4;
    }

    // ============ SIGNATURE ============
    if (signatureUrl && facture.statut === 'validee') {
      try {
        yPosition = pageHeight - 40;
        doc.setFontSize(8);
        doc.text('Signature:', pageWidth - 70, yPosition);
        // Note: Pour ajouter l'image de signature, il faut la convertir en base64
        // doc.addImage(signatureUrl, 'PNG', pageWidth - 70, yPosition + 2, 40, 20);
        doc.text('________________________', pageWidth - 70, yPosition + 25);
      } catch (error) {
        console.warn('Signature non chargée:', error);
      }
    }

    // ============ PIED DE PAGE ============
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );

    // Sauvegarder le PDF
    const clientInfo = facture.clients || facture.client;
    const fileName = `${facture.type === 'devis' ? 'Devis' : 'Facture'}_${facture.facture_number}_${clientInfo?.nom || 'Client'}.pdf`;
    doc.save(fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw error;
  }
};
