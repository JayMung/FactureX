import jsPDF from 'jspdf';
import type { Facture } from '@/types';

export const generateFacturePDF = (facture: Facture) => {
  const doc = new jsPDF();
  let yPosition = 20;
  const leftCol = 20;

  // Client information
  yPosition += 5;
  const clientInfo = facture.clients || facture.client;
  doc.text(clientInfo?.nom || 'N/A', leftCol, yPosition);

  // Save the PDF
  const fileName = `${facture.type === 'devis' ? 'Devis' : 'Facture'}_${facture.facture_number}_${clientInfo?.nom || 'Client'}.pdf`;
  
  doc.save(fileName);
};