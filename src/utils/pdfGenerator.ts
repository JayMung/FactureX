import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Facture, FactureItem } from '@/types';

// Configuration des polices et couleurs (thème emerald)
const FONT_SIZE_NORMAL = 10;
const FONT_SIZE_SMALL = 8;
const FONT_SIZE_TITLE = 20;
const FONT_SIZE_SUBTITLE = 12;
const LINE_HEIGHT = 5;

// Couleurs du thème
const COLORS = {
  primary: [16, 185, 129], // emerald-500
  primaryDark: [6, 95, 70], // emerald-700
  secondary: [107, 114, 128], // gray-500
  light: [249, 250, 251], // gray-50
  border: [229, 231, 235], // gray-200
  text: [31, 41, 55], // gray-800
  textLight: [107, 114, 128], // gray-500
  success: [34, 197, 94], // green-500
  warning: [251, 146, 60], // orange-400
};

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

    // Fonction pour définir les couleurs
    const setFillColor = (color: number[]) => {
      doc.setFillColor(color[0], color[1], color[2]);
    };

    const setTextColor = (color: number[]) => {
      doc.setTextColor(color[0], color[1], color[2]);
    };

    const setDrawColor = (color: number[]) => {
      doc.setDrawColor(color[0], color[1], color[2]);
    };

    // Fonction utilitaire pour ajouter du texte avec retour à la ligne automatique
    const addText = (text: string, x: number, y: number, fontSize: number = FONT_SIZE_NORMAL, maxWidth: number = CONTENT_WIDTH, color?: number[]) => {
      doc.setFontSize(fontSize);
      if (color) {
        setTextColor(color);
      }
      const lines = doc.splitTextToSize(text, maxWidth);
      doc.text(lines, x, y);
      return lines.length * LINE_HEIGHT;
    };

    // Fonction pour dessiner une ligne
    const drawLine = (x1: number, y1: number, x2: number, y2: number, color?: number[]) => {
      if (color) {
        setDrawColor(color);
      }
      doc.line(x1, y1, x2, y2);
    };

    // Fonction pour dessiner un rectangle
    const drawRect = (x: number, y: number, width: number, height: number, fillColor?: number[], borderColor?: number[]) => {
      if (fillColor) {
        setFillColor(fillColor);
        doc.rect(x, y, width, height, 'F');
      }
      if (borderColor) {
        setDrawColor(borderColor);
        doc.rect(x, y, width, height);
      }
    };

    // En-tête avec fond coloré
    drawRect(MARGIN_LEFT, MARGIN_TOP, CONTENT_WIDTH, 25, COLORS.primary);
    setTextColor([255, 255, 255]); // Blanc
    doc.setFontSize(FONT_SIZE_TITLE);
    doc.text(facture.type === 'devis' ? 'DEVIS' : 'FACTURE', PAGE_WIDTH / 2, yPosition + 15, { align: 'center' });
    yPosition += 30;

    // Numéro et date dans un cadre
    drawRect(MARGIN_LEFT, yPosition, CONTENT_WIDTH, 20, COLORS.light, COLORS.primary);
    yPosition += 7;
    doc.setFontSize(FONT_SIZE_SUBTITLE);
    setTextColor(COLORS.primaryDark);
    doc.text(`N°: ${facture.facture_number}`, MARGIN_LEFT + 10, yPosition);
    doc.text(`Date: ${format(new Date(facture.date_emission), 'dd MMMM yyyy', { locale: fr })}`, PAGE_WIDTH - MARGIN_RIGHT - 50, yPosition);
    yPosition += 18;

    // Badge de statut
    const statusColors: Record<string, number[]> = {
      'brouillon': COLORS.textLight,
      'en_attente': COLORS.warning,
      'validee': COLORS.success,
      'annulee': [239, 68, 68] // red-500
    };
    const statusText: Record<string, string> = {
      'brouillon': 'BROUILLON',
      'en_attente': 'EN ATTENTE',
      'validee': 'VALIDÉE',
      'annulee': 'ANNULÉE'
    };
    
    const statusColor = statusColors[facture.statut] || COLORS.textLight;
    drawRect(PAGE_WIDTH - MARGIN_RIGHT - 30, yPosition - 5, 30, 8, statusColor);
    setTextColor([255, 255, 255]);
    doc.setFontSize(FONT_SIZE_SMALL);
    doc.text(statusText[facture.statut] || '', PAGE_WIDTH - MARGIN_RIGHT - 15, yPosition, { align: 'center' });
    setTextColor(COLORS.text);
    yPosition += 15;

    // Informations client et facture côte à côte
    const leftColumn = MARGIN_LEFT;
    const rightColumn = PAGE_WIDTH / 2 + 10;
    const columnWidth = (PAGE_WIDTH / 2) - 25;

    // Cadre Client
    drawRect(leftColumn, yPosition, columnWidth, 40, COLORS.light, COLORS.primary);
    yPosition += 7;
    addText('CLIENT', leftColumn + 10, yPosition, FONT_SIZE_SUBTITLE, undefined, COLORS.primaryDark);
    yPosition += 8;

    if (facture.client || facture.clients) {
      const client = facture.client || facture.clients;
      addText(client?.nom || '', leftColumn + 10, yPosition);
      yPosition += 5;
      addText(`📞 ${client?.telephone || ''}`, leftColumn + 10, yPosition);
      yPosition += 5;
      addText(`📍 ${client?.ville || ''}`, leftColumn + 10, yPosition);
    }

    // Cadre Informations
    yPosition = MARGIN_TOP + 75;
    drawRect(rightColumn, yPosition, columnWidth, 40, COLORS.light, COLORS.primary);
    yPosition += 7;
    addText('INFORMATIONS', rightColumn + 10, yPosition, FONT_SIZE_SUBTITLE, undefined, COLORS.primaryDark);
    yPosition += 8;
    addText(`Type: ${facture.type === 'devis' ? 'Devis' : 'Facture'}`, rightColumn + 10, yPosition);
    yPosition += 5;
    addText(`Livraison: ${facture.mode_livraison === 'aerien' ? '✈️ Aérien' : '🚢 Maritime'}`, rightColumn + 10, yPosition);
    yPosition += 5;
    addText(`Devise: ${facture.devise}`, rightColumn + 10, yPosition);

    yPosition += 55;

    // Tableau des articles avec en-tête coloré
    if (facture.items && facture.items.length > 0) {
      const tableStart = yPosition;
      const colWidths = [8, 25, 50, 12, 15, 15, 25]; // Largeurs des colonnes en mm (sans la colonne lien)
      const headers = ['N°', 'Image', 'Description', 'Qté', 'Prix U', 'Poids', 'Total'];
      
      // En-tête du tableau avec fond
      drawRect(MARGIN_LEFT, yPosition, CONTENT_WIDTH, 10, COLORS.primary);
      yPosition += 7;
      
      let xPos = MARGIN_LEFT + 5;
      headers.forEach((header, index) => {
        setTextColor([255, 255, 255]);
        doc.setFontSize(FONT_SIZE_SMALL);
        doc.text(header, xPos, yPosition);
        xPos += colWidths[index];
      });
      
      yPosition += 8;
      drawLine(MARGIN_LEFT, yPosition, PAGE_WIDTH - MARGIN_RIGHT, yPosition, COLORS.primary);
      yPosition += 5;

      // Lignes du tableau avec alternance de couleurs
      for (const [index, item] of facture.items.entries()) {
        // Vérifier si on a besoin d'une nouvelle page
        if (yPosition > 230) {
          doc.addPage();
          yPosition = MARGIN_TOP;
        }

        // Ligne avec fond alterné
        if (index % 2 === 0) {
          drawRect(MARGIN_LEFT, yPosition - 3, CONTENT_WIDTH, 20, COLORS.light);
        }

        xPos = MARGIN_LEFT + 5;
        
        // N°
        setTextColor(COLORS.text);
        doc.setFontSize(FONT_SIZE_SMALL);
        doc.text(item.numero_ligne.toString(), xPos, yPosition);
        xPos += colWidths[0];

        // Image (placeholder ou image réelle)
        if (item.image_url) {
          try {
            // Essayer de charger l'image de manière synchrone
            doc.addImage(item.image_url, 'JPEG', xPos, yPosition - 5, 8, 8);
          } catch {
            // Si l'image ne peut pas être chargée, dessiner un placeholder
            drawRect(xPos, yPosition - 5, 8, 8, COLORS.light, COLORS.border);
            setTextColor(COLORS.textLight);
            doc.setFontSize(6);
            doc.text('📷', xPos + 4, yPosition, { align: 'center' });
          }
        } else {
          // Placeholder pour image manquante
          drawRect(xPos, yPosition - 5, 8, 8, COLORS.light, COLORS.border);
          setTextColor(COLORS.textLight);
          doc.setFontSize(6);
          doc.text('📷', xPos + 4, yPosition, { align: 'center' });
        }
        xPos += colWidths[1];

        // Description (avec retour à la ligne)
        setTextColor(COLORS.text);
        const descriptionLines = doc.splitTextToSize(item.description || '', colWidths[2]);
        doc.text(descriptionLines, xPos, yPosition);
        xPos += colWidths[2];

        // Qté
        doc.text(item.quantite.toString(), xPos, yPosition);
        xPos += colWidths[3];

        // Prix unitaire
        const prixText = facture.devise === 'USD' 
          ? `$${item.prix_unitaire.toFixed(2)}` 
          : `${item.prix_unitaire.toFixed(2)} FC`;
        doc.text(prixText, xPos, yPosition);
        xPos += colWidths[4];

        // Poids
        const poidsText = `${item.poids.toFixed(2)} ${facture.mode_livraison === 'aerien' ? 'kg' : 'cbm'}`;
        doc.text(poidsText, xPos, yPosition);
        xPos += colWidths[5];

        // Total en couleur
        const totalText = facture.devise === 'USD' 
          ? `$${item.montant_total.toFixed(2)}` 
          : `${item.montant_total.toFixed(2)} FC`;
        setTextColor(COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.text(totalText, xPos, yPosition);
        doc.setFont('helvetica', 'normal');
        setTextColor(COLORS.text);

        yPosition += Math.max(descriptionLines.length * LINE_HEIGHT, 8);
      }

      yPosition += 5;
      drawLine(MARGIN_LEFT, yPosition, PAGE_WIDTH - MARGIN_RIGHT, yPosition, COLORS.primary);
      yPosition += 10;

      // Totaux dans un cadre stylisé
      const totalsWidth = 80;
      const totalsX = PAGE_WIDTH - MARGIN_RIGHT - totalsWidth;
      
      // Fonction pour dessiner les lignes de total avec style
      const drawTotalRow = (label: string, value: string, isBold: boolean = false, bgColor?: number[]) => {
        if (bgColor) {
          drawRect(totalsX, yPosition - 3, totalsWidth, 10, bgColor);
        }
        
        if (isBold) {
          doc.setFont('helvetica', 'bold');
          setTextColor(COLORS.primary);
        } else {
          doc.setFont('helvetica', 'normal');
          setTextColor(COLORS.text);
        }
        
        const safeLabel = String(label || '');
        const safeValue = String(value || '');
        
        doc.text(safeLabel, totalsX + 5, yPosition);
        doc.text(safeValue, PAGE_WIDTH - MARGIN_RIGHT - 5, yPosition, { align: 'right' });
        yPosition += 8;
      };

      drawTotalRow('SOUS-TOTAL:', `${facture.devise === 'USD' ? '$' : ''}${facture.subtotal.toFixed(2)} ${facture.devise === 'CDF' ? 'FC' : ''}`);
      drawTotalRow('TRANSPORT:', `${facture.devise === 'USD' ? '$' : ''}${(facture.frais_transport_douane || 0).toFixed(2)} ${facture.devise === 'CDF' ? 'FC' : ''}`);
      
      yPosition += 3;
      drawLine(totalsX, yPosition, PAGE_WIDTH - MARGIN_RIGHT, yPosition, COLORS.primary);
      yPosition += 5;
      
      drawTotalRow('TOTAL GÉNÉRAL:', `${facture.devise === 'USD' ? '$' : ''}${facture.total_general.toFixed(2)} ${facture.devise === 'CDF' ? 'FC' : ''}`, true, COLORS.primary);
      setTextColor([255, 255, 255]); // Texte blanc sur fond coloré
      doc.text(`${facture.devise === 'USD' ? '$' : ''}${facture.total_general.toFixed(2)} ${facture.devise === 'CDF' ? 'FC' : ''}`, PAGE_WIDTH - MARGIN_RIGHT - 5, yPosition - 8, { align: 'right' });
    }

    // Conditions de vente dans un cadre
    if (facture.conditions_vente) {
      yPosition += 15;
      drawRect(MARGIN_LEFT, yPosition - 5, CONTENT_WIDTH, 5, COLORS.light, COLORS.primary);
      yPosition += 2;
      addText('📋 CONDITIONS DE VENTE', MARGIN_LEFT + 5, yPosition, FONT_SIZE_SUBTITLE, undefined, COLORS.primaryDark);
      yPosition += 8;
      addText(facture.conditions_vente, MARGIN_LEFT + 5, yPosition);
    }

    // Notes dans un cadre
    if (facture.notes) {
      yPosition += 10;
      drawRect(MARGIN_LEFT, yPosition - 5, CONTENT_WIDTH, 5, COLORS.light, COLORS.primary);
      yPosition += 2;
      addText('📝 NOTES', MARGIN_LEFT + 5, yPosition, FONT_SIZE_SUBTITLE, undefined, COLORS.primaryDark);
      yPosition += 8;
      addText(facture.notes, MARGIN_LEFT + 5, yPosition);
    }

    // Informations bancaires en pied de page avec cadre
    if (facture.informations_bancaires) {
      const footerY = PAGE_HEIGHT - MARGIN_BOTTOM - 25;
      drawLine(MARGIN_LEFT, footerY, PAGE_WIDTH - MARGIN_RIGHT, footerY, COLORS.primary);
      drawRect(MARGIN_LEFT, footerY + 2, CONTENT_WIDTH, 20, COLORS.light, COLORS.border);
      
      addText('🏦 INFORMATIONS BANCAIRES', MARGIN_LEFT + 5, footerY + 8, FONT_SIZE_SMALL, undefined, COLORS.primaryDark);
      setTextColor(COLORS.text);
      doc.setFontSize(FONT_SIZE_SMALL - 1);
      const bankLines = doc.splitTextToSize(facture.informations_bancaires, CONTENT_WIDTH - 10);
      doc.text(bankLines, MARGIN_LEFT + 5, footerY + 15);
    }

    // Signature si validée avec cadre stylisé
    if (facture.statut === 'validee' && facture.date_validation) {
      const signatureY = PAGE_HEIGHT - MARGIN_BOTTOM - 50;
      drawRect(PAGE_WIDTH - MARGIN_RIGHT - 60, signatureY - 5, 60, 25, COLORS.light, COLORS.success);
      
      setTextColor(COLORS.primaryDark);
      doc.setFontSize(FONT_SIZE_SMALL);
      doc.text('✅ VALIDÉ', PAGE_WIDTH - MARGIN_RIGHT - 30, signatureY, { align: 'center' });
      doc.text(`Le: ${format(new Date(facture.date_validation), 'dd/MM/yyyy', { locale: fr })}`, PAGE_WIDTH - MARGIN_RIGHT - 30, signatureY + 8, { align: 'center' });
    }

    // Téléchargement du PDF
    const fileName = `${facture.type}_${facture.facture_number}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);

  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw error;
  }
};