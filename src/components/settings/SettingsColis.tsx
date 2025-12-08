import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Plane, Ship, Plus, X, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

export const SettingsColis: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // États pour les fournisseurs
  const [fournisseurs, setFournisseurs] = useState<string[]>([]);
  const [newFournisseur, setNewFournisseur] = useState('');
  
  // États pour les tarifs aériens
  const [tarifAerienRegulier, setTarifAerienRegulier] = useState('16');
  const [tarifAerienExpress, setTarifAerienExpress] = useState('25');
  
  // États pour les tarifs maritimes
  const [tarifMaritimeRegulier, setTarifMaritimeRegulier] = useState('450');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('categorie', 'colis');

      if (error) throw error;

      data?.forEach(setting => {
        switch (setting.cle) {
          case 'fournisseurs':
            setFournisseurs(setting.valeur.split(',').filter(f => f.trim()));
            break;
          case 'tarif_aerien_regulier':
            setTarifAerienRegulier(setting.valeur);
            break;
          case 'tarif_aerien_express':
            setTarifAerienExpress(setting.valeur);
            break;
          case 'tarif_maritime_regulier':
            setTarifMaritimeRegulier(setting.valeur);
            break;
        }
      });
    } catch (error) {
      console.error('Error loading settings:', error);
      showError('Erreur lors du chargement des paramètres');
    } finally {
      setLoading(false);
    }
  };

  const handleAddFournisseur = () => {
    if (!newFournisseur.trim()) {
      showError('Veuillez entrer un nom de fournisseur');
      return;
    }
    if (fournisseurs.includes(newFournisseur.trim())) {
      showError('Ce fournisseur existe déjà');
      return;
    }
    setFournisseurs([...fournisseurs, newFournisseur.trim()]);
    setNewFournisseur('');
  };

  const handleRemoveFournisseur = (fournisseur: string) => {
    setFournisseurs(fournisseurs.filter(f => f !== fournisseur));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Récupérer l'organization_id
      const { data: existingSettings } = await supabase
        .from('settings')
        .select('organization_id')
        .eq('categorie', 'colis')
        .limit(1)
        .single();

      const organizationId = existingSettings?.organization_id || '00000000-0000-0000-0000-000000000001';

      // Préparer les mises à jour
      const updates = [
        {
          categorie: 'colis',
          cle: 'fournisseurs',
          valeur: fournisseurs.join(','),
          description: 'Liste des fournisseurs disponibles pour les colis',
          organization_id: organizationId
        },
        {
          categorie: 'colis',
          cle: 'tarif_aerien_regulier',
          valeur: tarifAerienRegulier,
          description: 'Tarif par kg pour les colis aériens réguliers (USD)',
          organization_id: organizationId
        },
        {
          categorie: 'colis',
          cle: 'tarif_aerien_express',
          valeur: tarifAerienExpress,
          description: 'Tarif par kg pour les colis aériens express (USD)',
          organization_id: organizationId
        },
        {
          categorie: 'colis',
          cle: 'tarif_maritime_regulier',
          valeur: tarifMaritimeRegulier,
          description: 'Tarif par CBM pour les colis maritimes réguliers (USD)',
          organization_id: organizationId
        }
      ];

      // Supprimer les anciens paramètres colis
      await supabase
        .from('settings')
        .delete()
        .eq('categorie', 'colis');

      // Insérer les nouveaux
      const { error } = await supabase
        .from('settings')
        .insert(updates);

      if (error) throw error;

      showSuccess('Paramètres sauvegardés avec succès');
      await loadSettings();
    } catch (error) {
      console.error('Error saving settings:', error);
      showError('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fournisseurs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-500" />
            Fournisseurs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Liste des fournisseurs disponibles</Label>
            <div className="flex gap-2 mt-2">
              <Input
                value={newFournisseur}
                onChange={(e) => setNewFournisseur(e.target.value)}
                placeholder="Ex: Alibaba, Aliexpress..."
                onKeyPress={(e) => e.key === 'Enter' && handleAddFournisseur()}
              />
              <Button
                type="button"
                onClick={handleAddFournisseur}
                className="bg-green-500 hover:bg-green-600"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {fournisseurs.map((fournisseur, index) => (
              <Badge
                key={index}
                variant="outline"
                className="px-3 py-1 text-sm flex items-center gap-2"
              >
                {fournisseur}
                <button
                  onClick={() => handleRemoveFournisseur(fournisseur)}
                  className="hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          {fournisseurs.length === 0 && (
            <p className="text-sm text-gray-500 italic">
              Aucun fournisseur configuré. Ajoutez-en un ci-dessus.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tarifs Aériens */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plane className="h-5 w-5 text-blue-500" />
            Tarifs Colis Aériens
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tarif_aerien_regulier">Tarif Régulier ($/kg)</Label>
              <Input
                id="tarif_aerien_regulier"
                type="number"
                step="0.01"
                min="0"
                value={tarifAerienRegulier}
                onChange={(e) => setTarifAerienRegulier(e.target.value)}
                placeholder="16"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tarif standard pour les colis aériens réguliers
              </p>
            </div>

            <div>
              <Label htmlFor="tarif_aerien_express">Tarif Express ($/kg)</Label>
              <Input
                id="tarif_aerien_express"
                type="number"
                step="0.01"
                min="0"
                value={tarifAerienExpress}
                onChange={(e) => setTarifAerienExpress(e.target.value)}
                placeholder="25"
              />
              <p className="text-xs text-gray-500 mt-1">
                Tarif pour les colis aériens express (livraison rapide)
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Exemple de calcul :</strong> Un colis de 2.5 kg en tarif régulier coûtera{' '}
              <strong>${(parseFloat(tarifAerienRegulier) * 2.5).toFixed(2)}</strong>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tarifs Maritimes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-blue-500" />
            Tarifs Colis Maritimes
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="tarif_maritime_regulier">Tarif Régulier ($/CBM)</Label>
            <Input
              id="tarif_maritime_regulier"
              type="number"
              step="0.01"
              min="0"
              value={tarifMaritimeRegulier}
              onChange={(e) => setTarifMaritimeRegulier(e.target.value)}
              placeholder="450"
            />
            <p className="text-xs text-gray-500 mt-1">
              Tarif standard pour les colis maritimes (par mètre cube)
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Exemple de calcul :</strong> Un colis de 0.5 CBM coûtera{' '}
              <strong>${(parseFloat(tarifMaritimeRegulier) * 0.5).toFixed(2)}</strong>
            </p>
            <p className="text-xs text-gray-600 mt-2">
              CBM = (Longueur × Largeur × Hauteur) / 1,000,000
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-green-500 hover:bg-green-600"
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Enregistrement...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Sauvegarder les paramètres
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
