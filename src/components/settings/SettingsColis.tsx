import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Package, Plane, Ship, Plus, X, Save, Truck, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { SettingsTabsLayout } from './SettingsTabsLayout';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { Transitaire } from '@/types';

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
  
  // États pour les transitaires
  const [transitaires, setTransitaires] = useState<Transitaire[]>([]);
  const [isTransitaireFormOpen, setIsTransitaireFormOpen] = useState(false);
  const [selectedTransitaire, setSelectedTransitaire] = useState<Transitaire | null>(null);
  const [loadingTransitaires, setLoadingTransitaires] = useState(true);

  const [transitaireFormData, setTransitaireFormData] = useState({
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

  // État pour l'onglet actif
  const [activeTab, setActiveTab] = useState('fournisseurs');

  useEffect(() => {
    loadSettings();
    loadTransitaires();
  }, []);

  const loadTransitaires = async () => {
    setLoadingTransitaires(true);
    try {
      const { data, error } = await supabase
        .from('transitaires')
        .select('*')
        .order('nom');

      if (error) throw error;
      setTransitaires(data || []);
    } catch (error) {
      console.error('Error loading transitaires:', error);
    } finally {
      setLoadingTransitaires(false);
    }
  };

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

  const handleAddTransitaire = () => {
    setSelectedTransitaire(null);
    setTransitaireFormData({
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
    setIsTransitaireFormOpen(true);
  };

  const handleEditTransitaire = (transitaire: Transitaire) => {
    setSelectedTransitaire(transitaire);
    setTransitaireFormData({
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
    setIsTransitaireFormOpen(true);
  };

  const handleSaveTransitaire = async () => {
    if (!transitaireFormData.nom.trim()) {
      showError('Le nom du transitaire est requis');
      return;
    }

    setSaving(true);
    try {
      const dataToSave = {
        nom: transitaireFormData.nom,
        nom_contact: transitaireFormData.nom_contact || null,
        telephone: transitaireFormData.telephone || null,
        ville: transitaireFormData.ville || null,
        specialisation_chine: transitaireFormData.specialisation_chine,
        specialisation_congo: transitaireFormData.specialisation_congo,
        services_offerts: transitaireFormData.services_offerts,
        delai_moyen_livraison: transitaireFormData.delai_moyen_livraison ? parseInt(transitaireFormData.delai_moyen_livraison) : null,
        tarif_base: transitaireFormData.tarif_base ? parseFloat(transitaireFormData.tarif_base) : null,
        note_interne: transitaireFormData.note_interne || null,
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

      setIsTransitaireFormOpen(false);
      await loadTransitaires();
    } catch (error) {
      console.error('Error saving transitaire:', error);
      showError('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTransitaireActif = async (transitaire: Transitaire) => {
    try {
      const { error } = await supabase
        .from('transitaires')
        .update({ actif: !transitaire.actif })
        .eq('id', transitaire.id);
      if (error) throw error;
      showSuccess(`Transitaire ${transitaire.actif ? 'désactivé' : 'activé'}`);
      await loadTransitaires();
    } catch (error) {
      showError('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteTransitaire = async (transitaire: Transitaire) => {
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
      showError('Erreur lors de la suppression');
    }
  };

  const toggleTransitaireService = (service: string) => {
    setTransitaireFormData(prev => {
      const services = prev.services_offerts || [];
      if (services.includes(service)) {
        return { ...prev, services_offerts: services.filter(s => s !== service) };
      } else {
        return { ...prev, services_offerts: [...services, service] };
      }
    });
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Package className="mr-2 h-5 w-5" />
          Paramètres Colis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SettingsTabsLayout
          tabs={[
            { id: 'fournisseurs', label: 'Fournisseurs', icon: <Truck className="h-4 w-4" />, color: 'text-blue-500' },
            { id: 'aerien', label: 'Tarifs Aériens', icon: <Plane className="h-4 w-4" />, color: 'text-sky-500' },
            { id: 'maritime', label: 'Tarifs Maritimes', icon: <Ship className="h-4 w-4" />, color: 'text-indigo-500' },
            { id: 'transitaires', label: 'Transitaires', icon: <Truck className="h-4 w-4" />, color: 'text-teal-500' }
          ]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        >
          {/* Fournisseurs */}
          {activeTab === 'fournisseurs' && (
            <div className="space-y-4 pt-4">
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
              
              <div className="flex justify-end pt-4">
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
          )}

          {/* Tarifs Aériens */}
          {activeTab === 'aerien' && (
            <div className="space-y-4 pt-4">
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
              
              <div className="flex justify-end pt-4">
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
          )}

          {/* Tarifs Maritimes */}
          {activeTab === 'maritime' && (
            <div className="space-y-4 pt-4">
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
              
              <div className="flex justify-end pt-4">
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
          )}

          {/* Transitaires */}
          {activeTab === 'transitaires' && (
            <div className="space-y-4 pt-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Liste des Transitaires ({transitaires.length})</h3>
                <Button onClick={handleAddTransitaire} className="bg-green-500 hover:bg-green-600">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter
                </Button>
              </div>

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
                              <Badge variant="outline" className="text-xs border-red-200 bg-red-50 text-red-700">Chine</Badge>
                            )}
                            {transitaire.specialisation_congo && (
                              <Badge variant="outline" className="text-xs border-blue-200 bg-blue-50 text-blue-700">Congo</Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-gray-600">
                            {transitaire.nom_contact && (
                              <div><span className="font-medium">Contact:</span> {transitaire.nom_contact}</div>
                            )}
                            {transitaire.telephone && (
                              <div><span className="font-medium">Tél:</span> {transitaire.telephone}</div>
                            )}
                            {transitaire.ville && (
                              <div><span className="font-medium">Ville:</span> {transitaire.ville}</div>
                            )}
                            {transitaire.delai_moyen_livraison && (
                              <div><span className="font-medium">Délai:</span> {transitaire.delai_moyen_livraison}j</div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleTransitaireActif(transitaire)}
                          >
                            {transitaire.actif ? '🔴' : '🟢'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTransitaire(transitaire)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteTransitaire(transitaire)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Modal Transitaire */}
              <Dialog open={isTransitaireFormOpen} onOpenChange={setIsTransitaireFormOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {selectedTransitaire ? 'Modifier le transitaire' : 'Nouveau transitaire'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="nom">Nom du transitaire *</Label>
                        <Input
                          id="nom"
                          value={transitaireFormData.nom}
                          onChange={(e) => setTransitaireFormData({ ...transitaireFormData, nom: e.target.value })}
                          placeholder="Ex: DHL, FedEx..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="nom_contact">Nom du contact</Label>
                        <Input
                          id="nom_contact"
                          value={transitaireFormData.nom_contact}
                          onChange={(e) => setTransitaireFormData({ ...transitaireFormData, nom_contact: e.target.value })}
                          placeholder="Ex: Jean Dupont"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="telephone">Téléphone</Label>
                        <Input
                          id="telephone"
                          value={transitaireFormData.telephone}
                          onChange={(e) => setTransitaireFormData({ ...transitaireFormData, telephone: e.target.value })}
                          placeholder="+243..."
                        />
                      </div>
                      <div>
                        <Label htmlFor="ville">Ville</Label>
                        <Input
                          id="ville"
                          value={transitaireFormData.ville}
                          onChange={(e) => setTransitaireFormData({ ...transitaireFormData, ville: e.target.value })}
                          placeholder="Ex: Lubumbashi"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="delai">Délai moyen (jours)</Label>
                        <Input
                          id="delai"
                          type="number"
                          value={transitaireFormData.delai_moyen_livraison}
                          onChange={(e) => setTransitaireFormData({ ...transitaireFormData, delai_moyen_livraison: e.target.value })}
                          placeholder="Ex: 30"
                        />
                      </div>
                      <div>
                        <Label htmlFor="tarif_base">Tarif de base (USD)</Label>
                        <Input
                          id="tarif_base"
                          type="number"
                          step="0.01"
                          value={transitaireFormData.tarif_base}
                          onChange={(e) => setTransitaireFormData({ ...transitaireFormData, tarif_base: e.target.value })}
                          placeholder="Ex: 500"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Type de Transport</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={transitaireFormData.services_offerts?.includes('Aerien')}
                            onChange={() => toggleTransitaireService('Aerien')}
                            className="w-4 h-4"
                          />
                          <span>Aérien</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={transitaireFormData.services_offerts?.includes('Maritime')}
                            onChange={() => toggleTransitaireService('Maritime')}
                            className="w-4 h-4"
                          />
                          <span>Maritime</span>
                        </label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Spécialisations</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={transitaireFormData.specialisation_chine}
                            onChange={(e) => setTransitaireFormData({ ...transitaireFormData, specialisation_chine: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <span>Chine</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={transitaireFormData.specialisation_congo}
                            onChange={(e) => setTransitaireFormData({ ...transitaireFormData, specialisation_congo: e.target.checked })}
                            className="w-4 h-4"
                          />
                          <span>Congo</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="note_interne">Note interne</Label>
                      <Textarea
                        id="note_interne"
                        value={transitaireFormData.note_interne}
                        onChange={(e) => setTransitaireFormData({ ...transitaireFormData, note_interne: e.target.value })}
                        placeholder="Notes internes..."
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                      <Button variant="outline" onClick={() => setIsTransitaireFormOpen(false)} disabled={saving}>
                        <X className="h-4 w-4 mr-2" />
                        Annuler
                      </Button>
                      <Button
                        onClick={handleSaveTransitaire}
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
            </div>
          )}
        </SettingsTabsLayout>
      </CardContent>
    </Card>
  );
};
