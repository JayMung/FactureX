import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import type { Facture } from '@/types';

// --- CONFIGURATION DU DESIGN MODERNE ---

type ColorTuple = [number, number, number];

// Palette de couleurs inspirée de Tailwind CSS (moderne et professionnelle)
const COLORS: { [key: string]: ColorTuple } = {
    primary: [16, 185, 129],      // emerald-600 - couleur principale
    primaryDark: [5, 150, 105],   // emerald-700 - pour les accents
    primaryLight: [167, 243, 208], // emerald-300 - pour les highlights
    primaryLighter: [209, 250, 229], // emerald-100 - backgrounds
    primaryLightest: [240, 253, 244], // emerald-50 - backgrounds légers
    textDark: [17, 24, 39],       // gray-900 - titres
    textBody: [55, 65, 81],       // gray-700 - texte principal
    textMedium: [75, 85, 99],     // gray-600 - texte secondaire
    textLight: [107, 114, 128],   // gray-500 - labels
    border: [229, 231, 235],      // gray-200 - bordures fines
    borderLight: [243, 244, 246], // gray-100 - bordures très fines
    background: [249, 250, 251],  // gray-50 - fond de section
    backgroundLight: [250, 251, 252], // presque blanc
    white: [255, 255, 255],
    success: [34, 197, 94],       // green-500 - pour les totaux
    warning: [234, 179, 8],       // yellow-500 - pour les alertes
};

const MARGIN = 15;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - (MARGIN * 2);

// Configuration par défaut (fallback) - sera remplacée par les données de la DB
const DEFAULT_COMPANY_INFO = {
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
    feesDescription: 'Les frais de 15% inclus dans le coût global contiennent les frais de services & frais de transfert.',
    feesPercentage: 0.15 // 15% par défaut
};

// --- FONCTION POUR CHARGER IMAGE DEPUIS URL (avec gestion CORS) ---
const loadImageFromUrl = async (url: string): Promise<string | null> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        // Utiliser le même proxy Supabase que ImagePreview.tsx
        const proxyUrl = `https://ddnxtuhswmewoxrwswzg.supabase.co/functions/v1/image-proxy?url=${encodeURIComponent(url)}`;
        
        img.onload = () => {
            try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0);
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                } else {
                    resolve(null);
                }
            } catch (e) {
                console.error('Erreur conversion image:', e);
                resolve(null);
            }
        };
        
        img.onerror = () => {
            console.error('Erreur chargement image via proxy:', url);
            resolve(null);
        };
        
        // Charger l'image via le proxy Supabase
        img.src = proxyUrl;
        
        // Timeout après 10 secondes
        setTimeout(() => {
            console.warn('Timeout lors du chargement de l\'image:', url);
            resolve(null);
        }, 10000);
    });
};

// --- FONCTION HELPER POUR DESSINER PLACEHOLDER IMAGE ---
const drawImagePlaceholder = (doc: jsPDF, x: number, y: number, size: number) => {
    // Fond gris clair simple
    doc.setFillColor(COLORS.background[0], COLORS.background[1], COLORS.background[2]);
    doc.rect(x, y, size, size, 'F');
    
    // Texte "IMG" centré
    doc.setFontSize(5);
    doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
    doc.text('IMG', x + size / 2, y + size / 2 + 0.8, { align: 'center' });
};

