import jsPDF from 'jspdf';
import { format } from 'date-fns';
import type { Facture } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { generateFactureHTML } from './factureTemplate';

/**
 * Génère un PDF de facture à partir d'un template HTML
 * Cette version utilise une conversion HTML vers PDF pour un meilleur rendu
 */
export const generateFacturePDFHTML = async (facture: Facture) => {
  try {
    // Récupérer les items de la facture
    const { data: items, error: itemsError } = await supabase
      .from('facture_items')
      .select('*')
      .eq('facture_id', facture.id)
      .order('numero_ligne');

    if (itemsError) throw itemsError;

    // Récupérer les informations du client
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', facture.client_id)
      .single();

    if (clientError) throw clientError;

    // Calculer les totaux
    const subtotal = items?.reduce((sum, item) => sum + item.montant_total, 0) || 0;
    const totalPoids = items?.reduce((sum, item) => sum + item.poids, 0) || 0;
    
    // Récupérer les paramètres de frais
    const { data: settings } = await supabase
      .from('settings')
      .select('cle, valeur')
      .eq('categorie', 'shipping');

    const shippingSettings: any = {};
    settings?.forEach(item => {
      shippingSettings[item.cle] = parseFloat(item.valeur);
    });

    const fraisAerien = shippingSettings.frais_aerien_par_kg || 16;
    const fraisMaritime = shippingSettings.frais_maritime_par_cbm || 450;
    
    const shippingFee = facture.mode_livraison === 'aerien' 
      ? totalPoids * fraisAerien
      : totalPoids * fraisMaritime;
    
    // Calculer les frais (15% par défaut ou utiliser la valeur de la facture)
    const fraisPercentage = 15; // Vous pouvez ajuster ce pourcentage
    const frais = subtotal * (fraisPercentage / 100);
    
    const fraisTransportDouane = shippingFee;
    const totalGeneral = subtotal + frais + fraisTransportDouane;

    // Générer le HTML
    const htmlContent = generateFactureHTML({
      facture,
      client,
      items: items || [],
      totals: {
        subtotal,
        frais,
        fraisTransportDouane,
        totalGeneral
      }
    });

    // Créer une fenêtre popup pour afficher et imprimer le PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Attendre que les styles et images soient chargés
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 500);
      };
    } else {
      throw new Error('Impossible d\'ouvrir la fenêtre d\'impression. Vérifiez que les popups ne sont pas bloquées.');
    }

  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw error;
  }
};

/**
 * Génère et télécharge le PDF directement (méthode alternative)
 */
export const downloadFacturePDFHTML = async (facture: Facture) => {
  try {
    // Récupérer les données comme ci-dessus
    const { data: items } = await supabase
      .from('facture_items')
      .select('*')
      .eq('facture_id', facture.id)
      .order('numero_ligne');

    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', facture.client_id)
      .single();

    const subtotal = items?.reduce((sum, item) => sum + item.montant_total, 0) || 0;
    const totalPoids = items?.reduce((sum, item) => sum + item.poids, 0) || 0;
    
    const { data: settings } = await supabase
      .from('settings')
      .select('cle, valeur')
      .eq('categorie', 'shipping');

    const shippingSettings: any = {};
    settings?.forEach(item => {
      shippingSettings[item.cle] = parseFloat(item.valeur);
    });

    const fraisAerien = shippingSettings.frais_aerien_par_kg || 16;
    const fraisMaritime = shippingSettings.frais_maritime_par_cbm || 450;
    
    const shippingFee = facture.mode_livraison === 'aerien' 
      ? totalPoids * fraisAerien
      : totalPoids * fraisMaritime;
    
    const fraisPercentage = 15;
    const frais = subtotal * (fraisPercentage / 100);
    const fraisTransportDouane = shippingFee;
    const totalGeneral = subtotal + frais + fraisTransportDouane;

    const htmlContent = generateFactureHTML({
      facture,
      client: client!,
      items: items || [],
      totals: {
        subtotal,
        frais,
        fraisTransportDouane,
        totalGeneral
      }
    });

    // Créer un blob avec le HTML
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    // Créer un lien de téléchargement
    const a = document.createElement('a');
    a.href = url;
    a.download = `${facture.type}_${facture.facture_number}_${format(new Date(), 'yyyy-MM-dd')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

  } catch (error) {
    console.error('Erreur lors du téléchargement:', error);
    throw error;
  }
};
