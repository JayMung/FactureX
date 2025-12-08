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
      <Card>
        <CardHeader>
          <CardTitle>Frais de Livraison</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center">
                <Plane className="mr-2 h-4 w-4" />
                Voie Aérienne (USD/kg)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={shippingSettings.frais_aerien_par_kg}
                onChange={(e) => setShippingSettings(prev => ({ ...prev, frais_aerien_par_kg: e.target.value }))}
                placeholder="16"
              />
            </div>
            <div>
              <Label className="flex items-center">
                <Ship className="mr-2 h-4 w-4" />
                Voie Maritime (USD/cbm)
              </Label>
              <Input
                type="number"
                step="0.01"
                value={shippingSettings.frais_maritime_par_cbm}
                onChange={(e) => setShippingSettings(prev => ({ ...prev, frais_maritime_par_cbm: e.target.value }))}
                placeholder="450"
              />
            </div>
          </div>
          <Button onClick={handleSaveShippingSettings} disabled={saving} className="bg-green-500 hover:bg-green-600">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sauvegarder les frais
          </Button>
        </CardContent>
      </Card>

      {/* Informations bancaires */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Informations bancaires (pied de page)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Informations bancaires</Label>
            <Textarea
              value={informationsBancaires}
              onChange={(e) => setInformationsBancaires(e.target.value)}
              placeholder="Ex: EQUITY BCDC | 0001105023-32000099001-60 | COCCINELLE&#10;RAWBANK | 65101-00941018001-91 | COCCINELLE SARL"
              rows={4}
              className="mt-1 font-mono text-sm"
            />
            <p className="text-sm text-gray-500 mt-2">
              Ces informations seront affichées en bas de page de la facture PDF.
              Utilisez des retours à la ligne pour séparer les différentes banques.
            </p>
          </div>
          <Button onClick={handleSaveInformationsBancaires} disabled={saving} className="bg-green-500 hover:bg-green-600">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sauvegarder les informations
          </Button>
        </CardContent>
      </Card>

      {/* Conditions de vente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Conditions de vente par défaut
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="flex items-center">
              <Plane className="mr-2 h-4 w-4" />
              Conditions de vente - Voie Aérienne
            </Label>
            <Textarea
              value={conditionsVente.aerien}
              onChange={(e) => setConditionsVente(prev => ({ ...prev, aerien: e.target.value }))}
              placeholder="Ex: Paiement à la livraison, Délai 7-10 jours, Garantie 30 jours..."
              rows={5}
              className="mt-1"
            />
          </div>
          <div>
            <Label className="flex items-center">
              <Ship className="mr-2 h-4 w-4" />
              Conditions de vente - Voie Maritime
            </Label>
            <Textarea
              value={conditionsVente.maritime}
              onChange={(e) => setConditionsVente(prev => ({ ...prev, maritime: e.target.value }))}
              placeholder="Ex: Paiement 50% à la commande, Délai 45-60 jours, Garantie 30 jours..."
              rows={5}
              className="mt-1"
            />
          </div>
          <p className="text-sm text-gray-500">
            Ces conditions seront automatiquement pré-remplies selon le mode de livraison choisi lors de la création d'une nouvelle facture.
            Vous pourrez les modifier individuellement pour chaque facture.
          </p>
          <Button onClick={handleSaveConditionsVente} disabled={saving} className="bg-green-500 hover:bg-green-600">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Sauvegarder les conditions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
