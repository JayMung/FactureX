import React, { useState, useEffect } from 'react';
import { ArrowLeft, Download, Package, User, Calendar, Truck, Hash, ExternalLink, BadgeCheck, FileText } from 'lucide-react';
import { ActivityItem } from '../types';
import { supabase } from '@/integrations/supabase/client';
import { generateFacturePDF } from '@/utils/pdfGenerator';
import { formatCurrency } from '@/utils/formatCurrency';
import { showSuccess, showError } from '@/utils/toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import ImagePreview from '@/components/ui/ImagePreview';

interface InvoiceDetailsPageProps {
  invoice: ActivityItem;
  onBack: () => void;
  onUpdateStatus: (id: string, status: ActivityItem['status']) => void;
}

export const InvoiceDetailsPage = ({ invoice, onBack }: InvoiceDetailsPageProps) => {
  const [facture, setFacture] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'items'>('details');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setFetchError(null);
      try {
        // Fetch the facture row only
        const { data: factureData, error: factureError } = await supabase
          .from('factures')
          .select('*')
          .eq('id', invoice.id)
          .single();

        if (factureError) {
          setFetchError(`Facture: ${factureError.message}`);
          return;
        }
        setFacture(factureData);

        // Fetch items separately
        const { data: itemsData, error: itemsError } = await supabase
          .from('facture_items')
          .select('*')
          .eq('facture_id', invoice.id)
          .order('numero_ligne', { ascending: true });

        if (!itemsError && itemsData) {
          setItems(itemsData);
        }

        // Fetch client separately if we have a client_id
        if (factureData?.client_id) {
          const { data: clientData } = await supabase
            .from('clients')
            .select('id, nom, telephone, email, adresse, ville')
            .eq('id', factureData.client_id)
            .single();
          if (clientData) setClient(clientData);
        }
      } catch (err: any) {
        setFetchError(err.message || 'Erreur inconnue');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [invoice.id]);

  const handleGeneratePDF = async () => {
    if (!facture) return;
    setPdfLoading(true);
    try {
      // Build a Facture-compatible object
      const fullFacture = {
        ...facture,
        items,
        client,
        clients: client,
      };
      await generateFacturePDF(fullFacture as any);
      showSuccess('PDF téléchargé avec succès !');
    } catch (error) {
      console.error('PDF Error:', error);
      showError('Erreur lors de la génération du PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const statusColors: Record<string, string> = {
    brouillon: 'bg-slate-100 text-slate-500',
    en_attente: 'bg-amber-50 text-amber-600',
    validee: 'bg-emerald-50 text-emerald-600',
    payee: 'bg-emerald-50 text-emerald-700',
    retard: 'bg-red-50 text-red-500',
    annulee: 'bg-red-50 text-red-400',
  };

  const statusLabels: Record<string, string> = {
    brouillon: 'Brouillon',
    en_attente: 'En attente',
    validee: 'Validée',
    payee: 'Payée',
    retard: 'En retard',
    annulee: 'Annulée',
  };

  const statut = facture?.statut || 'brouillon';

  return (
    <div className="flex flex-col min-h-full bg-[#f5f8f7]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between bg-white border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 active:scale-90 transition-transform">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900">{invoice.type} {invoice.number}</h2>
            {facture && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${statusColors[statut] || 'bg-slate-100 text-slate-500'}`}>
                {statusLabels[statut] || statut}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={handleGeneratePDF}
          disabled={pdfLoading || !facture}
          className="w-10 h-10 flex items-center justify-center rounded-full text-white active:scale-90 transition-all disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #21ac74, #178a5c)' }}
        >
          {pdfLoading
            ? <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            : <Download size={18} />}
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Chargement...</p>
          </div>
        </div>
      ) : fetchError ? (
        <div className="mx-6 mt-6 bg-red-50 border border-red-200 rounded-2xl p-5">
          <p className="text-sm font-bold text-red-600 mb-1">Erreur de chargement</p>
          <p className="text-xs text-red-500 font-mono">{fetchError}</p>
          <p className="text-xs text-slate-500 mt-2">ID facture : {invoice.id}</p>
        </div>
         ) : (
        <div className="flex-1 overflow-y-auto pb-10">
          {/* Summary Card */}
          <div className="mx-6 mt-5 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #f0fdf8, #ecfdf5)' }}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-base ${invoice.color}`}>
                  {invoice.initials}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 truncate">{client?.nom || invoice.client}</p>
                  <p className="text-xs text-slate-500">{facture?.facture_number || invoice.number}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs text-slate-400 mb-0.5 uppercase tracking-tighter font-bold">Total</p>
                <p className="text-xl font-black text-emerald-600">
                  {facture ? formatCurrency(facture.total_general || 0, facture.devise || 'USD') : `$${invoice.amount.toLocaleString()}`}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mx-6 mt-4 flex gap-2">
            {statut === 'en_attente' && (
              <button
                onClick={async () => {
                  try {
                    const { error } = await supabase.from('factures').update({ statut: 'payee' }).eq('id', invoice.id);
                    if (error) throw error;
                    setFacture({ ...facture, statut: 'payee' });
                    showSuccess('Facture marquée comme payée');
                  } catch (e: any) {
                    showError(e.message);
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-xs font-bold active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <BadgeCheck size={14} /> Payer
              </button>
            )}
            {statut === 'brouillon' && (
              <button
                onClick={async () => {
                  try {
                    const { error } = await supabase.from('factures').update({ statut: 'validee' }).eq('id', invoice.id);
                    if (error) throw error;
                    setFacture({ ...facture, statut: 'validee' });
                    showSuccess('Facture validée');
                  } catch (e: any) {
                    showError(e.message);
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-blue-500 text-white text-xs font-bold active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <BadgeCheck size={14} /> Valider
              </button>
            )}
          </div>

          {/* Tabs */}
          <div className="mx-6 mt-4 grid grid-cols-2 bg-white rounded-xl border border-slate-100 p-1">
            {(['details', 'items'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === tab ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500'}`}
              >
                {tab === 'details' ? 'Informations' : `Articles (${items.length})`}
              </button>
            ))}
          </div>

          {activeTab === 'details' && (
            <div className="mx-6 mt-4 space-y-3 pb-6">
              {/* General Info */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Informations générales</p>
                <div className="grid grid-cols-2 gap-4">
                  <InfoRow icon={<Hash size={13} />} label="Numéro" value={facture?.facture_number || invoice.number} />
                  <InfoRow icon={<Calendar size={13} />} label="Date" value={facture?.date_emission ? format(new Date(facture.date_emission), 'dd MMM yyyy', { locale: fr }) : invoice.date} />
                  <InfoRow icon={<Truck size={13} />} label="Livraison" value={facture?.mode_livraison === 'aerien' ? '✈️ Aérien' : '🚢 Maritime'} />
                  <InfoRow icon={<span className="text-xs font-bold">$</span>} label="Devise" value={facture?.devise || 'USD'} />
                </div>
              </div>

              {/* Client Info */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Client</p>
                <div className="flex items-center justify-between mb-3 min-w-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <User size={18} className="text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 truncate">{client?.nom || invoice.client}</p>
                      <p className="text-xs text-slate-500 truncate">{client?.email || 'Pas d\'email'}</p>
                    </div>
                  </div>
                  <button className="p-2 bg-slate-50 rounded-lg text-slate-400">
                    <ExternalLink size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <InfoRow icon="📞" label="Téléphone" value={client?.telephone || '—'} />
                  <InfoRow icon="📍" label="Ville" value={client?.ville || '—'} />
                </div>
              </div>

              {/* Totals */}
              {facture && (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Récapitulatif financier</p>
                  <TotalRow label="Sous-total articles" value={formatCurrency(facture.subtotal || 0, facture.devise)} />
                  <TotalRow label="Poids total" value={`${facture.total_poids || 0} kg`} />
                  <TotalRow label="Frais transport & douane" value={formatCurrency(facture.frais_transport_douane || 0, facture.devise)} />
                  <TotalRow label="Frais de commission" value={formatCurrency(facture.frais || 0, facture.devise)} />
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100 mt-2">
                    <span className="font-black text-slate-900">Total général</span>
                    <span className="font-black text-lg text-emerald-600">{formatCurrency(facture.total_general || 0, facture.devise)}</span>
                  </div>
                </div>
              )}

              {/* Conditions */}
              {facture?.conditions_vente && (
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                    <FileText size={11} /> Conditions de vente
                  </p>
                  <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{facture.conditions_vente}</p>
                </div>
              )}

              {/* Notes */}
              {facture?.notes && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1.5">Notes internes</p>
                  <p className="text-xs text-slate-700 leading-relaxed">{facture.notes}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'items' && (
            <div className="mx-6 mt-4 space-y-3 pb-6">
              {items.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
                  <Package size={40} className="text-slate-200 mx-auto mb-3" />
                  <p className="text-slate-400 font-bold text-sm">Aucun article</p>
                </div>
              ) : (
                items.map((item, i) => (
                  <div key={item.id || i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                    <div className="p-4">
                      <div className="flex gap-3">
                        {item.image_url ? (
                          <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-50 flex-shrink-0">
                            <ImagePreview
                              url={item.image_url}
                              alt={item.description || 'Article'}
                              size="sm"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0 border border-slate-100">
                            <Package size={22} className="text-slate-200" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-bold text-slate-900 leading-tight line-clamp-2">{item.description || '—'}</p>
                            {item.product_url && (
                              <a href={item.product_url} target="_blank" rel="noopener noreferrer" className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 flex-shrink-0">
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2">
                             <div className="flex items-center gap-1">
                               <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Qté</span>
                               <span className="text-xs font-bold text-slate-600">{item.quantite}</span>
                             </div>
                             <div className="flex items-center gap-1">
                               <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Poids</span>
                               <span className="text-xs font-bold text-slate-600">{item.poids} kg</span>
                             </div>
                             <div className="flex items-center gap-1">
                               <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">P.U.</span>
                               <span className="text-xs font-bold text-slate-600">{formatCurrency(item.prix_unitaire, facture?.devise || 'USD')}</span>
                             </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-50 flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ligne #{item.numero_ligne}</span>
                      <span className="font-black text-emerald-600">{formatCurrency(item.montant_total, facture?.devise || 'USD')}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {/* PDF Button */}
          <div className="mx-6 mt-5 bg-white/50 p-4 rounded-2xl border border-dashed border-slate-200">
            <button
              onClick={handleGeneratePDF}
              disabled={pdfLoading || !facture}
              className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50 shadow-md"
              style={{ background: 'linear-gradient(135deg, #21ac74, #178a5c)' }}
            >
              {pdfLoading
                ? <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Génération...</>
                : <><Download size={18} /> Télécharger le PDF</>
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Sub-components
const InfoRow = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
  <div className="flex items-start gap-2">
    <div className="text-emerald-500 mt-0.5 flex-shrink-0 text-sm">{icon}</div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-bold text-slate-800 truncate">{value}</p>
    </div>
  </div>
);

const TotalRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center py-1.5">
    <span className="text-sm text-slate-500">{label}</span>
    <span className="text-sm font-bold text-slate-700">{value}</span>
  </div>
);
