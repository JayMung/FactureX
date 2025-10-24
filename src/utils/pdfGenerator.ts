import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Facture, FactureItem } from '@/types';

// Configuration des polices et couleurs
const FONT_SIZE_NORMAL = 10;
const FONT_SIZE_SMALL = 8;
const FONT_SIZE_TITLE = 16;
const FONT_SIZE_SUBTITLE = 12;
const LINE_HEIGHT = 5;

// Couleurs professionnelles
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
  header: [59, 130, 246], // blue-500
  total: [30, 58, 138], // blue-800
};

// Marges
const MARGIN_LEFT = 15;
const MARGIN_RIGHT = 15;
const MARGIN_TOP = 15;
const MARGIN_BOTTOM = 20;
const PAGE_WIDTH = 210; // A4 width in mm
const PAGE_HEIGHT = 297; // A4 height in mm
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

// Informations de l'entreprise (à remplacer par les vraies données)
const COMPANY_INFO = {
  name: 'COCCINELLE SARL',
  address: 'Avenue des Nations, N°123',
  city: 'Kinshasa, RDC',
  email: 'contact@coccinelle-rdc.com',
  phone: '+243 123 456 789',
  website: 'www.coccinelle-rdc.com',
  rccm: 'RCCM: 12-KIN-3456',
  idnat: 'ID.NAT: 01-2345678901-12',
  nif: 'NIF: A123456789',
  bankAccount: 'EQUITY BCDC | 0001105023-32000099001-60 | COCCINELLE'
};

