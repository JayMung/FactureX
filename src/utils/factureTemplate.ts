import type { Facture, FactureItem, Client } from '@/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Informations de l'entreprise
const COMPANY_INFO = {
  name: '@COCCINELLE',
  addresses: [
    '44, Kokolo, Q/Mbinza Pigeon, C/Ngaliema - Kinshasa',
    '45, Avenue Nyangwe - Elie Mbayo, Q/Lido, C/Lubumbashi'
  ],
  phones: '(+243) 970 746 213 / (+243) 851 958 937',
  email: 'sales@coccinelledrc.com',
  website: 'www.coccinelledrc.com',
  banking: {
    equity: 'EQUITY BCDC | 0001105023-32000099001-60 | COCCINELLE',
    rawbank: 'RAWBANK | 65101-00941018001-91 | COCCINELLE SARL'
  },
  legal: {
    rccm: 'CD/KNG/RCCM/21-B-02464',
    idnat: '01-F4300-N89171B',
    impot: 'A2173499P'
  },
  mobilePayments: '097 074 6213 / 085 195 8937 / 082 835 8721 / 083 186 3288'
};

interface TemplateData {
  facture: Facture;
  client: Client;
  items: FactureItem[];
  totals: {
    subtotal: number;
    frais: number;
    fraisTransportDouane: number;
    totalGeneral: number;
  };
}

const formatCurrency = (amount: number, devise: 'USD' | 'CDF'): string => {
  const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return devise === 'USD' ? `$${formatted}` : `${formatted} FC`;
};

const renderItemRow = (item: FactureItem, index: number, devise: 'USD' | 'CDF', modeLivraison: 'aerien' | 'maritime'): string => {
  const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-emerald-50/30';
  const imageHtml = item.image_url 
    ? `<img src="${item.image_url}" alt="Produit" class="w-16 h-16 object-cover rounded border" crossorigin="anonymous" referrerpolicy="no-referrer" />`
    : `<div class="w-16 h-16 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-2xl">📷</div>`;

  return `
    <tr class="item-row ${bgClass} hover:bg-emerald-100/50 transition-colors">
      <td class="px-4 py-3 text-center whitespace-nowrap text-sm text-gray-700 font-medium">${item.numero_ligne}</td>
      <td class="px-4 py-3 whitespace-nowrap">
        ${imageHtml}
      </td>
      <td class="px-4 py-3 text-center whitespace-nowrap text-base font-bold text-gray-900">${item.quantite}</td>
      <td class="px-4 py-3 text-sm text-gray-700 leading-relaxed">${item.description || ''}</td>
      <td class="px-4 py-3 text-right">
        <div class="font-bold text-gray-900">${formatCurrency(item.prix_unitaire, devise)}</div>
        <div class="text-xs text-gray-500 mt-1">${item.poids.toFixed(2)} ${modeLivraison === 'aerien' ? 'kg' : 'cbm'}</div>
      </td>
      <td class="px-4 py-3 text-right whitespace-nowrap text-base font-extrabold text-gray-900">${formatCurrency(item.montant_total, devise)}</td>
    </tr>
  `;
};

