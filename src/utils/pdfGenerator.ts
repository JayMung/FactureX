import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Facture, FactureItem } from '@/types';

// Configuration des polices et couleurs
const FONT_SIZE_NORMAL = 10;
const FONT_SIZE_SMALL = 8;
const FONT_SIZE_TITLE = 16;
const FONT_SIZE_SUBTITLE = 12;
const FONT_SIZE_LARGE = 20;
const LINE_HEIGHT = 5;

// Couleurs professionnelles (basées sur le modèle HTML)
const COLORS = {
  primary: [16, 185, 129], // emerald-600
  primaryDark: [6, 95, 70], // emerald-700
  secondary: [107, 114, 128], // gray-500
  light: [249, 250, 251], // gray-50
  lightBg: [236, 254, 255], // emerald-50/50
  border: [229, 231, 235], // gray-200
  borderPrimary: [16, 185, 129], // emerald-600
  text: [31, 41, 55], // gray-800
  textLight: [107, 114, 128], // gray-500
  textGray: [55, 65, 81], // gray-700
  header: [59, 130, 246], // blue-600
  total: [16, 185, 129], // emerald-600
  white: [255, 255, 255],
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
  name: 'COCCINELLE',
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
    'EQUITY BCDC | 0001105023-32000099001-60 | COCCINELLE',
    'RAWBANK | 65101-00941018001-91 | COCCINELLE SARL'
  ],
  paymentMethods: '097 074 6213 / 085 195 8937 / 082 835 8721 / 083 186 3288',
  deliveryTime: '65-75 Jours selon les types de marchandises',
  feesDescription: 'Les frais de 10% inclus dans le coût global contiennent les frais de services & frais de transfert.'
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
    
    // Logo et nom de l'entreprise
    drawRect(MARGIN_LEFT, yPosition, 25, 15, COLORS.primary);
    setTextColor(COLORS.white);
    doc.setFontSize(10);
    doc.text('LOGO', MARGIN_LEFT + 12.5, yPosition + 7, { align: 'center' });
    
    let companyX = MARGIN_LEFT + 30;
    addText(COMPANY_INFO.name, companyX, yPosition, FONT_SIZE_LARGE);
    yPosition += 7;
    addText('Sièges:', companyX, yPosition, FONT_SIZE_SMALL, undefined, COLORS.textGray);
    yPosition += 4;
    
    // Adresses sur plusieurs lignes
    COMPANY_INFO.addresses.forEach(address => {
      addText(address, companyX, yPosition, FONT_SIZE_SMALL);
      yPosition += 3;
    });
    
    yPosition += 2;
    addText(`Tél: ${COMPANY_INFO.phone}`, companyX, yPosition, FONT_SIZE_SMALL);
    yPosition += 3;
    addText(`Email: ${COMPANY_INFO.email}`, companyX, yPosition, FONT_SIZE_SMALL);
    yPosition += 3;
    addText(`Site: ${COMPANY_INFO.website}`, companyX, yPosition, FONT_SIZE_SMALL);

    // Informations facture à droite avec fond coloré
    const infoBoxX = PAGE_WIDTH - MARGIN_RIGHT - 70;
    const infoBoxWidth = 70;
    drawRect(infoBoxX, yPosition - 5, infoBoxWidth, 30, COLORS.lightBg, COLORS.primary);
    
    setTextColor(COLORS.text);
    addText('FACTURE', infoBoxX + infoBoxWidth / 2, yPosition, FONT_SIZE_TITLE, undefined, COLORS.text);
    yPosition += 8;
    addText(`Facture No.`, infoBoxX + 5, yPosition, FONT_SIZE_SMALL);
    addText(facture.facture_number, infoBoxX + 35, yPosition, FONT_SIZE_SMALL);
    yPosition += 6;
    addText(`Date Facture:`, infoBoxX + 5, yPosition, FONT_SIZE_SMALL);
    addText(format(new Date(facture.date_emission), 'dd/MM/yyyy', { locale: fr }), infoBoxX + 35, yPosition, FONT_SIZE_SMALL);

    yPosition += 20;

    // ============= SECTION CLIENT ET LIVRAISON =============
    
    drawLine(MARGIN_LEFT, yPosition, PAGE_WIDTH - MARGIN_RIGHT, yPosition, COLORS.borderPrimary);
    yPosition += 8;

    // Cadre pour les informations client/livraison
    drawRect(MARGIN_LEFT, yPosition - 3, CONTENT_WIDTH, 25, COLORS.lightBg);
    yPosition += 3;

    const client = facture.client || facture.clients;
    if (client) {
      // Client(e)
      addText('Client(e):', MARGIN_LEFT, yPosition, FONT_SIZE_NORMAL, undefined, COLORS.textGray);
      addText(client?.nom || '', MARGIN_LEFT + 35, yPosition);
      
      // Lieu
      addText('Lieu:', MARGIN_LEFT + 100, yPosition, FONT_SIZE_NORMAL, undefined, COLORS.textGray);
      addText(client?.ville || '', MARGIN_LEFT + 130, yPosition);
      
      // Téléphone
      addText('Téléphone:', MARGIN_LEFT + 170, yPosition, FONT_SIZE_NORMAL, undefined, COLORS.textGray);
      addText(client?.telephone || '', MARGIN_LEFT + 210, yPosition);
      
      yPosition += 6;
      
      // Livraison
      addText('Livraison:', MARGIN_LEFT, yPosition, FONT_SIZE_NORMAL, undefined, COLORS.textGray);
      addText(client?.ville || '', MARGIN_LEFT + 40, yPosition);
      
      // Méthode
      addText('Méthode:', MARGIN_LEFT + 100, yPosition, FONT_SIZE_NORMAL, undefined, COLORS.textGray);
      const methodText = facture.mode_livraison === 'aerien' ? 'Aérien' : 'Maritime';
      addText(methodText, MARGIN_LEFT + 140, yPosition);
    }

    yPosition += 20;

    // ============= TABLEAU DES ARTICLES =============
    
    if (facture.items && facture.items.length > 0) {
      // En-tête du tableau
      const colWidths = [10, 15, 10, 45, 20, 20, 20]; // NUM, IMAGE, QTY, DESCRIPTION, PRIX UNIT, POIDS/CBM, MONTANT
      const headers = ['NUM', 'IMAGE', 'QTY', 'DESCRIPTION', 'PRIX UNIT', 'POIDS/CBM', 'MONTANT'];
      
      // Fond d'en-tête
      drawRect(MARGIN_LEFT, yPosition - 3, CONTENT_WIDTH, 10, COLORS.primary);
      yPosition += 2;
      
      let xPos = MARGIN_LEFT + 5;
      headers.forEach((header, index) => {
        setTextColor(COLORS.white);
        doc.setFontSize(FONT_SIZE_SMALL);
        doc.text(header, xPos, yPosition);
        xPos += colWidths[index];
      });
      
      yPosition += 8;
      drawLine(MARGIN_LEFT, yPosition, PAGE_WIDTH - MARGIN_RIGHT, yPosition, COLORS.primary);
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
        
        // NUM
        setTextColor(COLORS.textLight);
        doc.setFontSize(FONT_SIZE_SMALL);
        doc.text(item.numero_ligne.toString(), xPos, yPosition);
        xPos += colWidths[0];

        // IMAGE
        if (item.image_url) {
          try {
            doc.addImage(item.image_url, 'JPEG', xPos, yPosition - 5, 12, 12);
          } catch {
            drawRect(xPos, yPosition - 5, 12, 12, COLORS.light, COLORS.border);
            setTextColor(COLORS.textLight);
            doc.setFontSize(8);
            doc.text('(img)', xPos + 6, yPosition, { align: 'center' });
          }
        } else {
          drawRect(xPos, yPosition - 5, 12, 12, COLORS.light, COLORS.border);
          setTextColor(COLORS.textLight);
          doc.setFontSize(8);
          doc.text('(img)', xPos + 6, yPosition, { align: 'center' });
        }
        xPos += colWidths[1];

        // QTY
        setTextColor(COLORS.text);
        doc.setFontSize(FONT_SIZE_SMALL);
        doc.text(item.quantite.toString(), xPos, yPosition);
        xPos += colWidths[2];

        // DESCRIPTION
        const descriptionLines = doc.splitTextToSize(item.description || '', colWidths[3]);
        doc.text(descriptionLines, xPos, yPosition);
        xPos += colWidths[3];

        // PRIX UNIT
        const prixText = facture.devise === 'USD' 
          ? `$${item.prix_unitaire.toFixed(2)}` 
          : `${item.prix_unitaire.toFixed(2)} FC`;
        doc.text(prixText, xPos, yPosition);
        xPos += colWidths[4];

        // POIDS/CBM
        const poidsText = `${item.poids.toFixed(2)} ${facture.mode_livraison === 'aerien' ? 'kg' : 'cbm'}`;
        doc.text(poidsText, xPos, yPosition);
        totalWeight += item.poids;
        xPos += colWidths[5];

        // MONTANT
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
      
      const totalsX = PAGE_WIDTH - MARGIN_RIGHT - 80;
      const totalsWidth = 80;
      
      // Sous-total
      addText('SOUS-TOTAL:', totalsX, yPosition);
      const subtotalText = facture.devise === 'USD' 
        ? `$${facture.subtotal.toFixed(2)}` 
        : `${facture.subtotal.toFixed(2)} FC`;
      addText(subtotalText, PAGE_WIDTH - MARGIN_RIGHT - 5, yPosition);
      yPosition += 7;

      // Frais
      addText('Frais (10% de services & transfert):', totalsX, yPosition);
      const feesText = facture.devise === 'USD' 
        ? `$${(facture.frais_transport_douane || 0).toFixed(2)}` 
        : `${(facture.frais_transport_douane || 0).toFixed(2)} FC`;
      addText(feesText, PAGE_WIDTH - MARGIN_RIGHT - 5, yPosition);
      yPosition += 7;

      // Transport & Douane
      addText('TRANSPORT & DOUANE:', totalsX, yPosition);
      addText(feesText, PAGE_WIDTH - MARGIN_RIGHT - 5, yPosition);
      yPosition += 7;

      // TOTAL GÉNÉRAL avec fond contrastant
      yPosition += 5;
      drawRect(totalsX, yPosition - 3, totalsWidth, 12, COLORS.primary);
      setTextColor(COLORS.white);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(FONT_SIZE_NORMAL);
      addText('TOTAL GÉNÉRAL:', totalsX + 5, yPosition);
      const totalText = facture.devise === 'USD' 
        ? `$${facture.total_general.toFixed(2)}` 
        : `${facture.total_general.toFixed(2)} FC`;
      addText(totalText, PAGE_WIDTH - MARGIN_RIGHT - 5, yPosition);
      doc.setFont('helvetica', 'normal');
      setTextColor(COLORS.text);

      yPosition += 20;
    }

    // ============= CONDITIONS ET NOTES =============
    
    // Conditions
    addText('Conditions:', MARGIN_LEFT, yPosition, FONT_SIZE_NORMAL, undefined, COLORS.textGray);
    yPosition += 5;
    addText(COMPANY_INFO.feesDescription, MARGIN_LEFT, yPosition, FONT_SIZE_SMALL);
    yPosition += 5;
    
    addText('Délais de livraison:', MARGIN_LEFT, yPosition, FONT_SIZE_NORMAL, undefined, COLORS.textGray);
    yPosition += 5;
    addText(COMPANY_INFO.deliveryTime, MARGIN_LEFT, yPosition, FONT_SIZE_SMALL);
    yPosition += 5;
    
    addText('Paiement par Mobile Money:', MARGIN_LEFT, yPosition, FONT_SIZE_NORMAL, undefined, COLORS.textGray);
    yPosition += 5;
    addText(COMPANY_INFO.paymentMethods, MARGIN_LEFT, yPosition, FONT_SIZE_SMALL);
    yPosition += 10;

    // ============= INFORMATIONS BANCAIRES ET LÉGALES =============
    
    drawLine(MARGIN_LEFT, yPosition, PAGE_WIDTH - MARGIN_RIGHT, yPosition, COLORS.borderPrimary);
    yPosition += 8;
    
    addText('INFORMATIONS BANCAIRES ET LÉGALES:', MARGIN_LEFT, yPosition, FONT_SIZE_NORMAL, undefined, COLORS.primary);
    yPosition += 8;
    
    // Banques
    COMPANY_INFO.banks.forEach(bank => {
      addText(bank, MARGIN_LEFT, yPosition, FONT_SIZE_SMALL);
      yPosition += 4;
    });
    
    yPosition += 4;
    
    // Informations légales
    addText(`RCCM: ${COMPANY_INFO.rccm}`, MARGIN_LEFT, yPosition, FONT_SIZE_SMALL, undefined, COLORS.textLight);
    yPosition += 4;
    addText(`ID.NAT: ${COMPANY_INFO.idnat}`, MARGIN_LEFT, yPosition, FONT_SIZE_SMALL, undefined, COLORS.textLight);
    yPosition += 4;
    addText(`IMPOT: ${COMPANY_INFO.impot}`, MARGIN_LEFT, yPosition, FONT_SIZE_SMALL, undefined, COLORS.textLight);

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