export const generateFacturePDF = async (facture: Facture) => {
  try {
    const doc = new jsPDF();
    let yPosition = MARGIN_TOP;

    // Fonctions utilitaires
    const setFillColor = (color: number[]) => {
      doc.setFillColor(color[0], color[1], color[2]);
    };

    const setTextColor = (color: number[]) => {
      doc.setTextColor(color[0], color[1], color[2]);
    };

    const setDrawColor = (color: number[]) => {
      doc.setDrawColor(color[0], color[1], color[2]);
    };

    const addText = (text: string, x: number, y: number, fontSize: number = FONT_SIZE_NORMAL, maxWidth?: number, color?: number[]) => {
      doc.setFontSize(fontSize);
      if (color) setTextColor(color);
      const lines = maxWidth ? doc.splitTextToSize(text, maxWidth) : [text];
      doc.text(lines, x, y);
      return lines.length * LINE_HEIGHT;
    };

    const drawLine = (x1: number, y1: number, x2: number, y2: number, color?: number[]) => {
      if (color) setDrawColor(color);
      doc.line(x1, y1, x2, y2);
    };

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

    // ============= EN-TÊTE =============
    
    // Logo (placeholder - à remplacer par le vrai logo)
    drawRect(MARGIN_LEFT, yPosition, 30, 20, COLORS.light, COLORS.primary);
    setTextColor([255, 255, 255]);
    doc.setFontSize(12);
    doc.text('LOGO', MARGIN_LEFT + 15, yPosition + 10, { align: 'center' });
    
    // Informations de l'entreprise
    let companyX = MARGIN_LEFT + 40;
    addText(COMPANY_INFO.name, companyX, yPosition, FONT_SIZE_TITLE);
    yPosition += 6;
    addText(COMPANY_INFO.address, companyX, yPosition, FONT_SIZE_SMALL);
    yPosition += 4;
    addText(COMPANY_INFO.city, companyX, yPosition, FONT_SIZE_SMALL);
    yPosition += 4;
    addText(`📧 ${COMPANY_INFO.email}`, companyX, yPosition, FONT_SIZE_SMALL);
    yPosition += 4;
    addText(`📞 ${COMPANY_INFO.phone}`, companyX, yPosition, FONT_SIZE_SMALL);
    yPosition += 4;
    addText(`🌐 ${COMPANY_INFO.website}`, companyX, yPosition, FONT_SIZE_SMALL);

    // Informations facture alignées à droite avec fond coloré
    const infoBoxX = PAGE_WIDTH - MARGIN_RIGHT - 80;
    const infoBoxWidth = 80;
    drawRect(infoBoxX, yPosition - 5, infoBoxWidth, 35, COLORS.header);
    
    setTextColor([255, 255, 255]);
    addText('FACTURE', infoBoxX + infoBoxWidth / 2, yPosition, FONT_SIZE_SUBTITLE, undefined, [255, 255, 255]);
    yPosition += 8;
    addText(`N°: ${facture.facture_number}`, infoBoxX + 5, yPosition, FONT_SIZE_SMALL, undefined, [255, 255, 255]);
    yPosition += 6;
    addText(`Date: ${format(new Date(facture.date_emission), 'dd/MM/yyyy', { locale: fr })}`, infoBoxX + 5, yPosition, FONT_SIZE_SMALL, undefined, [255, 255, 255]);
    yPosition += 6;
    
    // Badge de statut
    const statusColors: Record<string, number[]> = {
      'brouillon': COLORS.textLight,
      'en_attente': COLORS.warning,
      'validee': COLORS.success,
      'annulee': [239, 68, 68]
    };
    const statusText: Record<string, string> = {
      'brouillon': 'BROUILLON',
      'en_attente': 'EN ATTENTE',
      'validee': 'VALIDÉE',
      'annulee': 'ANNULÉE'
    };
    
    const statusColor = statusColors[facture.statut] || COLORS.textLight;
    drawRect(infoBoxX + 5, yPosition, infoBoxWidth - 10, 8, statusColor);
    setTextColor([255, 255, 255]);
    doc.setFontSize(FONT_SIZE_SMALL - 1);
    doc.text(statusText[facture.statut] || '', infoBoxX + infoBoxWidth / 2, yPosition + 4, { align: 'center' });

    yPosition += 20;

    // ============= SECTION CLIENT ET LIVRAISON =============
    
    drawLine(MARGIN_LEFT, yPosition, PAGE_WIDTH - MARGIN_RIGHT, yPosition, COLORS.border);
    yPosition += 8;

    // Ligne d'informations client/livraison
    const client = facture.client || facture.clients;
    if (client) {
      addText('CLIENT(E):', MARGIN_LEFT, yPosition, FONT_SIZE_NORMAL, undefined, COLORS.text);
      addText(client?.nom || '', MARGIN_LEFT + 45, yPosition);
      
      addText('LIEU:', MARGIN_LEFT + 120, yPosition, FONT_SIZE_NORMAL, undefined, COLORS.text);
      addText(client?.ville || '', MARGIN_LEFT + 155, yPosition);
      
      addText('PHONE:', MARGIN_LEFT + 200, yPosition, FONT_SIZE_NORMAL, undefined, COLORS.text);
      addText(client?.telephone || '', MARGIN_LEFT + 245, yPosition);
      
      yPosition += 6;
      
      addText('LIVRAISON:', MARGIN_LEFT, yPosition, FONT_SIZE_NORMAL, undefined, COLORS.text);
      addText(client?.ville || '', MARGIN_LEFT + 55, yPosition);
      
      addText('MÉTHODE:', MARGIN_LEFT + 120, yPosition, FONT_SIZE_NORMAL, undefined, COLORS.text);
      const methodText = facture.mode_livraison === 'aerien' ? 'Aérien' : 'Maritime';
      addText(methodText, MARGIN_LEFT + 175, yPosition);
    }

    yPosition += 15;

    // ============= TABLEAU DES PRODUITS =============
    
    if (facture.items && facture.items.length > 0) {
      // En-tête du tableau
      const tableStart = yPosition;
      const colWidths = [15, 10, 60, 25, 20, 25, 25]; // Image, QTY, Description, Prix Unit, Poids/CBM, Montant
      const headers = ['IMAGE', 'QTY', 'DESCRIPTION', 'PRIX UNIT', 'POIDS/CBM', 'MONTANT'];
      
      // Fond d'en-tête
      drawRect(MARGIN_LEFT, yPosition - 3, CONTENT_WIDTH, 10, COLORS.light, COLORS.border);
      yPosition += 2;
      
      let xPos = MARGIN_LEFT + 5;
      headers.forEach((header, index) => {
        addText(header, xPos, yPosition, FONT_SIZE_SMALL, undefined, COLORS.text);
        xPos += colWidths[index];
      });
      
      yPosition += 8;
      drawLine(MARGIN_LEFT, yPosition, PAGE_WIDTH - MARGIN_RIGHT, yPosition, COLORS.border);
      yPosition += 5;

      // Lignes du tableau
      let totalWeight = 0;
      for (const [index, item] of facture.items.entries()) {
        if (yPosition > 220) {
          doc.addPage();
          yPosition = MARGIN_TOP;
        }

        // Ligne avec fond alterné
        if (index % 2 === 0) {
          drawRect(MARGIN_LEFT, yPosition - 3, CONTENT_WIDTH, 15, COLORS.light);
        }

        xPos = MARGIN_LEFT + 5;
        
        // Image
        if (item.image_url) {
          try {
            doc.addImage(item.image_url, 'JPEG', xPos, yPosition - 5, 10, 10);
          } catch {
            drawRect(xPos, yPosition - 5, 10, 10, COLORS.light, COLORS.border);
            setTextColor(COLORS.textLight);
            doc.setFontSize(8);
            doc.text('📷', xPos + 5, yPosition, { align: 'center' });
          }
        } else {
          drawRect(xPos, yPosition - 5, 10, 10, COLORS.light, COLORS.border);
          setTextColor(COLORS.textLight);
          doc.setFontSize(8);
          doc.text('📷', xPos + 5, yPosition, { align: 'center' });
        }
        xPos += colWidths[0];

        // Quantité
        setTextColor(COLORS.text);
        doc.setFontSize(FONT_SIZE_SMALL);
        doc.text(item.quantite.toString(), xPos, yPosition);
        xPos += colWidths[1];

        // Description
        const descriptionLines = doc.splitTextToSize(item.description || '', colWidths[2]);
        doc.text(descriptionLines, xPos, yPosition);
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
        totalWeight += item.poids;
        xPos += colWidths[4];

        // Montant
        const totalText = facture.devise === 'USD' 
          ? `$${item.montant_total.toFixed(2)}` 
          : `${item.montant_total.toFixed(2)} FC`;
        setTextColor(COLORS.primary);
        doc.setFont('helvetica', 'bold');
        doc.text(totalText, xPos, yPosition);
        doc.setFont('helvetica', 'normal');
        setTextColor(COLORS.text);

        yPosition += Math.max(descriptionLines.length * LINE_HEIGHT, 12);
      }

      // Ligne de poids total
      yPosition += 5;
      drawLine(MARGIN_LEFT, yPosition, PAGE_WIDTH - MARGIN_RIGHT, yPosition, COLORS.border);
      yPosition += 5;
      addText(`Poids total estimé: ${totalWeight.toFixed(2)} ${facture.mode_livraison === 'aerien' ? 'kg' : 'cbm'}`, MARGIN_LEFT, yPosition, FONT_SIZE_SMALL, undefined, COLORS.textLight);

      yPosition += 15;

      // ============= RÉSUMÉ DES COÛTS =============
      
      const totalsX = PAGE_WIDTH - MARGIN_RIGHT - 100;
      const totalsWidth = 100;
      
      // Sous-total
      addText('Sous-total:', totalsX, yPosition);
      const subtotalText = facture.devise === 'USD' 
        ? `$${facture.subtotal.toFixed(2)}` 
        : `${facture.subtotal.toFixed(2)} FC`;
      addText(subtotalText, PAGE_WIDTH - MARGIN_RIGHT - 5, yPosition, undefined, undefined, COLORS.text);
      yPosition += 7;

      // Frais
      addText('Frais:', totalsX, yPosition);
      const feesText = facture.devise === 'USD' 
        ? `$${(facture.frais_transport_douane || 0).toFixed(2)}` 
        : `${(facture.frais_transport_douane || 0).toFixed(2)} FC`;
      addText(feesText, PAGE_WIDTH - MARGIN_RIGHT - 5, yPosition, undefined, undefined, COLORS.text);
      yPosition += 7;

      // Frais de transport et douane
      addText('Frais de transport et douane:', totalsX, yPosition);
      addText(feesText, PAGE_WIDTH - MARGIN_RIGHT - 5, yPosition, undefined, undefined, COLORS.text);
      yPosition += 7;

      // TOTAL GÉNÉRAL avec fond contrastant
      yPosition += 5;
      drawRect(totalsX, yPosition - 3, totalsWidth, 12, COLORS.total);
      setTextColor([255, 255, 255]);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FONT_SIZE_NORMAL);
      addText('TOTAL GÉNÉRAL:', totalsX + 5, yPosition);
      const totalText = facture.devise === 'USD' 
        ? `$${facture.total_general.toFixed(2)}` 
        : `${facture.total_general.toFixed(2)} FC`;
      addText(totalText, PAGE_WIDTH - MARGIN_RIGHT - 5, yPosition, undefined, undefined, [255, 255, 255]);
      doc.setFont('helvetica', 'normal');
      setTextColor(COLORS.text);

      yPosition += 20;
    }

    // ============= INFORMATIONS SUPPLÉMENTAIRES =============
    
    // Mentions légales
    addText(COMPANY_INFO.rccm, MARGIN_LEFT, yPosition, FONT_SIZE_SMALL, undefined, COLORS.textLight);
    yPosition += 5;
    addText(COMPANY_INFO.idnat, MARGIN_LEFT, yPosition, FONT_SIZE_SMALL, undefined, COLORS.textLight);
    yPosition += 5;
    addText(COMPANY_INFO.nif, MARGIN_LEFT, yPosition, FONT_SIZE_SMALL, undefined, COLORS.textLight);
    yPosition += 10;

    // Détails bancaires
    addText('Détails bancaires:', MARGIN_LEFT, yPosition, FONT_SIZE_NORMAL, undefined, COLORS.text);
    yPosition += 5;
    addText(COMPANY_INFO.bankAccount, MARGIN_LEFT, yPosition, FONT_SIZE_SMALL);
    yPosition += 10;

    // Coordonnées supplémentaires
    addText('Pour plus d\'informations:', MARGIN_LEFT, yPosition, FONT_SIZE_NORMAL, undefined, COLORS.text);
    yPosition += 5;
    addText(`Email: ${COMPANY_INFO.email}`, MARGIN_LEFT, yPosition, FONT_SIZE_SMALL);
    yPosition += 5;
    addText(`Site web: ${COMPANY_INFO.website}`, MARGIN_LEFT, yPosition, FONT_SIZE_SMALL);

    // ============= PIED DE PAGE =============
    
    // Ligne de séparation
    const footerY = PAGE_HEIGHT - MARGIN_BOTTOM;
    drawLine(MARGIN_LEFT, footerY, PAGE_WIDTH - MARGIN_RIGHT, footerY, COLORS.primary);
    
    // Signature si validée
    if (facture.statut === 'validee' && facture.date_validation) {
      setTextColor(COLORS.primary);
      doc.setFontSize(FONT_SIZE_SMALL);
      doc.text('Signature et cachet de l\'entreprise requis', PAGE_WIDTH / 2, footerY + 5, { align: 'center' });
      doc.text(`Validé le: ${format(new Date(facture.date_validation), 'dd MMMM yyyy', { locale: fr })}`, PAGE_WIDTH / 2, footerY + 10, { align: 'center' });
    }

    // Téléchargement du PDF
    const fileName = `${facture.type}_${facture.facture_number}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(fileName);

  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw error;
  }
};