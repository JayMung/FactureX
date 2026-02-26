import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Edit,
  Download,
  ExternalLink,
  FileText,
  User,
  Calendar,
  Clock,
  DollarSign,
  Package,
  AlertCircle,
  CheckCircle,
  X,
  History,
  List,
  FileSearch,
  Image as ImageIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatCurrency';
import { generateFacturePDF } from '@/utils/pdfGenerator';
import { showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { useClientPayerHealth, getHealthColor, getHealthLabel } from '@/hooks/useClientPayerHealth';
import ImagePreview from '@/components/ui/ImagePreview';
import type { Facture, FactureItem } from '@/types';

interface FactureQuickViewProps {
  facture: Facture | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (facture: Facture) => void;
}

const STATUT_CONFIG: Record<string, { label: string; className: string }> = {
  brouillon:          { label: 'Brouillon',       className: 'bg-gray-100 text-gray-800' },
  en_attente:         { label: 'En attente',       className: 'bg-yellow-100 text-yellow-800' },
  validee:            { label: 'Validée',           className: 'bg-green-100 text-green-800' },
  envoyee:            { label: 'Envoyée',           className: 'bg-indigo-100 text-indigo-800' },
  payee:              { label: 'Payée',             className: 'bg-blue-100 text-blue-800' },
  partiellement_payee:{ label: 'Part. payée',       className: 'bg-purple-100 text-purple-800' },
  annulee:            { label: 'Annulée',           className: 'bg-red-100 text-red-800' },
};

interface ActivityLogEntry {
  id: string;
  action: string;
  created_at: string;
  user_id?: string;
  details?: any;
}

const FactureQuickView: React.FC<FactureQuickViewProps> = ({ facture, open, onClose, onEdit }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'pdf'>('details');
  const [items, setItems] = useState<FactureItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [timeline, setTimeline] = useState<ActivityLogEntry[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loadingPdf, setLoadingPdf] = useState(false);
  const clientId = facture?.clients?.id ?? (facture as any)?.client_id;
  const { data: payerHealth } = useClientPayerHealth(open ? clientId : undefined);

  useEffect(() => {
    if (pdfUrl) { URL.revokeObjectURL(pdfUrl); setPdfUrl(null); }
    if (!facture || !open) { setItems([]); setTimeline([]); setActiveTab('details'); return; }
    setLoadingItems(true);
    supabase
      .from('facture_items')
      .select('*')
      .eq('facture_id', facture.id)
      .order('numero_ligne', { ascending: true })
      .then(({ data }) => {
        setItems(data || []);
        setLoadingItems(false);
      });
  }, [facture?.id, open]);

  useEffect(() => {
    if (!facture || !open || activeTab !== 'timeline') return;
    setLoadingTimeline(true);
    supabase
      .from('activity_logs')
      .select('id, action, created_at, user_id, details')
      .eq('cible_id', facture.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setTimeline(data || []);
        setLoadingTimeline(false);
      });
  }, [facture?.id, open, activeTab]);

  useEffect(() => {
    if (!facture || !open || activeTab !== 'pdf') return;
    if (pdfUrl) return;
    setLoadingPdf(true);
    generateFacturePDF({ ...facture, items } as any, true)
      .then((blob) => {
        if (blob instanceof Blob) {
          setPdfUrl(URL.createObjectURL(blob));
        }
      })
      .catch(() => showError('Erreur lors de la génération de l\'aperçu PDF'))
      .finally(() => setLoadingPdf(false));
  }, [facture?.id, open, activeTab, items]);

  const handleDownloadPDF = async () => {
    if (!facture) return;
    setDownloadingPDF(true);
    try {
      await generateFacturePDF({ ...facture, items } as any);
    } catch {
      showError('Erreur lors de la génération du PDF');
    } finally {
      setDownloadingPDF(false);
    }
  };

  if (!facture) return null;

  const statutConfig = STATUT_CONFIG[facture.statut] ?? STATUT_CONFIG.brouillon;
  const isLate = (facture as any).est_en_retard;
  const solde = (facture as any).solde_restant ?? facture.total_general;
  const montantPaye = (facture as any).montant_paye ?? 0;
  const dateEcheance = (facture as any).date_echeance;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0 gap-0">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="text-lg font-bold text-gray-900 truncate">
                {facture.facture_number}
              </SheetTitle>
              <p className="text-sm text-gray-500 mt-0.5">
                {facture.type === 'devis' ? 'Devis' : 'Facture'}
                {' · '}
                {facture.mode_livraison === 'aerien' ? '✈️ Aérien' : '🚢 Maritime'}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge className={statutConfig.className}>{statutConfig.label}</Badge>
              {isLate && (
                <Badge className="bg-red-100 text-red-700">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  En retard
                </Badge>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Tab navigation */}
        <div className="flex border-b bg-white shrink-0">
          <button
            onClick={() => setActiveTab('details')}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'details'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <List className="h-4 w-4" />
            Détails
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'timeline'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <History className="h-4 w-4" />
            Historique
          </button>
          <button
            onClick={() => setActiveTab('pdf')}
            className={cn(
              'flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors',
              activeTab === 'pdf'
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            <FileSearch className="h-4 w-4" />
            Aperçu PDF
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* ── PDF PREVIEW TAB ── */}
          {activeTab === 'pdf' && (
            <div className="flex flex-col h-full" style={{ minHeight: '60vh' }}>
              {loadingPdf ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-3 py-16">
                  <div className="h-10 w-10 rounded-full border-2 border-green-600 border-t-transparent animate-spin" />
                  <p className="text-sm text-gray-500">Génération de l'aperçu...</p>
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={pdfUrl}
                  className="w-full flex-1 rounded-lg border border-gray-200"
                  style={{ minHeight: '60vh' }}
                  title={`Aperçu ${facture.facture_number}`}
                />
              ) : (
                <div className="flex flex-col items-center justify-center flex-1 gap-3 py-16">
                  <FileSearch className="h-10 w-10 text-gray-300" />
                  <p className="text-sm text-gray-400">Impossible de charger l'aperçu</p>
                </div>
              )}
            </div>
          )}

          {/* ── TIMELINE TAB ── */}
          {activeTab === 'timeline' && (
            <div className="space-y-1 pt-1">
              {loadingTimeline ? (
                <div className="space-y-3">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="flex gap-3">
                      <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5 pt-1">
                        <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                        <div className="h-2.5 bg-gray-100 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : timeline.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">Aucun historique disponible</p>
                </div>
              ) : (
                <ol className="relative border-l border-gray-200 ml-3 space-y-6 py-2">
                  {timeline.map((entry) => {
                    const isCreate = entry.action === 'CREATE';
                    const isDelete = entry.action === 'DELETE';
                    const dotColor = isCreate ? 'bg-emerald-500' : isDelete ? 'bg-red-500' : 'bg-blue-500';
                    return (
                      <li key={entry.id} className="ml-6">
                        <span className={cn(
                          'absolute -left-1.5 flex h-3 w-3 items-center justify-center rounded-full ring-2 ring-white',
                          dotColor
                        )} />
                        <p className="text-sm font-medium text-gray-800">{entry.action}</p>
                        <time className="text-xs text-gray-400">
                          {new Date(entry.created_at).toLocaleString('fr-FR', {
                            day: '2-digit', month: 'short', year: 'numeric',
                            hour: '2-digit', minute: '2-digit'
                          })}
                        </time>
                        {entry.details && Object.keys(entry.details).length > 0 && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate">
                            {Object.entries(entry.details)
                              .filter(([k]) => !['id','organization_id'].includes(k))
                              .slice(0, 3)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(' · ')}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          )}

          {/* ── DETAILS TAB ── */}
          {activeTab === 'details' && <div className="space-y-6">

          {/* Client */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Client</h3>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <button
                    className="font-semibold text-blue-600 hover:underline text-sm"
                    onClick={() => { onClose(); navigate(`/clients/${facture.clients?.id ?? (facture as any).client_id}`); }}
                  >
                    {facture.clients?.nom ?? 'N/A'}
                  </button>
                  {payerHealth && payerHealth.health !== 'unknown' && (
                    <span
                      className={cn('inline-block h-2.5 w-2.5 rounded-full shrink-0', getHealthColor(payerHealth.health))}
                      title={`${getHealthLabel(payerHealth.health)} — ${payerHealth.tauxRetard}% de retard (${payerHealth.facturesEnRetard}/${payerHealth.totalFactures} factures)`}
                    />
                  )}
                </div>
                {facture.clients?.telephone && (
                  <p className="text-xs text-gray-500">{facture.clients.telephone}</p>
                )}
                {payerHealth && payerHealth.health !== 'unknown' && (
                  <p className={cn('text-xs mt-0.5', payerHealth.health === 'good' ? 'text-emerald-600' : payerHealth.health === 'warning' ? 'text-yellow-600' : 'text-red-600')}>
                    {getHealthLabel(payerHealth.health)}
                    {payerHealth.totalFactures > 0 && ` · ${payerHealth.tauxRetard}% retard`}
                  </p>
                )}
              </div>
            </div>
          </section>

          <Separator />

          {/* Dates */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Dates</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Émission</p>
                  <p className="text-sm font-medium">
                    {new Date(facture.date_emission).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
              {dateEcheance && (
                <div className="flex items-center gap-2">
                  <Clock className={cn('h-4 w-4 shrink-0', isLate ? 'text-red-500' : 'text-gray-400')} />
                  <div>
                    <p className="text-xs text-gray-400">Échéance</p>
                    <p className={cn('text-sm font-medium', isLate ? 'text-red-600' : '')}>
                      {new Date(dateEcheance).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Financier */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Financier</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Sous-total</span>
                <span className="font-medium">{formatCurrency(facture.subtotal ?? 0, facture.devise)}</span>
              </div>
              {(facture.frais ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Frais commission</span>
                  <span className="font-medium">{formatCurrency(facture.frais ?? 0, facture.devise)}</span>
                </div>
              )}
              {(facture.frais_transport_douane ?? 0) > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Transport & douane</span>
                  <span className="font-medium">{formatCurrency(facture.frais_transport_douane ?? 0, facture.devise)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-sm font-semibold">
                <span>Total général</span>
                <span className="text-green-600">{formatCurrency(facture.total_general, facture.devise)}</span>
              </div>
              {montantPaye > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                    Montant payé
                  </span>
                  <span className="text-emerald-600 font-medium">{formatCurrency(montantPaye, facture.devise)}</span>
                </div>
              )}
              {solde > 0 && (
                <div className={cn(
                  'flex justify-between text-sm font-semibold rounded-lg px-3 py-2',
                  isLate ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
                )}>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />
                    Reste à payer
                  </span>
                  <span>{formatCurrency(solde, facture.devise)}</span>
                </div>
              )}
              {solde <= 0 && (
                <div className="flex justify-between text-sm font-semibold rounded-lg px-3 py-2 bg-emerald-50 text-emerald-700">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5" />
                    Soldé
                  </span>
                  <span>✓</span>
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Articles */}
          <section>
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
              Articles ({items.length})
            </h3>
            {loadingItems ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Aucun article</p>
            ) : (
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={item.id ?? idx} className="flex gap-3 py-2 border-b border-gray-100 last:border-0">
                    {/* Image */}
                    <div className="flex-shrink-0">
                      {item.image_url ? (
                        <ImagePreview 
                          url={item.image_url} 
                          alt={`Article ${item.numero_ligne}`}
                          size="sm"
                          className="border rounded w-16 h-16"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded flex items-center justify-center">
                          <ImageIcon className="h-6 w-6 text-gray-400" />
                        </div>
                      )}
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800">{item.description}</p>
                      <p className="text-xs text-gray-400">
                        {item.quantite} × {formatCurrency(item.prix_unitaire, facture.devise)}
                        {item.poids > 0 && ` · ${item.poids} kg`}
                      </p>
                      {item.product_url && (
                        <a
                          href={item.product_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-green-600 hover:text-green-700 mt-1"
                        >
                          <ExternalLink className="h-3 w-3" />
                          Voir le produit
                        </a>
                      )}
                    </div>
                    {/* Amount */}
                    <div className="flex-shrink-0 text-right">
                      <span className="font-semibold text-gray-700">
                        {formatCurrency(item.montant_total, facture.devise)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Notes */}
          {facture.notes && (
            <>
              <Separator />
              <section>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Notes</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{facture.notes}</p>
              </section>
            </>
          )}
          </div>}
        </div>

        {/* Footer actions */}
        <div className="border-t px-6 py-4 bg-gray-50 flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            disabled={downloadingPDF}
            className="flex-1 sm:flex-none"
          >
            <Download className="h-4 w-4 mr-2" />
            {downloadingPDF ? 'Génération...' : 'PDF'}
          </Button>

          {onEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => { onClose(); onEdit(facture); }}
              className="flex-1 sm:flex-none"
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </Button>
          )}

          <Button
            size="sm"
            onClick={() => { onClose(); navigate(`/factures/view/${facture.id}`); }}
            className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Vue complète
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FactureQuickView;
