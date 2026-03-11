import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft, Users, Calendar, Plane, Ship, Plus, Trash2,
  Link, Image, FileText, Save, ChevronDown, ChevronUp
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useFactures } from '@/hooks/useFactures';
import { formatCurrency } from '@/utils/formatCurrency';
import ImagePreview from '@/components/ui/ImagePreview';
import type { Client, FactureItem, CreateFactureData } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { validateFactureForm } from '@/lib/validation';

interface FactureItemForm {
  tempId: string;
  numero_ligne: number;
  description: string;
  quantite: number;
  prix_unitaire: number;
  poids: number;
  montant_total: number;
  image_url: string;
  product_url: string;
}

const emptyItem = (n: number): FactureItemForm => ({
  tempId: Date.now().toString() + n,
  numero_ligne: n,
  description: '',
  quantite: 1,
  prix_unitaire: 0,
  poids: 0,
  montant_total: 0,
  image_url: '',
  product_url: '',
});

interface CreateInvoicePageProps {
  clients: any[];
  nextNumber: string;
  onBack: () => void;
  onSave: (data: any) => void;
}

export const CreateInvoicePage = ({ clients, nextNumber, onBack, onSave }: CreateInvoicePageProps) => {
  const { createFacture } = useFactures();

  const [formData, setFormData] = useState({
    client_id: '',
    type: 'devis' as 'devis' | 'facture',
    mode_livraison: 'aerien' as 'aerien' | 'maritime',
    devise: 'USD' as 'USD' | 'CDF' | 'CNY',
    date_emission: new Date().toISOString().split('T')[0],
    date_echeance: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    conditions_vente: '',
    notes: '',
  });

  const [items, setItems] = useState<FactureItemForm[]>([emptyItem(1)]);
  const [loading, setLoading] = useState(false);
  const [allClients, setAllClients] = useState<any[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [shippingSettings, setShippingSettings] = useState({ aerien: 16, maritime: 450 });
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [clientSearch, setClientSearch] = useState('');
  const [showClientDropdown, setShowClientDropdown] = useState(false);

  // Fetch ALL clients directly (no pagination limit) + shipping settings
  useEffect(() => {
    const load = async () => {
      const [clientsRes, settingsRes] = await Promise.all([
        supabase.from('clients').select('id, nom, telephone, email, ville, type').order('nom'),
        supabase.from('settings').select('cle, valeur').in('cle', [
          'frais_livraison_aerien', 'frais_livraison_maritime', 'conditions_vente_defaut'
        ])
      ]);

      if (clientsRes.data && clientsRes.data.length > 0) {
        setAllClients(clientsRes.data);
      } else {
        // Fallback to prop if fetch fails
        setAllClients(clients);
      }
      setClientsLoading(false);

      if (settingsRes.data) {
        const settings = Object.fromEntries(settingsRes.data.map(s => [s.cle, s.valeur]));
        setShippingSettings({
          aerien: parseFloat(settings['frais_livraison_aerien'] || '16'),
          maritime: parseFloat(settings['frais_livraison_maritime'] || '450'),
        });
        if (settings['conditions_vente_defaut']) {
          setFormData(p => ({ ...p, conditions_vente: settings['conditions_vente_defaut'] }));
        }
      }
    };
    load();
  }, []);

  // Totals calculation
  const totals = useMemo(() => {
    const subtotal = items.reduce((s, i) => s + i.montant_total, 0);
    const totalPoids = items.reduce((s, i) => s + i.poids, 0);
    const rate = formData.mode_livraison === 'aerien' ? shippingSettings.aerien : shippingSettings.maritime;
    const fraisTransport = totalPoids * rate;
    return { subtotal, totalPoids, fraisTransport, totalGeneral: subtotal + fraisTransport };
  }, [items, formData.mode_livraison, shippingSettings]);

  // Use the full allClients list for selection and search
  const selectedClient = allClients.find(c => c.id === formData.client_id);

  const filteredClients = useMemo(() => {
    if (!clientSearch) return [];
    const source = allClients.length > 0 ? allClients : clients;
    return source.filter(c => {
      const name = c.name || c.nom || '';
      const email = c.email || '';
      const phone = c.phone || c.telephone || '';
      return name.toLowerCase().includes(clientSearch.toLowerCase()) ||
             email.toLowerCase().includes(clientSearch.toLowerCase()) ||
             phone.toLowerCase().includes(clientSearch.toLowerCase());
    }).slice(0, 10);
  }, [allClients, clients, clientSearch]);

  const updateItem = (tempId: string, field: keyof FactureItemForm, value: any) => {
    setItems(prev => prev.map(item => {
      if (item.tempId !== tempId) return item;
      const updated = { ...item, [field]: value };
      if (field === 'prix_unitaire' || field === 'quantite') {
        updated.montant_total = updated.prix_unitaire * updated.quantite;
      }
      return updated;
    }));
  };

  const addItem = () => {
    const n = items.length + 1;
    const newItem = emptyItem(n);
    setItems(p => [...p, newItem]);
    // Auto-expand new item
    setExpandedItems(p => new Set([...p, newItem.tempId]));
  };

  const removeItem = (tempId: string) => {
    if (items.length === 1) return;
    setItems(prev =>
      prev.filter(i => i.tempId !== tempId).map((i, idx) => ({ ...i, numero_ligne: idx + 1 }))
    );
    setExpandedItems(p => { const n = new Set(p); n.delete(tempId); return n; });
  };

  const toggleExpand = (tempId: string) => {
    setExpandedItems(p => {
      const n = new Set(p);
      n.has(tempId) ? n.delete(tempId) : n.add(tempId);
      return n;
    });
  };

  const handleSave = async () => {
    if (!formData.client_id) { showError('Veuillez sélectionner un client'); return; }
    if (items.some(i => !i.description.trim())) { showError('Chaque article doit avoir une description'); return; }

    setLoading(true);
    try {
      const factureData = {
        ...formData,
        items: items.map(i => ({
          numero_ligne: i.numero_ligne,
          description: i.description,
          quantite: i.quantite,
          prix_unitaire: i.prix_unitaire,
          poids: i.poids,
          montant_total: i.montant_total,
          image_url: i.image_url || '',
          product_url: i.product_url || '',
        })),
      };

      const validation = validateFactureForm(factureData as any);
      if (!validation.isValid) {
        showError(validation.errors?.[0] || 'Erreur de validation');
        return;
      }

      await createFacture(factureData as any);
      showSuccess(`${formData.type === 'devis' ? 'Devis' : 'Facture'} créé(e) avec succès !`);
      onSave({
        client: selectedClient?.nom || '',
        initials: (selectedClient?.nom || 'IN').substring(0, 2).toUpperCase(),
        color: 'bg-emerald-100 text-emerald-600',
        number: nextNumber,
        amount: totals.totalGeneral,
        date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
      });
      onBack();
    } catch (err: any) {
      showError(err.message || 'Erreur lors de la création');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-400/30 transition-all';
  const labelClass = 'text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5';

  return (
    <div className="flex flex-col min-h-full bg-[#f5f8f7]">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 active:scale-90 transition-transform">
            <ArrowLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-slate-900">Nouvelle Facture</h2>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 active:scale-95 transition-all"
          style={{ background: 'linear-gradient(135deg, #21ac74, #178a5c)' }}
        >
          {loading ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
          {loading ? 'Sauvegarde...' : 'Enregistrer'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-10 space-y-4 pt-4">

        {/* ── 1. General Section ── */}
        <div className="mx-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Informations générales</p>

          {/* Type */}
          <div>
            <label className={labelClass}>Type de document</label>
            <div className="grid grid-cols-2 gap-2">
              {(['devis', 'facture'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, type: t }))}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                    formData.type === t
                      ? 'bg-emerald-500 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-500 border border-slate-200'
                  }`}
                >
                  {t === 'devis' ? '📄 Devis' : '📋 Facture'}
                </button>
              ))}
            </div>
          </div>

          {/* Client */}
          <div className="relative">
            <label className={labelClass}>Client *</label>
            <div
              className={`${inputClass} flex items-center gap-2 cursor-pointer`}
              onClick={() => { setShowClientDropdown(v => !v); setClientSearch(''); }}
            >
              <Users size={16} className="text-slate-400 flex-shrink-0" />
              <span className={selectedClient ? 'text-slate-900 font-bold' : 'text-slate-400'}>
                {clientsLoading ? 'Chargement...' : selectedClient ? selectedClient.nom : `Sélectionner (${allClients.length} clients)...`}
              </span>
            </div>
            {showClientDropdown && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-2 border-b border-slate-100">
                  <input
                    autoFocus
                    type="text"
                    placeholder="Chercher..."
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 outline-none"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredClients.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-4 py-3 text-sm hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                      onClick={() => {
                        setFormData(p => ({ ...p, client_id: c.id }));
                        setShowClientDropdown(false);
                        setClientSearch('');
                      }}
                    >
                      <div className="font-bold text-slate-900">{c.nom}</div>
                      {c.ville && <div className="text-xs text-slate-400">{c.ville}</div>}
                    </button>
                  ))}
                  {filteredClients.length === 0 && (
                    <p className="text-center text-slate-400 text-sm py-4">Aucun résultat</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Client info mini card */}
          {selectedClient && (
            <div className="bg-emerald-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center font-bold text-emerald-700 text-sm flex-shrink-0">
                {(selectedClient.nom || 'IN').substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-emerald-900 text-sm truncate">{selectedClient.nom}</p>
                <p className="text-xs text-emerald-600">{selectedClient.telephone || ''} {selectedClient.ville ? `• ${selectedClient.ville}` : ''}</p>
              </div>
            </div>
          )}

          {/* Mode livraison */}
          <div>
            <label className={labelClass}>Mode de livraison</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, mode_livraison: 'aerien' }))}
                className={`py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  formData.mode_livraison === 'aerien'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-500 border border-slate-200'
                }`}
              >
                <Plane size={15} /> Aérien
              </button>
              <button
                type="button"
                onClick={() => setFormData(p => ({ ...p, mode_livraison: 'maritime' }))}
                className={`py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  formData.mode_livraison === 'maritime'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-500 border border-slate-200'
                }`}
              >
                <Ship size={15} /> Maritime
              </button>
            </div>
          </div>

          {/* Devise */}
          <div>
            <label className={labelClass}>Devise</label>
            <div className="grid grid-cols-3 gap-2">
              {(['USD', 'CDF', 'CNY'] as const).map(d => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFormData(p => ({ ...p, devise: d }))}
                  className={`py-2.5 rounded-xl text-sm font-bold transition-all ${
                    formData.devise === d
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'bg-slate-50 text-slate-500 border border-slate-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Date d'émission</label>
              <input
                type="date"
                value={formData.date_emission}
                onChange={e => setFormData(p => ({ ...p, date_emission: e.target.value }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Date d'échéance</label>
              <input
                type="date"
                value={formData.date_echeance}
                onChange={e => setFormData(p => ({ ...p, date_echeance: e.target.value }))}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* ── 2. Articles ── */}
        <div className="mx-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Articles ({items.length})</p>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl active:scale-95 transition-all"
            >
              <Plus size={14} /> Ajouter
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item) => {
              const isExpanded = expandedItems.has(item.tempId);
              return (
                <div key={item.tempId} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  {/* Item header (always visible) */}
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      {item.image_url ? (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-100 flex-shrink-0">
                          <ImagePreview url={item.image_url} alt={item.description} size="sm" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-black flex-shrink-0">
                          {item.numero_ligne}
                        </span>
                      )}
                      <input
                        placeholder="Description du produit *"
                        value={item.description}
                        onChange={e => updateItem(item.tempId, 'description', e.target.value)}
                        className="flex-1 text-sm font-bold text-slate-900 focus:outline-none placeholder:font-normal placeholder:text-slate-400"
                      />
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleExpand(item.tempId)}
                          className="w-7 h-7 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400"
                        >
                          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeItem(item.tempId)}
                          disabled={items.length === 1}
                          className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-400 disabled:opacity-30"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Key fields: qty, price, poids, montant */}
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-slate-50 rounded-xl p-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide mb-1">Qté</p>
                        <input
                          type="number" min="1"
                          value={item.quantite}
                          onChange={e => updateItem(item.tempId, 'quantite', parseInt(e.target.value) || 0)}
                          className="w-full text-sm font-bold text-slate-900 bg-transparent focus:outline-none"
                        />
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide mb-1">P.U.</p>
                        <input
                          type="number" min="0" step="0.01"
                          value={item.prix_unitaire}
                          onChange={e => updateItem(item.tempId, 'prix_unitaire', parseFloat(e.target.value) || 0)}
                          className="w-full text-sm font-bold text-slate-900 bg-transparent focus:outline-none"
                        />
                      </div>
                      <div className="bg-slate-50 rounded-xl p-2">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-wide mb-1">Poids (kg)</p>
                        <input
                          type="number" min="0" step="0.01"
                          value={item.poids}
                          onChange={e => updateItem(item.tempId, 'poids', parseFloat(e.target.value) || 0)}
                          className="w-full text-sm font-bold text-slate-900 bg-transparent focus:outline-none"
                        />
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-2">
                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-wide mb-1">Total</p>
                        <p className="text-sm font-black text-emerald-600 truncate">
                          {formatCurrency(item.montant_total, formData.devise)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Expanded: image_url and product_url */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-0 border-t border-slate-50 space-y-3">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                          <Image size={11} /> URL Image du produit
                        </label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={item.image_url}
                          onChange={e => updateItem(item.tempId, 'image_url', e.target.value)}
                          className="w-full text-xs text-slate-700 bg-slate-50 rounded-xl px-3 py-2 focus:outline-none border border-slate-100"
                        />
                        {item.image_url && (
                          <div className="mt-2">
                            <ImagePreview url={item.image_url} alt="Aperçu" size="md" className="rounded-xl border border-slate-100 shadow-sm" />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-wide flex items-center gap-1 mb-1.5">
                          <Link size={11} /> Lien du produit
                        </label>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={item.product_url}
                          onChange={e => updateItem(item.tempId, 'product_url', e.target.value)}
                          className="w-full text-xs text-slate-700 bg-slate-50 rounded-xl px-3 py-2 focus:outline-none border border-slate-100"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── 3. Totals ── */}
        <div className="mx-6 bg-slate-900 rounded-2xl p-5 space-y-2 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Récapitulatif</p>
          <TotalLine label="Sous-total" value={formatCurrency(totals.subtotal, formData.devise)} />
          <TotalLine label={`Poids total`} value={`${totals.totalPoids.toFixed(2)} kg`} />
          <TotalLine
            label={`Transport (${formData.mode_livraison === 'aerien' ? shippingSettings.aerien : shippingSettings.maritime} ${formData.devise}/kg)`}
            value={formatCurrency(totals.fraisTransport, formData.devise)}
          />
          <div className="border-t border-white/10 pt-2 flex justify-between items-center">
            <span className="font-black text-white">Total général</span>
            <span className="font-black text-xl text-emerald-400">{formatCurrency(totals.totalGeneral, formData.devise)}</span>
          </div>
        </div>

        {/* ── 4. Conditions & Notes ── */}
        <div className="mx-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
          <div>
            <label className={labelClass}>Conditions de vente</label>
            <textarea
              value={formData.conditions_vente}
              onChange={e => setFormData(p => ({ ...p, conditions_vente: e.target.value }))}
              placeholder="Conditions de vente..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 resize-none"
            />
          </div>
          <div>
            <label className={labelClass}>Notes internes</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              placeholder="Notes..."
              rows={2}
              className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 resize-none"
            />
          </div>
        </div>

        {/* ── 5. Submit ── */}
        <div className="mx-6">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="w-full py-4 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #21ac74, #178a5c)' }}
          >
            {loading
              ? <><div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Sauvegarde...</>
              : <><Save size={18} />Créer le {formData.type === 'devis' ? 'devis' : 'la facture'}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

const TotalLine = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-slate-400">{label}</span>
    <span className="text-sm font-bold text-white">{value}</span>
  </div>
);
