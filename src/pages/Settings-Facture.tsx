"use client";

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Plane,
  Ship,
  Loader2,
  FileText
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';


export const SettingsFacture = () => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // États pour les frais de livraison
  const [shippingSettings, setShippingSettings] = useState({
    frais_aerien_par_kg: '',
    frais_maritime_par_cbm: ''
  });

  // État pour les conditions de vente
  const [conditionsVente, setConditionsVente] = useState({
    aerien: '',
    maritime: ''
  });

  // État pour les informations bancaires
  const [informationsBancaires, setInformationsBancaires] = useState('');

  // Charger les paramètres depuis la base de données
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data } = await supabase
        .from('settings')
        .select('*')
        .in('categorie', ['shipping', 'facture']);

      if (data) {
        // Charger frais livraison
        const shippingData = data.filter(s => s.categorie === 'shipping');
        const shipping: any = {};
        shippingData.forEach(item => {
          shipping[item.cle] = item.valeur;
        });
        setShippingSettings(prev => ({ ...prev, ...shipping }));

        // Charger conditions de vente et informations bancaires
        const factureData = data.filter(s => s.categorie === 'facture');
        const conditions: any = {};
        factureData.forEach(item => {
          if (item.cle === 'conditions_vente_aerien') {
            conditions.aerien = item.valeur;
          } else if (item.cle === 'conditions_vente_maritime') {
            conditions.maritime = item.valeur;
          } else if (item.cle === 'informations_bancaires') {
            setInformationsBancaires(item.valeur);
          }
        });
        setConditionsVente(prev => ({ ...prev, ...conditions }));
      }
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      showError('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShippingSettings = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(shippingSettings).map(([cle, valeur]) => ({
        categorie: 'shipping',
        cle,
        valeur: valeur || ''
      }));

      const { error } = await supabase
        .from('settings')
        .upsert(updates, { onConflict: 'categorie,cle' });

      if (error) throw error;
      showSuccess('Frais de livraison sauvegardés');
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConditionsVente = async () => {
    setSaving(true);
    try {
      const updates = [
        {
          categorie: 'facture',
          cle: 'conditions_vente_aerien',
          valeur: conditionsVente.aerien || ''
        },
        {
          categorie: 'facture',
          cle: 'conditions_vente_maritime',
          valeur: conditionsVente.maritime || ''
        }
      ];

      const { error } = await supabase
        .from('settings')
        .upsert(updates, { onConflict: 'categorie,cle' });

      if (error) throw error;
      showSuccess('Conditions de vente sauvegardées');
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveInformationsBancaires = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert([{
          categorie: 'facture',
          cle: 'informations_bancaires',
          valeur: informationsBancaires || ''
        }], { onConflict: 'categorie,cle' });

      if (error) throw error;
      showSuccess('Informations bancaires sauvegardées');
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Frais de Livraison */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-blue-500 to-blue-600">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Ship className="h-5 w-5" />
            Frais de Livraison
          </h3>
          <p className="text-blue-100 text-sm mt-1">Configurez les tarifs par kilogramme et par m³</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 p-4 border border-blue-100 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-blue-500 text-white">
                  <Plane className="h-4 w-4" />
                </div>
                <Label className="font-medium text-gray-700 dark:text-gray-300">Voie Aérienne</Label>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={shippingSettings.frais_aerien_par_kg}
                  onChange={(e) => setShippingSettings(prev => ({ ...prev, frais_aerien_par_kg: e.target.value }))}
                  placeholder="16"
                  className="pl-8 pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">/kg</span>
              </div>
            </div>
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 p-4 border border-indigo-100 dark:border-indigo-800">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-lg bg-indigo-500 text-white">
                  <Ship className="h-4 w-4" />
                </div>
                <Label className="font-medium text-gray-700 dark:text-gray-300">Voie Maritime</Label>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={shippingSettings.frais_maritime_par_cbm}
                  onChange={(e) => setShippingSettings(prev => ({ ...prev, frais_maritime_par_cbm: e.target.value }))}
                  placeholder="450"
                  className="pl-8 pr-16"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">/cbm</span>
              </div>
            </div>
          </div>
          <Button onClick={handleSaveShippingSettings} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sauvegarder les frais
          </Button>
        </div>
      </div>

      {/* Informations bancaires */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-emerald-500 to-emerald-600">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Informations bancaires
          </h3>
          <p className="text-emerald-100 text-sm mt-1">Ces informations apparaîtront en pied de page des factures</p>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <Textarea
              value={informationsBancaires}
              onChange={(e) => setInformationsBancaires(e.target.value)}
              placeholder="Ex: EQUITY BCDC | 0001105023-32000099001-60 | COCCINELLE&#10;RAWBANK | 65101-00941018001-91 | COCCINELLE SARL"
              rows={4}
              className="font-mono text-sm bg-gray-50 dark:bg-gray-800"
            />
            <p className="text-sm text-gray-500 mt-2">
              Utilisez des retours à la ligne pour séparer les différentes banques.
            </p>
          </div>
          <Button onClick={handleSaveInformationsBancaires} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sauvegarder les informations
          </Button>
        </div>
      </div>

      {/* Conditions de vente */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gradient-to-r from-purple-500 to-purple-600">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Conditions de vente par défaut
          </h3>
          <p className="text-purple-100 text-sm mt-1">Pré-remplies selon le mode de livraison lors de la création de factures</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="rounded-lg bg-sky-50 dark:bg-sky-900/20 p-4 border border-sky-100 dark:border-sky-800">
            <Label className="flex items-center text-sky-700 dark:text-sky-300 font-medium mb-2">
              <Plane className="mr-2 h-4 w-4" />
              Conditions de vente - Voie Aérienne
            </Label>
            <Textarea
              value={conditionsVente.aerien}
              onChange={(e) => setConditionsVente(prev => ({ ...prev, aerien: e.target.value }))}
              placeholder="Ex: Paiement à la livraison, Délai 7-10 jours, Garantie 30 jours..."
              rows={4}
              className="bg-white dark:bg-gray-800"
            />
          </div>
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-900/20 p-4 border border-indigo-100 dark:border-indigo-800">
            <Label className="flex items-center text-indigo-700 dark:text-indigo-300 font-medium mb-2">
              <Ship className="mr-2 h-4 w-4" />
              Conditions de vente - Voie Maritime
            </Label>
            <Textarea
              value={conditionsVente.maritime}
              onChange={(e) => setConditionsVente(prev => ({ ...prev, maritime: e.target.value }))}
              placeholder="Ex: Paiement 50% à la commande, Délai 45-60 jours, Garantie 30 jours..."
              rows={4}
              className="bg-white dark:bg-gray-800"
            />
          </div>
          <p className="text-sm text-gray-500">
            Vous pourrez les modifier individuellement pour chaque facture.
          </p>
          <Button onClick={handleSaveConditionsVente} disabled={saving} className="bg-emerald-500 hover:bg-emerald-600">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sauvegarder les conditions
          </Button>
        </div>
      </div>
    </div>
  );
};