// --- FONCTION POUR CHARGER LES SETTINGS DEPUIS SUPABASE ---
const loadCompanySettings = async () => {
    try {
        const { data: settings, error } = await supabase
            .from('settings')
            .select('categorie, cle, valeur')
            .in('categorie', ['company', 'invoice', 'shipping']);

        if (error) throw error;

        if (!settings || settings.length === 0) {
            return DEFAULT_COMPANY_INFO;
        }

        // Organiser les settings par clé
        const settingsMap: Record<string, string> = {};
        settings.forEach(s => {
            settingsMap[s.cle] = s.valeur || '';
        });

        // Construire l'objet avec les données de la DB
        return {
            name: settingsMap['nom_entreprise'] || DEFAULT_COMPANY_INFO.name,
            addresses: [
                DEFAULT_COMPANY_INFO.addresses[0], // Adresse 1 (peut être ajoutée dans settings)
                settingsMap['adresse_entreprise'] || DEFAULT_COMPANY_INFO.addresses[1]
            ],
            phone: settingsMap['telephone_entreprise'] || DEFAULT_COMPANY_INFO.phone,
            email: settingsMap['email_entreprise'] || DEFAULT_COMPANY_INFO.email,
            website: DEFAULT_COMPANY_INFO.website, // Peut être ajouté dans settings
            rccm: settingsMap['rccm'] || DEFAULT_COMPANY_INFO.rccm,
            idnat: settingsMap['idnat'] || DEFAULT_COMPANY_INFO.idnat,
            nif: settingsMap['nif'] || DEFAULT_COMPANY_INFO.impot,
            impot: settingsMap['nif'] || DEFAULT_COMPANY_INFO.impot,
            banks: [
                { 
                    name: 'EQUITY BCDC', 
                    details: settingsMap['equity_bcdc'] || DEFAULT_COMPANY_INFO.banks[0].details 
                },
                { 
                    name: 'RAWBANK', 
                    details: settingsMap['rawbank'] || DEFAULT_COMPANY_INFO.banks[1].details 
                }
            ],
            paymentMethods: DEFAULT_COMPANY_INFO.paymentMethods, // Peut être chargé depuis payment_methods table
            deliveryTime: settingsMap['delais_livraison'] || DEFAULT_COMPANY_INFO.deliveryTime,
            feesDescription: settingsMap['conditions_vente_defaut'] || DEFAULT_COMPANY_INFO.feesDescription,
            feesPercentage: parseFloat(settingsMap['frais_service_pourcentage'] || '0.15'),
            informationsBancaires: settingsMap['informations_bancaires'] || ''
        };
    } catch (error) {
        console.error('Erreur lors du chargement des settings:', error);
        return DEFAULT_COMPANY_INFO;
    }
};

// --- FONCTION PRINCIPALE DE GÉNÉRATION PDF ---

