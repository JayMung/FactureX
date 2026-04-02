import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { showSuccess, showError } from './toast';

/**
 * Interface pour les données d'export
 */
export interface ExportData {
  headers: string[];
  rows: any[][];
  filename: string;
  sheetName?: string;
  title?: string;
}

/**
 * Export vers CSV
 */
export const exportToCSV = (data: ExportData) => {
  try {
    const csvContent = [
      data.headers.join(','),
      ...data.rows.map(row => row.map(cell => {
        const str = String(cell ?? '');
        return str.includes(',') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(','))
    ].join('\n');

    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${data.filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showSuccess('Export CSV réussi');
  } catch (error) {
    console.error('Export CSV error:', error);
    showError('Erreur lors de l\'export CSV');
  }
};

/**
 * Export vers Excel
 */
export const exportToExcel = (data: ExportData) => {
  try {
    const ws = XLSX.utils.aoa_to_sheet([data.headers, ...data.rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, data.sheetName || 'Data');
    XLSX.writeFile(wb, `${data.filename}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
    showSuccess('Export Excel réussi');
  } catch (error) {
    console.error('Export Excel error:', error);
    showError('Erreur lors de l\'export Excel');
  }
};

/**
 * Export vers PDF
 */
export const exportToPDF = (data: ExportData) => {
  try {
    const doc = new jsPDF('l', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Titre
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text(data.title || data.filename, pageWidth / 2, 15, { align: 'center' });
    
    // Date d'édition
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Édité le : ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, pageWidth - 15, 22, { align: 'right' });

    autoTable(doc, {
      startY: 25,
      head: [data.headers],
      body: data.rows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [16, 185, 129], textColor: 255 }, // Emerald theme
      alternateRowStyles: { fillColor: [245, 247, 250] },
      margin: { top: 25, right: 15, bottom: 15, left: 15 },
    });

    doc.save(`${data.filename}_${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    showSuccess('Export PDF réussi');
  } catch (error) {
    console.error('Export PDF error:', error);
    showError('Erreur lors de l\'export PDF');
  }
};
