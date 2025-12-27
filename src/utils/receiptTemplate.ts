import type { Transaction, Client } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Informations de l'entreprise
const COMPANY_INFO = {
    name: '@COCCINELLE',
    slogan: 'Votre partenaire de confiance',
    addresses: [
        '44, Kokolo, Q/Mbinza Pigeon, C/Ngaliema - Kinshasa',
        '45, Avenue Nyangwe - Elie Mbayo, Q/Lido, C/Lubumbashi'
    ],
    phones: '(+243) 970 746 213 / (+243) 851 958 937',
    email: 'sales@coccinelledrc.com',
    website: 'www.coccinelledrc.com'
};

interface ReceiptData {
    transaction: Transaction;
    client?: Client | null;
    creatorName?: string;
}

const formatCurrency = (amount: number, devise: string): string => {
    const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (devise === 'USD') return `$${formatted}`;
    if (devise === 'CDF') return `${formatted} FC`;
    if (devise === 'CNY') return `¥${formatted}`;
    return formatted;
};

// Convertir un nombre en lettres (français)
const numberToWords = (num: number): string => {
    const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
    const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
    const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingt', 'quatre-vingt-dix'];

    if (num === 0) return 'zéro';
    if (num < 0) return 'moins ' + numberToWords(-num);

    let words = '';

    if (num >= 1000) {
        const thousands = Math.floor(num / 1000);
        words += (thousands === 1 ? 'mille' : numberToWords(thousands) + ' mille') + ' ';
        num %= 1000;
    }

    if (num >= 100) {
        const hundreds = Math.floor(num / 100);
        words += (hundreds === 1 ? 'cent' : units[hundreds] + ' cent') + ' ';
        num %= 100;
    }

    if (num >= 20) {
        const tensDigit = Math.floor(num / 10);
        const unitDigit = num % 10;

        if (tensDigit === 7 || tensDigit === 9) {
            words += tens[tensDigit - 1] + '-';
            num = 10 + unitDigit;
        } else {
            words += tens[tensDigit];
            if (unitDigit === 1 && tensDigit !== 8) words += ' et';
            words += ' ';
            num = unitDigit;
        }
    }

    if (num >= 10 && num < 20) {
        words += teens[num - 10];
        num = 0;
    }

    if (num > 0 && num < 10) {
        words += units[num];
    }

    return words.trim().replace(/\s+/g, ' ');
};

const amountInWords = (amount: number, devise: string): string => {
    const wholePart = Math.floor(amount);
    const centsPart = Math.round((amount - wholePart) * 100);

    let words = numberToWords(wholePart);

    if (devise === 'USD') {
        words += ' dollar' + (wholePart > 1 ? 's' : '');
        if (centsPart > 0) {
            words += ' et ' + numberToWords(centsPart) + ' cent' + (centsPart > 1 ? 's' : '');
        }
    } else if (devise === 'CDF') {
        words += ' franc' + (wholePart > 1 ? 's' : '') + ' congolais';
    } else if (devise === 'CNY') {
        words += ' yuan' + (wholePart > 1 ? 's' : '');
    }

    return words.charAt(0).toUpperCase() + words.slice(1);
};