export const generateFacturePDF = async (facture: Facture, previewMode: boolean = false) => {
    try {
        // Charger les informations depuis la DB
        const COMPANY_INFO = await loadCompanySettings();
        
        // Pré-charger toutes les images des items
        const imageCache = new Map<number, string | null>();
        if (facture.items && facture.items.length > 0) {
            console.log('=== CHARGEMENT DES IMAGES ===');
            console.log(`Nombre d'items: ${facture.items.length}`);
            
            const imagePromises = facture.items.map(async (item, index) => {
                console.log(`Item ${index + 1}:`, {
                    description: item.description,
                    image_url: item.image_url,
                    hasUrl: !!item.image_url,
                    isHttpUrl: item.image_url?.startsWith('http')
                });
                
                if (item.image_url && 
                    (item.image_url.startsWith('http://') || item.image_url.startsWith('https://'))) {
                    console.log(`  -> Chargement de l'image depuis: ${item.image_url}`);
                    const imageData = await loadImageFromUrl(item.image_url);
                    imageCache.set(index, imageData);
                    console.log(`  -> Image ${imageData ? 'chargée' : 'échouée'}`);
                } else {
                    console.log(`  -> Pas d'URL valide, placeholder sera utilisé`);
                }
            });
            await Promise.all(imagePromises);
            console.log('=== FIN CHARGEMENT IMAGES ===');
        }
        
        const doc = new jsPDF('p', 'mm', 'a4');
        let y = MARGIN;

        // Utiliser Times New Roman pour un look plus professionnel
        const setFont = (style: 'normal' | 'bold' = 'normal') => doc.setFont('times', style);
        const formatCurrency = (amount: number, currency: string) => {
            const options: Intl.NumberFormatOptions = { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 };
            const formatted = new Intl.NumberFormat('en-US', options).format(amount);
            return currency === 'USD' ? `$${formatted}` : `${formatted} FC`;
        };

        // ========================================
        // 1. EN-TÊTE MODERNE
        // ========================================
        
        // Barre de couleur en haut (accent moderne)
        doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.rect(0, 0, PAGE_WIDTH, 4, 'F');
        
        y += 2;
        
        // Nom de l'entreprise avec style moderne
        setFont('bold');
        doc.setFontSize(20);
        doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.text(COMPANY_INFO.name, MARGIN, y);
        
        // Petite ligne sous le nom
        doc.setDrawColor(COLORS.primaryLight[0], COLORS.primaryLight[1], COLORS.primaryLight[2]);
        doc.setLineWidth(0.8);
        const nameWidth = doc.getTextWidth(COMPANY_INFO.name);
        doc.line(MARGIN, y + 1.5, MARGIN + nameWidth, y + 1.5);
        doc.setLineWidth(0.2);
        
        setFont('normal');
        doc.setFontSize(8);
        doc.setTextColor(COLORS.textMedium[0], COLORS.textMedium[1], COLORS.textMedium[2]);
        
        y += 7;
        setFont('bold');
        doc.setFontSize(7.5);
        doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
        doc.text("Sièges:", MARGIN, y);
        setFont('normal');
        doc.setFontSize(7.5);
        doc.setTextColor(COLORS.textMedium[0], COLORS.textMedium[1], COLORS.textMedium[2]);
        y += 3.5;
        doc.text(COMPANY_INFO.addresses[0], MARGIN, y);
        y += 3;
        doc.text(COMPANY_INFO.addresses[1], MARGIN, y);
        
        y += 4.5;
        doc.text(`Tél: ${COMPANY_INFO.phone}`, MARGIN, y);
        y += 3;
        doc.text(`Email: ${COMPANY_INFO.email}`, MARGIN, y);
        y += 3;
        doc.text(`Site: ${COMPANY_INFO.website}`, MARGIN, y);

        // Encadré facture côté droit - Design simple
        const headerRightX = 118;
        const headerRightY = MARGIN + 2;
        const boxWidth = PAGE_WIDTH - headerRightX - MARGIN;
        const boxHeight = 32;
        
        // Fond simple
        doc.setFillColor(COLORS.backgroundLight[0], COLORS.backgroundLight[1], COLORS.backgroundLight[2]);
        doc.rect(headerRightX, headerRightY, boxWidth, boxHeight, 'F');

        // Titre FACTURE avec style
        setFont('bold');
        doc.setFontSize(18);
        doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
        doc.text("FACTURE", headerRightX + boxWidth / 2, headerRightY + 12, { align: 'center' });
        
        // Ligne de séparation élégante
        doc.setDrawColor(COLORS.primaryLight[0], COLORS.primaryLight[1], COLORS.primaryLight[2]);
        doc.setLineWidth(0.5);
        doc.line(headerRightX + 8, headerRightY + 16, headerRightX + boxWidth - 8, headerRightY + 16);
        doc.setLineWidth(0.2);

        // Informations facture dans un layout propre
        setFont('normal');
        doc.setFontSize(8.5);
        doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
        doc.text("Facture No.:", headerRightX + 8, headerRightY + 21);
        setFont('bold');
        doc.setFontSize(9);
        doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
        doc.text(facture.facture_number, headerRightX + boxWidth - 8, headerRightY + 21, { align: 'right' });

        setFont('normal');
        doc.setFontSize(8.5);
        doc.setTextColor(COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]);
        doc.text("Date Facture:", headerRightX + 8, headerRightY + 27);
        setFont('bold');
        doc.setFontSize(9);
        doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
        doc.text(format(new Date(facture.date_emission), 'dd/MM/yyyy', { locale: fr }), headerRightX + boxWidth - 8, headerRightY + 27, { align: 'right' });

        y = Math.max(y, headerRightY + boxHeight) + 8;
        
        // Ligne de séparation moderne (dégradé simulé avec épaisseur)
        doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.setLineWidth(2);
        doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
        doc.setDrawColor(COLORS.primaryLight[0], COLORS.primaryLight[1], COLORS.primaryLight[2]);
        doc.setLineWidth(0.5);
        doc.line(MARGIN, y + 0.5, PAGE_WIDTH - MARGIN, y + 0.5);
        doc.setLineWidth(0.2);

        y += 10;

        // ========================================
        // 2. INFORMATIONS CLIENT & LIVRAISON (DESIGN MODERNE)
        // ========================================
        const client = facture.client || facture.clients;
        if (client) {
            const cardHeight = 28;
            
            // Fond simple
            doc.setFillColor(COLORS.primaryLightest[0], COLORS.primaryLightest[1], COLORS.primaryLightest[2]);
            doc.rect(MARGIN, y, CONTENT_WIDTH, cardHeight, 'F');
            
            y += 7;

            // Section Client (gauche)
            setFont('bold');
            doc.setFontSize(9);
            doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
            doc.text("CLIENT(E)", MARGIN + 5, y);

            setFont('normal');
            doc.setFontSize(8);
            doc.setTextColor(COLORS.textMedium[0], COLORS.textMedium[1], COLORS.textMedium[2]);
            y += 4.5;
            
            // Icônes simulées avec des puces
            doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
            doc.circle(MARGIN + 6, y - 1, 0.8, 'F');
            setFont('bold');
            doc.setFontSize(8);
            doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
            doc.text("Nom:", MARGIN + 8.5, y);
            setFont('normal');
            doc.setTextColor(COLORS.textMedium[0], COLORS.textMedium[1], COLORS.textMedium[2]);
            doc.text(client.nom, MARGIN + 17, y);
            
            y += 4.5;
            doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
            doc.circle(MARGIN + 6, y - 1, 0.8, 'F');
            setFont('bold');
            doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
            doc.text("Lieu:", MARGIN + 8.5, y);
            setFont('normal');
            doc.setTextColor(COLORS.textMedium[0], COLORS.textMedium[1], COLORS.textMedium[2]);
            doc.text(client.ville, MARGIN + 17, y);
            
            y += 4.5;
            doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
            doc.circle(MARGIN + 6, y - 1, 0.8, 'F');
            setFont('bold');
            doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
            doc.text("Téléphone:", MARGIN + 8.5, y);
            setFont('normal');
            doc.setTextColor(COLORS.textMedium[0], COLORS.textMedium[1], COLORS.textMedium[2]);
            doc.text(client.telephone, MARGIN + 22, y);

            // Ligne de séparation verticale entre client et livraison
            const middleX = MARGIN + (CONTENT_WIDTH / 2);
            y -= 14; // Revenir en haut pour la section livraison
            doc.setDrawColor(COLORS.primaryLighter[0], COLORS.primaryLighter[1], COLORS.primaryLighter[2]);
            doc.setLineWidth(0.5);
            doc.line(middleX, y - 1, middleX, y + 18);
            doc.setLineWidth(0.2);

            // Section Livraison (droite)
            const deliveryX = middleX + 5;
            setFont('bold');
            doc.setFontSize(9);
            doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
            doc.text("LIVRAISON", deliveryX, y);

            setFont('normal');
            doc.setFontSize(8);
            y += 4.5;
            
            doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
            doc.circle(deliveryX + 1, y - 1, 0.8, 'F');
            setFont('bold');
            doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
            doc.text("Destination:", deliveryX + 3.5, y);
            setFont('normal');
            doc.setTextColor(COLORS.textMedium[0], COLORS.textMedium[1], COLORS.textMedium[2]);
            doc.text(client.ville, deliveryX + 23, y);
            
            y += 4.5;
            doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
            doc.circle(deliveryX + 1, y - 1, 0.8, 'F');
            setFont('bold');
            doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
            doc.text("Méthode:", deliveryX + 3.5, y);
            setFont('normal');
            doc.setTextColor(COLORS.textMedium[0], COLORS.textMedium[1], COLORS.textMedium[2]);
            const deliveryMethod = facture.mode_livraison === 'aerien' ? 'Aérien' : 'BATEAU';
            doc.text(deliveryMethod, deliveryX + 19, y);
        }
        
        y += 18; // Ajustement pour descendre après la carte

        // ========================================
        // 3. TABLEAU DES ARTICLES
        // ========================================
        if (facture.items && facture.items.length > 0) {
            const tableHeaders = ['N°', 'IMAGE', 'QTÉ', 'DESCRIPTION', 'PRIX UNIT', 'POIDS', 'MONTANT'];
            const tableData = facture.items.map(item => [
                item.numero_ligne,
                '', // Colonne vide pour l'image (on dessine l'image avec didDrawCell)
                item.quantite,
                item.description,
                formatCurrency(item.prix_unitaire, facture.devise),
                `${item.poids.toFixed(2)}`,
                formatCurrency(item.montant_total, facture.devise)
            ]);

            autoTable(doc, {
                startY: y,
                head: [tableHeaders],
                body: tableData,
                theme: 'grid',
                styles: {
                    fontSize: 8,
                    cellPadding: 3,
                    lineColor: [COLORS.border[0], COLORS.border[1], COLORS.border[2]],
                    lineWidth: 0.1,
                },
                headStyles: {
                    fillColor: COLORS.primary,
                    textColor: COLORS.white,
                    fontStyle: 'bold',
                    fontSize: 8,
                    halign: 'center',
                    valign: 'middle',
                    cellPadding: 3,
                    lineWidth: 0,
                },
                bodyStyles: {
                    textColor: [COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]],
                    valign: 'middle', // Centrage vertical
                    minCellHeight: 18, // Hauteur minimale pour un bon centrage
                },
                alternateRowStyles: {
                    fillColor: [COLORS.backgroundLight[0], COLORS.backgroundLight[1], COLORS.backgroundLight[2]],
                },
                columnStyles: {
                    0: { halign: 'center', cellWidth: 11, fontStyle: 'bold', textColor: [COLORS.textLight[0], COLORS.textLight[1], COLORS.textLight[2]], valign: 'middle' },
                    1: { halign: 'center', cellWidth: 20, valign: 'middle' },
                    2: { halign: 'center', cellWidth: 13, fontStyle: 'bold', valign: 'middle' },
                    3: { halign: 'center', cellWidth: 63, textColor: [COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]], valign: 'middle' },
                    4: { halign: 'center', cellWidth: 28, fontStyle: 'bold', textColor: [COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]], valign: 'middle' },
                    5: { halign: 'center', cellWidth: 18, textColor: [COLORS.textMedium[0], COLORS.textMedium[1], COLORS.textMedium[2]], valign: 'middle' },
                    6: { halign: 'center', cellWidth: 27, fontStyle: 'bold', textColor: [COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]], valign: 'middle' },
                },
                didDrawCell: (data: any) => {
                    if (data.section === 'body' && data.column.index === 1) {
                        // Récupérer l'image pré-chargée depuis le cache
                        const rowIndex = data.row.index;
                        const imageData = imageCache.get(rowIndex);
                        
                        // Placeholder image 40x40 pixels comme demandé
                        const imgSize = 14; // ~40 pixels à 72 DPI (14mm ≈ 40px)
                        const imgX = data.cell.x + (data.cell.width - imgSize) / 2;
                        const imgY = data.cell.y + (data.cell.height - imgSize) / 2;
                        
                        if (imageData) {
                            try {
                                // Utiliser l'image pré-chargée (base64)
                                doc.addImage(imageData, 'JPEG', imgX, imgY, imgSize, imgSize);
                            } catch (e) {
                                console.error('Erreur ajout image au PDF:', e);
                                // Si erreur, afficher placeholder
                                drawImagePlaceholder(doc, imgX, imgY, imgSize);
                            }
                        } else {
                            // Pas d'image chargée, afficher placeholder
                            drawImagePlaceholder(doc, imgX, imgY, imgSize);
                        }
                    }
                },
                margin: { left: MARGIN, right: MARGIN },
            });
            y = (doc as any).lastAutoTable.finalY + 10;
        }

        // ========================================
        // 4. SECTION TOTAUX (DESIGN MODERNE AVEC CARTE)
        // ========================================
        const totalsStartX = 105;
        const totalsWidth = PAGE_WIDTH - totalsStartX - MARGIN;
        const valueX = PAGE_WIDTH - MARGIN - 3;
        
        // Calcul des frais en utilisant le pourcentage depuis les settings (ou facture si disponible)
        const feesPercentage = (COMPANY_INFO as any).feesPercentage || 0.15;
        const fees = facture.subtotal * feesPercentage;
        const grandTotal = facture.subtotal + fees + facture.shipping_fee;
        
        // Carte des totaux - Design simple
        const totalsCardY = y;
        const totalsCardHeight = 38;
        
        // Fond simple
        doc.setFillColor(COLORS.white[0], COLORS.white[1], COLORS.white[2]);
        doc.rect(totalsStartX, totalsCardY, totalsWidth, totalsCardHeight, 'F');
        
        y = totalsCardY + 7;

        // Ligne 1: Sous-total
        setFont('normal');
        doc.setFontSize(9);
        doc.setTextColor(COLORS.textMedium[0], COLORS.textMedium[1], COLORS.textMedium[2]);
        doc.text("SOUS-TOTAL", totalsStartX + 4, y);
        setFont('bold');
        doc.setFontSize(10);
        doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
        doc.text(formatCurrency(facture.subtotal, facture.devise), valueX, y, { align: 'right' });
        y += 6;
        
        // Ligne séparatrice fine
        doc.setDrawColor(COLORS.borderLight[0], COLORS.borderLight[1], COLORS.borderLight[2]);
        doc.setLineWidth(0.2);
        doc.line(totalsStartX + 4, y - 2, valueX, y - 2);

        // Ligne 2: Frais (avec pourcentage dynamique)
        setFont('normal');
        doc.setFontSize(9);
        doc.setTextColor(COLORS.textMedium[0], COLORS.textMedium[1], COLORS.textMedium[2]);
        const feesPercentageText = `Frais (${Math.round(feesPercentage * 100)}% de services & transfert)`;
        doc.text(feesPercentageText, totalsStartX + 4, y);
        setFont('bold');
        doc.setFontSize(10);
        doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
        doc.text(formatCurrency(fees, facture.devise), valueX, y, { align: 'right' });
        y += 6;
        doc.line(totalsStartX + 4, y - 2, valueX, y - 2);

        // Ligne 3: Transport & Douane
        setFont('normal');
        doc.setFontSize(9);
        doc.setTextColor(COLORS.textMedium[0], COLORS.textMedium[1], COLORS.textMedium[2]);
        doc.text("TRANSPORT & DOUANE", totalsStartX + 4, y);
        setFont('bold');
        doc.setFontSize(10);
        doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
        doc.text(formatCurrency(facture.shipping_fee, facture.devise), valueX, y, { align: 'right' });
        y += 8;

        // Total général avec fond vert
        const totalBoxHeight = 12;
        
        // Fond simple (vert clair)
        doc.setFillColor(COLORS.primaryLighter[0], COLORS.primaryLighter[1], COLORS.primaryLighter[2]);
        doc.rect(totalsStartX + 2, y - 3, totalsWidth - 4, totalBoxHeight, 'F');
        
        // Ligne supérieure avec couleur primaire
        doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.setLineWidth(1.5);
        doc.line(totalsStartX + 2, y - 3, totalsStartX + totalsWidth - 2, y - 3);
        doc.setLineWidth(0.2);
        
        setFont('bold');
        doc.setFontSize(10);
        doc.setTextColor(COLORS.textDark[0], COLORS.textDark[1], COLORS.textDark[2]);
        doc.text("TOTAL GÉNÉRAL", totalsStartX + 6, y + 4);
        
        doc.setFontSize(12);
        doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.text(formatCurrency(grandTotal, facture.devise), valueX - 2, y + 4, { align: 'right' });

        y = totalsCardY + totalsCardHeight + 12;

        // ========================================
        // 5. PIED DE PAGE (DESIGN MODERNE)
        // ========================================
        
        // Ligne de séparation élégante
        doc.setDrawColor(COLORS.border[0], COLORS.border[1], COLORS.border[2]);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
        doc.setLineWidth(0.2);
        y += 7;

        // Section conditions avec icônes simulées
        setFont('bold');
        doc.setFontSize(8);
        doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
        
        // Puce pour Conditions
        doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.circle(MARGIN + 1, y - 1, 0.7, 'F');
        doc.text("Conditions:", MARGIN + 3, y);
        
        setFont('normal');
        doc.setFontSize(7.5);
        doc.setTextColor(COLORS.textMedium[0], COLORS.textMedium[1], COLORS.textMedium[2]);
        const conditionsText = doc.splitTextToSize(COMPANY_INFO.feesDescription, CONTENT_WIDTH - 23);
        doc.text(conditionsText, MARGIN + 20, y);
        y += 5;

        // Puce pour Délais
        doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.circle(MARGIN + 1, y - 1, 0.7, 'F');
        setFont('bold');
        doc.setFontSize(8);
        doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
        doc.text("Délais de livraison:", MARGIN + 3, y);
        
        setFont('normal');
        doc.setFontSize(7.5);
        doc.setTextColor(COLORS.textMedium[0], COLORS.textMedium[1], COLORS.textMedium[2]);
        doc.text(COMPANY_INFO.deliveryTime, MARGIN + 32, y);
        y += 5;

        // Puce pour Paiement
        doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.circle(MARGIN + 1, y - 1, 0.7, 'F');
        setFont('bold');
        doc.setFontSize(8);
        doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
        doc.text("Paiement par Mobile Money:", MARGIN + 3, y);
        
        setFont('normal');
        doc.setFontSize(7.5);
        doc.setTextColor(COLORS.textMedium[0], COLORS.textMedium[1], COLORS.textMedium[2]);
        doc.text(COMPANY_INFO.paymentMethods, MARGIN + 42, y);
        y += 8;

        // Ligne de séparation avec accent de couleur
        doc.setDrawColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.setLineWidth(1.2);
        doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
        doc.setDrawColor(COLORS.primaryLight[0], COLORS.primaryLight[1], COLORS.primaryLight[2]);
        doc.setLineWidth(0.5);
        doc.line(MARGIN, y + 0.5, PAGE_WIDTH - MARGIN, y + 0.5);
        doc.setLineWidth(0.2);
        y += 6;

        // ========================================
        // FOOTER EN BAS DE PAGE (position fixe)
        // ========================================
        const footerStartY = 258; // Position fixe pour footer
        
        // Section informations bancaires avec encadré
        setFont('bold');
        doc.setFontSize(9);
        doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
        doc.text("INFORMATIONS BANCAIRES ET LÉGALES:", PAGE_WIDTH / 2, footerStartY, { align: 'center' });

        // Informations bancaires avec style moderne
        let footerY = footerStartY + 5;
        setFont('normal');
        doc.setFontSize(8);
        COMPANY_INFO.banks.forEach(bank => {
            const fullText = `${bank.name} ${bank.details}`;
            const totalWidth = doc.getTextWidth(fullText);
            const startX = (PAGE_WIDTH - totalWidth) / 2;
            
            setFont('bold');
            doc.setTextColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
            doc.text(bank.name, startX, footerY);
            
            setFont('normal');
            doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
            const nameWidth = doc.getTextWidth(bank.name);
            doc.text(bank.details, startX + nameWidth, footerY);
            footerY += 4;
        });
        footerY += 2;

        // Informations légales en bas (plus visibles)
        doc.setFontSize(7.5);
        doc.setTextColor(COLORS.textBody[0], COLORS.textBody[1], COLORS.textBody[2]);
        const legalInfo = `RCCM: ${COMPANY_INFO.rccm} | ID.NAT: ${COMPANY_INFO.idnat} | IMPOT: ${COMPANY_INFO.impot}`;
        doc.text(legalInfo, PAGE_WIDTH / 2, footerY, { align: 'center' });
        
        // Barre de couleur en bas de page (miroir du haut)
        doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
        doc.rect(0, 293, PAGE_WIDTH, 4, 'F');

        // --- SAUVEGARDE DU FICHIER ---
        const fileName = `${facture.type}_${facture.facture_number}.pdf`;
        
        if (previewMode) {
            // Mode aperçu : retourner le blob pour affichage
            return doc.output('blob');
        } else {
            // Mode téléchargement : sauvegarder directement
            doc.save(fileName);
        }

    } catch (error) {
        console.error('Erreur lors de la génération du PDF:', error);
        throw new Error('Impossible de générer le PDF.');
    }
};