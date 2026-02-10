import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Truck, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Transitaire } from '@/types';

export const SettingsTransitaires: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [transitaires, setTransitaires] = useState<Transitaire[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTransitaire, setSelectedTransitaire] = useState<Transitaire | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    nom: '',
    nom_contact: '',
    telephone: '',
    ville: '',
    specialisation_chine: false,
    specialisation_congo: false,
    services_offerts: [] as string[],
    delai_moyen_livraison: '',
    tarif_base: '',
    note_interne: ''
  });

  useEffect(() => {
    loadTransitaires();
  }, []);

  const loadTransitaires = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transitaires')
        .select('*')
        .order('nom');

      if (error) throw error;
      setTransitaires(data || []);
    } catch (error) {
      console.error('Error loading transitaires:', error);
      showError('Erreur lors du chargement des transitaires');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setSelectedTransitaire(null);
    setFormData({
      nom: '',
      nom_contact: '',
      telephone: '',
      ville: '',
      specialisation_chine: false,
      specialisation_congo: false,
      services_offerts: [],
      delai_moyen_livraison: '',
      tarif_base: '',
      note_interne: ''
    });
    setIsFormOpen(true);
  };

  const handleEdit = (transitaire: Transitaire) => {
    setSelectedTransitaire(transitaire);
    setFormData({
      nom: transitaire.nom,
      nom_contact: transitaire.nom_contact || '',
      telephone: transitaire.telephone || '',
      ville: transitaire.ville || '',
      specialisation_chine: transitaire.specialisation_chine,
      specialisation_congo: transitaire.specialisation_congo,
      services_offerts: transitaire.services_offerts || [],
      delai_moyen_livraison: transitaire.delai_moyen_livraison?.toString() || '',
      tarif_base: transitaire.tarif_base?.toString() || '',
      note_interne: transitaire.note_interne || ''
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nom.trim()) {
      showError('Le nom du transitaire est requis');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        nom: formData.nom,
        nom_contact: formData.nom_contact || null,
        telephone: formData.telephone || null,
        ville: formData.ville || null,
        specialisation_chine: formData.specialisation_chine,
        specialisation_congo: formData.specialisation_congo,
        services_offerts: formData.services_offerts,
        delai_moyen_livraison: formData.delai_moyen_livraison ? parseInt(formData.delai_moyen_livraison) : null,
        tarif_base: formData.tarif_base ? parseFloat(formData.tarif_base) : null,
        note_interne: formData.note_interne || null,
        actif: true
      };

      if (selectedTransitaire) {
        const { error } = await supabase
          .from('transitaires')
          .update(dataToSave)
          .eq('id', selectedTransitaire.id);

        if (error) throw error;
        showSuccess('Transitaire modifié avec succès');
      } else {
        const { error } = await supabase
          .from('transitaires')
          .insert([dataToSave]);

        if (error) throw error;
        showSuccess('Transitaire créé avec succès');
      }

      setIsFormOpen(false);
      await loadTransitaires();
    } catch (error) {
      console.error('Error saving transitaire:', error);
      showError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActif = async (transitaire: Transitaire) => {
    try {
      const { error } = await supabase
        .from('transitaires')
        .update({ actif: !transitaire.actif })
        .eq('id', transitaire.id);

      if (error) throw error;
      showSuccess(`Transitaire ${transitaire.actif ? 'désactivé' : 'activé'}`);
      await loadTransitaires();
    } catch (error) {
      console.error('Error toggling transitaire:', error);
      showError('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async (transitaire: Transitaire) => {
    if (!confirm(`Supprimer le transitaire "${transitaire.nom}" ?`)) return;

    try {
      const { error } = await supabase
        .from('transitaires')
        .delete()
        .eq('id', transitaire.id);

      if (error) throw error;
      showSuccess('Transitaire supprimé');
      await loadTransitaires();
    } catch (error) {
      console.error('Error deleting transitaire:', error);
      showError('Erreur lors de la suppression');
    }
  };

  // Helper to manage services (Aerien/Maritime)
  const toggleService = (service: string) => {
    setFormData(prev => {
      const services = prev.services_offerts || [];
      if (services.includes(service)) {
        return { ...prev, services_offerts: services.filter(s => s !== service) };
      } else {
        return { ...prev, services_offerts: [...services, service] };
      }
    });
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
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-blue-500" />
              Transitaires ({transitaires.length})
            </CardTitle>
            <Button onClick={handleAdd} className="bg-green-500 hover:bg-green-600">
              <Plus className="h-4 w-4 mr-2" />
              Ajouter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {transitaires.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Truck className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun transitaire enregistré</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transitaires.map((transitaire) => (
                <div
                  key={transitaire.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-lg">{transitaire.nom}</h3>
                        <Badge variant={transitaire.actif ? 'default' : 'secondary'} className={transitaire.actif ? 'bg-green-500' : ''}>
                          {transitaire.actif ? 'Actif' : 'Inactif'}
                        </Badge>
                        {transitaire.specialisation_chine && (
                          <Badge variant="outline" className="text-xs border-red-200 bg-red-50 text-red-700">🇨🇳 Chine</Badge>
                        )}
                        {transitaire.specialisation_congo && (
                          <Badge variant="outline" className="text-xs border-blue-200 bg-blue-50 text-blue-700">🇨🇩 Congo</Badge>
                        )}
                        {/* Display Transport Types */}
                        {transitaire.services_offerts?.includes('Aerien') && (
                          <Badge variant="outline" className="text-xs border-sky-200 bg-sky-50 text-sky-700 flex items-center gap-1">
                            ✈️ Aérien
                          </Badge>
                        )}
                        {transitaire.services_offerts?.includes('Maritime') && (
                          <Badge variant="outline" className="text-xs border-indigo-200 bg-indigo-50 text-indigo-700 flex items-center gap-1">
                            🚢 Maritime
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                        {transitaire.nom_contact && (
                          <div>
                            <span className="font-medium">Contact:</span> {transitaire.nom_contact}
                          </div>
                        )}
                        {transitaire.telephone && (
                          <div>
                            <span className="font-medium">Tél:</span> {transitaire.telephone}
                          </div>
                        )}
                        {transitaire.ville && (
                          <div>
                            <span className="font-medium">Ville:</span> {transitaire.ville}
                          </div>
                        )}
                        {transitaire.delai_moyen_livraison && (
                          <div>
                            <span className="font-medium">Délai:</span> {transitaire.delai_moyen_livraison}j
                          </div>
                        )}
                      </div>

                      {transitaire.note_interne && (
                        <p className="text-sm text-gray-500 mt-2 italic">
                          {transitaire.note_interne}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleToggleActif(transitaire)}
                        title={transitaire.actif ? 'Désactiver' : 'Activer'}
                      >
                        {transitaire.actif ? '🔴' : '🟢'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(transitaire)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(transitaire)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulaire Modal */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedTransitaire ? 'Modifier le transitaire' : 'Nouveau transitaire'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nom">Nom du transitaire *</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Ex: DHL, FedEx..."
                />
              </div>
              <div>
                <Label htmlFor="nom_contact">Nom du contact</Label>
                <Input
                  id="nom_contact"
                  value={formData.nom_contact}
                  onChange={(e) => setFormData({ ...formData, nom_contact: e.target.value })}
                  placeholder="Ex: Jean Dupont"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="telephone">Téléphone</Label>
                <Input
                  id="telephone"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  placeholder="+243..."
                />
              </div>
              <div>
                <Label htmlFor="ville">Ville</Label>
                <Input
                  id="ville"
                  value={formData.ville}
                  onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                  placeholder="Ex: Lubumbashi"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="delai_moyen_livraison">Délai moyen (jours)</Label>
                <Input
                  id="delai_moyen_livraison"
                  type="number"
                  value={formData.delai_moyen_livraison}
                  onChange={(e) => setFormData({ ...formData, delai_moyen_livraison: e.target.value })}
                  placeholder="Ex: 30"
                />
              </div>
              <div>
                <Label htmlFor="tarif_base">Tarif de base (USD)</Label>
                <Input
                  id="tarif_base"
                  type="number"
                  step="0.01"
                  value={formData.tarif_base}
                  onChange={(e) => setFormData({ ...formData, tarif_base: e.target.value })}
                  placeholder="Ex: 500"
                />
              </div>
            </div>

            {/* Transport Types */}
            <div className="space-y-2">
              <Label>Type de Transport</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer bg-blue-50 p-2 rounded border border-blue-100 hover:bg-blue-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.services_offerts?.includes('Aerien')}
                    onChange={() => toggleService('Aerien')}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <span className="flex items-center gap-1 font-medium text-blue-900">✈️ Aérien</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-indigo-50 p-2 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={formData.services_offerts?.includes('Maritime')}
                    onChange={() => toggleService('Maritime')}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span className="flex items-center gap-1 font-medium text-indigo-900">🚢 Maritime</span>
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Spécialisations (Pays)</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.specialisation_chine}
                    onChange={(e) => setFormData({ ...formData, specialisation_chine: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>🇨🇳 Chine</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.specialisation_congo}
                    onChange={(e) => setFormData({ ...formData, specialisation_congo: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span>🇨🇩 Congo</span>
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="note_interne">Note interne</Label>
              <Textarea
                id="note_interne"
                value={formData.note_interne}
                onChange={(e) => setFormData({ ...formData, note_interne: e.target.value })}
                placeholder="Notes internes sur ce transitaire..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsFormOpen(false)}
                disabled={saving}
              >
                <X className="h-4 w-4 mr-2" />
                Annuler
              </Button>
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
                    Sauvegarder
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