export const generateFactureHTML = (data: TemplateData): string => {
  const { facture, client, items, totals } = data;
  
  const itemsHTML = items.map((item, index) => 
    renderItemRow(item, index, facture.devise, facture.mode_livraison)
  ).join('');

  const dateEmission = format(new Date(facture.date_emission), 'dd/MM/yyyy', { locale: fr });
  const delaiLivraison = facture.mode_livraison === 'aerien' ? '30-45' : '65-75';
  
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facture ${facture.facture_number} - COCCINELLE</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        
        body {
            font-family: 'Inter', sans-serif;
            background-color: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        
        @media print {
            body {
                background-color: white;
                margin: 0;
                padding: 0;
            }
            .invoice-container {
                box-shadow: none !important;
                margin: 0 !important;
                border: none !important;
                padding: 20mm !important;
            }
            @page {
                size: A4;
                margin: 0;
            }
        }
        
        .item-row td {
            vertical-align: middle;
        }
        
        img {
            max-width: 100%;
            height: auto;
        }
    </style>
</head>
<body>
    <div class="invoice-container max-w-5xl mx-auto bg-white p-10">
        
        <!-- En-tête -->
        <header class="flex justify-between border-b-4 border-emerald-600 pb-6 mb-8">
            <div class="w-3/5">
                <h1 class="text-4xl font-extrabold text-emerald-600 mb-3">${COMPANY_INFO.name}</h1>
                <p class="text-sm text-gray-700 font-semibold mb-1">Sièges:</p>
                ${COMPANY_INFO.addresses.map(addr => `<p class="text-xs text-gray-600">${addr}</p>`).join('')}
                <p class="text-xs text-gray-600 mt-2">Tél: ${COMPANY_INFO.phones}</p>
                <p class="text-xs text-gray-600">
                    Email: <a href="mailto:${COMPANY_INFO.email}" class="text-blue-600 hover:text-blue-800">${COMPANY_INFO.email}</a>
                </p>
                <p class="text-xs text-gray-600">
                    Site: <a href="http://${COMPANY_INFO.website}" class="text-blue-600 hover:text-blue-800">${COMPANY_INFO.website}</a>
                </p>
            </div>

            <div class="w-2/5 text-right bg-gray-50 p-4 rounded-lg">
                <h2 class="text-3xl font-bold text-gray-800 mb-4">${facture.type === 'facture' ? 'FACTURE' : 'DEVIS'}</h2>
                <div class="text-sm space-y-1">
                    <div class="flex justify-between">
                        <span class="font-semibold text-gray-600">N°:</span>
                        <span class="font-bold text-gray-800">${facture.facture_number}</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="font-semibold text-gray-600">Date:</span>
                        <span class="font-bold text-gray-800">${dateEmission}</span>
                    </div>
                </div>
            </div>
        </header>

        <!-- Informations Client et Livraison -->
        <section class="flex justify-between mb-8 p-4 border rounded-lg bg-emerald-50/50">
            <div class="w-1/2">
                <h3 class="text-base font-bold text-gray-700 uppercase border-b border-emerald-300 pb-1 mb-2">Client(e)</h3>
                <div class="text-sm text-gray-700 space-y-1">
                    <p><span class="font-semibold">Nom:</span> ${client.nom}</p>
                    <p><span class="font-semibold">Lieu:</span> ${client.ville || ''}</p>
                    <p><span class="font-semibold">Téléphone:</span> ${client.telephone}</p>
                </div>
            </div>

            <div class="w-1/3">
                <h3 class="text-base font-bold text-gray-700 uppercase border-b border-emerald-300 pb-1 mb-2">Livraison</h3>
                <div class="text-sm text-gray-700 space-y-1">
                    <p><span class="font-semibold">Destination:</span> ${client.ville || ''}</p>
                    <p><span class="font-semibold">Méthode:</span> ${facture.mode_livraison === 'aerien' ? 'AVION' : 'BATEAU'}</p>
                </div>
            </div>
        </section>

        <!-- Tableau des Articles -->
        <section class="mb-8">
            <table class="min-w-full divide-y divide-gray-200 shadow-md rounded-lg overflow-hidden">
                <thead class="bg-emerald-600 text-white">
                    <tr>
                        <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">NUM</th>
                        <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">IMAGE</th>
                        <th class="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider">QTY</th>
                        <th class="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">DESCRIPTION</th>
                        <th class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                            PRIX UNIT<br>
                            <span class="text-xs font-normal opacity-80">POIDS/${facture.mode_livraison === 'aerien' ? 'KG' : 'CBM'}</span>
                        </th>
                        <th class="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">MONTANT</th>
                    </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                    ${itemsHTML}
                </tbody>
            </table>
        </section>

        <!-- Totaux et Récapitulatif -->
        <section class="flex justify-end mb-8">
            <div class="w-2/5">
                <div class="flex justify-between items-center py-2 border-b border-gray-200">
                    <span class="text-sm font-medium text-gray-600">SOUS-TOTAL</span>
                    <span class="text-sm font-semibold text-gray-800">${formatCurrency(totals.subtotal, facture.devise)}</span>
                </div>
                
                <div class="flex justify-between items-center py-2 border-b border-gray-200">
                    <span class="text-sm font-medium text-gray-600">Frais (${((totals.frais / totals.subtotal) * 100).toFixed(0)}% de services & transfert)</span>
                    <span class="text-sm font-semibold text-gray-800">${formatCurrency(totals.frais, facture.devise)}</span>
                </div>
                
                <div class="flex justify-between items-center py-2 border-b border-gray-200">
                    <span class="text-sm font-medium text-gray-600">TRANSPORT & DOUANE</span>
                    <span class="text-sm font-semibold text-gray-800">${formatCurrency(totals.fraisTransportDouane, facture.devise)}</span>
                </div>
                
                <div class="flex justify-between items-center py-3 bg-emerald-100 rounded-b-lg mt-2">
                    <span class="text-lg font-bold text-gray-800 px-2">TOTAL GÉNÉRALE</span>
                    <span class="text-xl font-extrabold text-emerald-700 px-2">${formatCurrency(totals.totalGeneral, facture.devise)}</span>
                </div>
            </div>
        </section>

        <!-- Conditions et Notes -->
        <section class="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-600 space-y-3">
            ${facture.conditions_vente ? `
            <p class="mb-2">
                <span class="font-bold">Conditions:</span> ${facture.conditions_vente}
            </p>
            ` : `
            <p class="mb-2">
                <span class="font-bold">Conditions:</span> Les frais inclus dans le coût global contiennent les frais de services & frais de transfert.
            </p>
            `}
            
            <p class="mb-4">
                <span class="font-bold">Délais de livraison:</span> ${delaiLivraison} Jours selon les types de marchandises.
            </p>
            
            <p class="mb-4">
                <span class="font-bold">Paiement par Mobile Money:</span> ${COMPANY_INFO.mobilePayments}
            </p>

            ${facture.notes ? `
            <p class="mb-4">
                <span class="font-bold">Notes:</span> ${facture.notes}
            </p>
            ` : ''}

            <!-- Informations Bancaires et Légales -->
            <div class="mt-6 border-t pt-4 border-emerald-300 text-center">
                <p class="font-semibold mb-2">INFORMATIONS BANCAIRES ET LÉGALES:</p>
                <p class="mb-1">
                    <span class="font-bold text-emerald-700">${COMPANY_INFO.banking.equity}</span>
                </p>
                <p class="mb-3">
                    <span class="font-bold text-emerald-700">${COMPANY_INFO.banking.rawbank}</span>
                </p>
                <p>
                    RCCM: ${COMPANY_INFO.legal.rccm} | ID.NAT: ${COMPANY_INFO.legal.idnat} | IMPOT: ${COMPANY_INFO.legal.impot}
                </p>
            </div>
        </section>

    </div>
</body>
</html>
  `.trim();
};
