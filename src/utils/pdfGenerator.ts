import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Facture, FactureItem } from '@/types';

// Configuration des polices
const FONT_SIZE_NORMAL = 10;
const FONT_SIZE_SMALL = 8;
const FONT_SIZE_TITLE = 16;
const FONT_SIZE_SUBTITLE = 12;
const LINE_HEIGHT = 5;

// Marges
const MARGIN_LEFT = 15;
const MARGIN_RIGHT = 15;
const MARGIN_TOP = 15;
const MARGIN_BOTTOM = 15;
const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

export const generateFacturePDF = async (facture: Facture) => {
  try {
    const doc = new jsPDF();
    let yPosition = MARGIN_TOP;

    // Fonction utilitaire pour ajouter du texte avec retour à la ligne automatique
    const addText = (text: string, x: number, y: number, fontSize: number = FONT_SIZE_NORMAL, maxWidth: number = CONTENT_WIDTH) => {
      doc.setFontSize(fontSize);
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return lines.length * LINE_HEIGHT;
    };

    // Fonction pour dessiner une ligne
    const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
      doc.line(x1, y1, x2, y2);
    };

    // En-tête
    doc.setFontSize(FONT_SIZE_TITLE);
    doc.text(facture.type === 'devis' ? 'DEVIS' : 'FACTURE', PAGE_WIDTH / 2, yPosition, { align: 'center' });
    yPosition += 10;

    doc.setFontSize(FONT_SIZE_SUBTITLE);
    doc.text(`N°: ${facture.facture_number}`, PAGE_WIDTH / 2, yPosition, { align: 'center' });
    yPosition += 8;

    doc.setFontSize(FONT_SIZE_SMALL);
    doc.text(`Date: ${format(new Date(facture.date_emission), 'dd MMMM yyyy', { locale: fr })}`, PAGE_WIDTH / 2, yPosition, { align: 'center' });
    yPosition += 10;

    // Informations entreprise et client
    const leftColumn = MARGIN_LEFT;
    const rightColumn = PAGE_WIDTH / 2 + 10;

    // Informations client
    if (facture.client || facture.clients) {
      const client = facture.client || facture.clients;
      yPosition += addText('CLIENT:', leftColumn, yPosition, FONT_SIZE_SUBTITLE);
      yPosition += addText(client?.nom || '', leftColumn, yPosition);
      yPosition += addText(client?.telephone || '', leftColumn, yPosition);
      yPosition += addText(client?.ville || '', leftColumn, yPosition);
    }

    // Informations facture
    yPosition = MARGIN_TOP + 40;
    yPosition += addText('INFORMATIONS:', rightColumn, yPosition, FONT_SIZE_SUBTITLE);
    yPosition += addText(`Type: ${facture.type === 'devis' ? 'Devis' : 'Facture'}`, rightColumn, yPosition);
    yPosition += addText(`Mode livraison: ${facture.mode_livraison === 'aerien' ? 'Aérien' : 'Maritime'}`, rightColumn, yPosition);
    yPosition += addText(`Devise: ${facture.devise}`, rightColumn, yPosition);
    yPosition += addText(`Statut: ${facture.statut}`, rightColumn, yPosition);

    yPosition += 10;

    // Tableau des articles
    if (facture.items && facture.items.length > 0) {
      const tableStart = yPosition;
      const colWidths = [10, 60, 15, 20, 20, 25, 30]; // Largeurs des colonnes en mm
      const headers = ['N°', 'Description', 'Qté', 'Prix U', 'Poids', 'Total', 'Lien'];
      
      // En-tête du tableau
      let xPos = MARGIN_LEFT;
      headers.forEach((header, index) => {
        doc.setFontSize(FONT_SIZE_SMALL);
        doc.text(header, xPos, yPosition);
        xPos += colWidths[index];
      });
      
      yPosition += 7;
      drawLine(MARGIN_LEFT, yPosition, PAGE_WIDTH - MARGIN_RIGHT, yPosition);
      yPosition += 5;

      // Lignes du tableau
      facture.items.forEach((item: FactureItem) => {
        // Vérifier si on a besoin d'une nouvelle page
        if (yPosition > 250) {
          doc.addPage();
          yPosition = MARGIN_TOP;
        }

        xPos = MARGIN_LEFT;
        
        // N°
        doc.setFontSize(FONT_SIZE_SMALL);
        doc.text(item.numero_ligne.toString(), xPos, yPosition);
        xPos += colWidths[0];

        // Description (avec retour à la ligne)
        const descriptionLines = doc.splitTextToSize(item.description || '', colWidths[1]);
        doc.text(descriptionLines, xPos, yPosition);
        xPos += colWidths[1];

        // Qté
        doc.text(item.quantite.toString(), xPos, yPosition);
        xPos += colWidths[2];

        // Prix unitaire
        const prixText = facture.devise === 'USD' 
          ? `$${item.prix_unitaire.toFixed(2)}` 
          : `${item.prix_unitaire.toFixed(2)} FC`;
        doc.text(prixText, xPos, yPosition);
        xPos += colWidths[3];

        // Poids
        const poidsText = `${item.poids.toFixed(2)} ${facture.mode_livraison === 'aerien' ? 'kg' : 'cbm'}`;
        doc.text(poidsText, xPos, yPosition);
        xPos += colWidths[4];

        // Total
        const totalText = facture.devise === 'USD' 
          ? `$${item.montant_total.toFixed(2)}` 
          : `${item.montant_total.toFixed(2)} FC`;
        doc.text(totalText, xPos, yPosition);
        xPos += colWidths[5];

        // Lien produit (raccourci si trop long)
        let linkText = '';
        if (item.product_url) {
          try {
            const url = new URL(item.product_url);
            linkText = url.hostname;
          } catch {
            linkText = item.product_url.substring(0, 15) + '...';
          }
        }
        if (linkText) {
          doc.setFontSize(FONT_SIZE_SMALL - 1);
          doc.text(linkText, xPos, yPosition);
        }

        yPosition += Math.max(descriptionLines.length * LINE_HEIGHT, 7);
      });

      yPosition += 5;
      drawLine(MARGIN_LEFT, yPosition, PAGE_WIDTH - MARGIN_RIGHT, yPosition);
      yPosition += 10;

      // Totaux
      const totalsX = PAGE_WIDTH - 100;
      
      // Fonction corrigée pour dessiner les lignes de total
      const drawTotalRow = (label: string, value: string, isBold: boolean = false) => {
        if (isBold) {
          doc.setFont('helvetica', 'bold'); // Correction: utiliser les chaînes pour le style de police
        } else {
          doc.setFont('helvetica', 'normal');
        }
        
        // S'assurer que les valeurs sont des chaînes valides
        const safeLabel = String(label || '');
        const safeValue = String(value || '');
        
        doc.text(safeLabel, totalsX, yPosition);
        doc.text(safeValue, PAGE_WIDTH - MARGIN_RIGHT - 5, yPosition);
        yPosition += 7;
      };

      drawTotalRow('SOUS-TOTAL:', `${facture.devise === 'USD' ? '$' : ''}${facture.subtotal.toFixed(2)} ${facture.devise === 'CDF' ? 'FC' : ''}`);
      drawTotalRow('TRANSPORT & DOUANE:', `${facture.devise === 'USD' ? '$' : ''}${(facture.frais_transport_douane || 0).toFixed(2)} ${facture.devise === 'CDF' ? 'FC' : ''}`);
      
      yPosition += 3;
      drawLine(totalsX, yPosition, PAGE_WIDTH - MARGIN_RIGHT, yPosition);
      yPosition += 5;
      
      drawTotalRow('TOTAL GÉNÉRAL:', `${facture.devise === 'USD' ? '$' : ''}${facture.total_general.toFixed(2)} ${facture.devise === 'CDF' ? 'FC' : ''}`, true);
    }

    // Conditions de vente
    if (facture.conditions_vente) {
      yPosition += 15;
      yPosition += addText('CONDITIONS DE VENTE:', MARGIN_LEFT, yPosition, FONT_SIZE_SUBTITLE);
      yPosition += addText(facture.conditions_vente, MARGIN_LEFT, yPosition);
    }

    // Notes
    if (facture.notes) {
      yPosition += 10;
      yPosition += addText('NOTES:', MARGIN_LEFT, yPosition, FONT_SIZE_SUBTITLE);
      yPosition += addText(facture.notes, MARGIN_LEFT, yPosition);
    }

    // Informations bancaires en pied de page
    if (facture.informations_bancaires) {
      const footerY = PAGE_HEIGHT - MARGIN_BOTTOM - 20;
      drawLine(MARGIN_LEFT, footerY, PAGE_WIDTH - MARGIN_RIGHT, footerY);
      
      doc.setFontSize(FONT_SIZE_SMALL);
      const bankLines = doc.splitTextToSize(facture.informations_bancaires, CONTENT_WIDTH);
      doc.text(bankLines, MARGIN_LEFT, footerY + 5);
    }

    // Signature si validée
    if (facture.statut === 'validee' && facture.date_validation) {
      const signatureY = PAGE_HEIGHT - MARGIN_BOTTOM - 40;
      doc.setFontSize(FONT_SIZE_SMALL);
      doc.text('Signature et cachet:', PAGE_WIDTH - 60, signatureY);
      doc.text(`Validé le: ${format(new Date(facture.date_validation), 'dd MMMM yyyy', { locale: fr })}`, PAGE_WIDTH - 60, signatureY + 5);
    }

    // Téléchargement du PDF
    const fileName = `${facture.type}_${facture.facture_number}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);

  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw error;
  }
};