export const generateReceiptHTML = (data: ReceiptData): string => {
    const { transaction, client, creatorName } = data;

    const dateTransaction = format(new Date(transaction.created_at), 'dd/MM/yyyy', { locale: fr });
    const receiptNumber = `REC-${String(Math.floor(Math.random() * 9000) + 1000).padStart(4, '0')}/${new Date().getFullYear()}`;
    const clientName = client?.nom?.toUpperCase() || 'CLIENT';

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reçu de Paiement - ${receiptNumber}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', sans-serif;
            background-color: #f5f5f5;
            padding: 20px;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        .receipt {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }
        
        /* Header */
        .header {
            background: linear-gradient(135deg, #059669 0%, #047857 100%);
            color: white;
            padding: 24px 30px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        
        .logo-section h1 {
            font-size: 28px;
            font-weight: 800;
            margin-bottom: 4px;
        }
        
        .logo-section .slogan {
            font-size: 12px;
            opacity: 0.9;
        }
        
        .contact-info {
            text-align: right;
            font-size: 11px;
            line-height: 1.6;
        }
        
        .contact-info .icon {
            margin-right: 6px;
        }
        
        /* Receipt Title */
        .receipt-title {
            background: #f0fdf4;
            padding: 16px 30px;
            border-bottom: 3px solid #059669;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .receipt-title h2 {
            color: #059669;
            font-size: 20px;
            font-weight: 700;
            letter-spacing: 1px;
        }
        
        .receipt-meta {
            text-align: right;
        }
        
        .receipt-meta .receipt-no {
            font-size: 14px;
            font-weight: 700;
            color: #059669;
        }
        
        .receipt-meta .date {
            font-size: 12px;
            color: #6b7280;
            margin-top: 2px;
        }
        
        /* Body */
        .receipt-body {
            padding: 30px;
        }
        
        .field-row {
            margin-bottom: 20px;
        }
        
        .field-label {
            font-size: 11px;
            font-weight: 600;
            color: #6b7280;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
        }
        
        .field-value {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
            padding: 12px 16px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 6px;
            border-left: 4px solid #059669;
        }
        
        .field-value.client-name {
            font-size: 20px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .amount-section {
            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
            border: 2px solid #059669;
            border-radius: 8px;
            padding: 20px;
            margin: 24px 0;
        }
        
        .amount-value {
            font-size: 36px;
            font-weight: 800;
            color: #059669;
            text-align: center;
            margin-bottom: 8px;
        }
        
        .amount-words {
            font-size: 12px;
            color: #374151;
            text-align: center;
            font-style: italic;
            border-top: 1px dashed #059669;
            padding-top: 10px;
            margin-top: 10px;
        }
        
        .two-columns {
            display: flex;
            gap: 20px;
        }
        
        .two-columns > div {
            flex: 1;
        }
        
        /* Footer */
        .receipt-footer {
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
            padding: 20px 30px;
        }
        
        .signature-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-bottom: 16px;
        }
        
        .signature-box {
            width: 45%;
        }
        
        .signature-line {
            border-top: 2px solid #1f2937;
            padding-top: 8px;
            margin-top: 40px;
            font-size: 11px;
            color: #6b7280;
            text-align: center;
        }
        
        .footer-info {
            text-align: center;
            font-size: 10px;
            color: #9ca3af;
            padding-top: 12px;
            border-top: 1px solid #e5e7eb;
        }
        
        .footer-info strong {
            color: #059669;
        }
        
        /* Print Styles */
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .receipt {
                box-shadow: none;
                max-width: 100%;
            }
            .no-print {
                display: none !important;
            }
            @page {
                size: A5;
                margin: 10mm;
            }
        }
        
        /* Action Buttons */
        .action-buttons {
            text-align: center;
            padding: 20px;
            background: #f3f4f6;
        }
        
        .btn {
            display: inline-block;
            padding: 12px 24px;
            margin: 0 8px;
            border: none;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        
        .btn-primary {
            background: #059669;
            color: white;
        }
        
        .btn-primary:hover {
            background: #047857;
        }
        
        .btn-secondary {
            background: #6b7280;
            color: white;
        }
        
        .btn-secondary:hover {
            background: #4b5563;
        }
    </style>
</head>
<body>
    <div class="receipt">
        <!-- Header with Logo and Contact -->
        <div class="header">
            <div class="logo-section">
                <h1>${COMPANY_INFO.name}</h1>
                <div class="slogan">${COMPANY_INFO.slogan}</div>
            </div>
            <div class="contact-info">
                <div><span class="icon">📍</span>${COMPANY_INFO.addresses[0]}</div>
                <div><span class="icon">📞</span>${COMPANY_INFO.phones}</div>
                <div><span class="icon">✉️</span>${COMPANY_INFO.email}</div>
            </div>
        </div>
        
        <!-- Receipt Title & Number -->
        <div class="receipt-title">
            <h2>REÇU DE PAIEMENT</h2>
            <div class="receipt-meta">
                <div class="receipt-no">N° ${receiptNumber}</div>
                <div class="date">${dateTransaction}</div>
            </div>
        </div>
        
        <!-- Receipt Body -->
        <div class="receipt-body">
            <!-- Client Name -->
            <div class="field-row">
                <div class="field-label">Reçu de</div>
                <div class="field-value client-name">${clientName}</div>
            </div>
            
            <!-- Amount -->
            <div class="amount-section">
                <div class="amount-value">${formatCurrency(transaction.montant, transaction.devise)}</div>
                <div class="amount-words">${amountInWords(transaction.montant, transaction.devise)}</div>
            </div>
            
            <!-- Motif -->
            <div class="field-row">
                <div class="field-label">Pour motif de</div>
                <div class="field-value">${transaction.motif}</div>
            </div>
            
            <!-- Two Columns: Mode de paiement & Statut -->
            <div class="two-columns">
                <div class="field-row">
                    <div class="field-label">Mode de paiement</div>
                    <div class="field-value">${transaction.mode_paiement}</div>
                </div>
                <div class="field-row">
                    <div class="field-label">Statut</div>
                    <div class="field-value">${transaction.statut}</div>
                </div>
            </div>
        </div>
        
        <!-- Footer with Signature -->
        <div class="receipt-footer">
            <div class="signature-section">
                <div class="signature-box">
                    <div class="signature-line">Le Client</div>
                </div>
                <div class="signature-box">
                    <div class="signature-line">${creatorName || 'Agent Autorisé'}</div>
                </div>
            </div>
            <div class="footer-info">
                <strong>${COMPANY_INFO.name}</strong> | ${COMPANY_INFO.website} | ${COMPANY_INFO.email}
            </div>
        </div>
    </div>
    
    <!-- Action Buttons (not printed) -->
    <div class="action-buttons no-print">
        <button class="btn btn-primary" onclick="window.print()">🖨️ Imprimer</button>
        <button class="btn btn-secondary" onclick="window.close()">✕ Fermer</button>
    </div>
</body>
</html>
  `.trim();
};
