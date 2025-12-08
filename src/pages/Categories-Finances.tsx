"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus,
  Trash2,
  Edit2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Palette,
  Tag,
  Save,
  X
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';

// Icônes disponibles pour les catégories
const AVAILABLE_ICONS = [
  { value: 'shopping-cart', label: 'Panier', icon: '🛒' },
  { value: 'truck', label: 'Transport', icon: '🚚' },
  { value: 'home', label: 'Maison', icon: '🏠' },
  { value: 'users', label: 'Personnel', icon: '👥' },
  { value: 'tool', label: 'Outils', icon: '🔧' },
  { value: 'zap', label: 'Électricité', icon: '⚡' },
  { value: 'phone', label: 'Téléphone', icon: '📱' },
  { value: 'wifi', label: 'Internet', icon: '📶' },
  { value: 'coffee', label: 'Café', icon: '☕' },
  { value: 'briefcase', label: 'Business', icon: '💼' },
  { value: 'credit-card', label: 'Paiement', icon: '💳' },
  { value: 'gift', label: 'Cadeau', icon: '🎁' },
  { value: 'package', label: 'Colis', icon: '📦' },
  { value: 'file-text', label: 'Document', icon: '📄' },
  { value: 'dollar-sign', label: 'Argent', icon: '💵' },
  { value: 'percent', label: 'Commission', icon: '💹' },
  { value: 'building', label: 'Immeuble', icon: '🏢' },
  { value: 'car', label: 'Véhicule', icon: '🚗' },
  { value: 'plane', label: 'Avion', icon: '✈️' },
  { value: 'ship', label: 'Bateau', icon: '🚢' },
];

// Couleurs disponibles
const AVAILABLE_COLORS = [
  { value: '#22c55e', label: 'Vert' },
  { value: '#3b82f6', label: 'Bleu' },
  { value: '#ef4444', label: 'Rouge' },
  { value: '#f59e0b', label: 'Orange' },
  { value: '#8b5cf6', label: 'Violet' },
  { value: '#ec4899', label: 'Rose' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#84cc16', label: 'Lime' },
  { value: '#6366f1', label: 'Indigo' },
  { value: '#14b8a6', label: 'Teal' },
  { value: '#f97316', label: 'Orange vif' },
  { value: '#64748b', label: 'Gris' },
];

interface FinanceCategory {
  id: string;
  nom: string;
  code: string;
  type: 'revenue' | 'depense';
  icon: string;
  couleur: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

export const CategoriesFinances = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [activeTab, setActiveTab] = useState<'revenue' | 'depense'>('revenue');
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinanceCategory | null>(null);
  
  const [formData, setFormData] = useState({
    nom: '',
    code: '',
    type: 'revenue' as 'revenue' | 'depense',
    icon: 'dollar-sign',
    couleur: '#22c55e',
    description: ''
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('finance_categories')
        .select('*')
        .order('nom');

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error('Error fetching categories:', error);
      // Si la table n'existe pas encore, on continue sans erreur
      if (error.code !== '42P01') {
        showError('Erreur lors du chargement des catégories');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nom || !formData.code) {
      showError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setSaving(true);
    try {
      if (editingCategory) {
        // Mise à jour
        const { error } = await supabase
          .from('finance_categories')
          .update({
            nom: formData.nom,
            code: formData.code.toUpperCase(),
            type: formData.type,
            icon: formData.icon,
            couleur: formData.couleur,
            description: formData.description
          })
          .eq('id', editingCategory.id);

        if (error) throw error;
        showSuccess('Catégorie mise à jour');
      } else {
        // Création
        const { error } = await supabase
          .from('finance_categories')
          .insert([{
            nom: formData.nom,
            code: formData.code.toUpperCase(),
            type: formData.type,
            icon: formData.icon,
            couleur: formData.couleur,
            description: formData.description,
            is_active: true
          }]);

        if (error) throw error;
        showSuccess('Catégorie créée');
      }

      resetForm();
      fetchCategories();
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category: FinanceCategory) => {
    setEditingCategory(category);
    setFormData({
      nom: category.nom,
      code: category.code,
      type: category.type,
      icon: category.icon,
      couleur: category.couleur,
      description: category.description || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie?')) return;

    try {
      const { error } = await supabase
        .from('finance_categories')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showSuccess('Catégorie supprimée');
      fetchCategories();
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setFormData({
      nom: '',
      code: '',
      type: activeTab,
      icon: 'dollar-sign',
      couleur: activeTab === 'revenue' ? '#22c55e' : '#ef4444',
      description: ''
    });
    setEditingCategory(null);
    setShowForm(false);
  };

  const openNewForm = () => {
    resetForm();
    setFormData(prev => ({
      ...prev,
      type: activeTab,
      couleur: activeTab === 'revenue' ? '#22c55e' : '#ef4444'
    }));
    setShowForm(true);
  };

  const filteredCategories = categories.filter(c => c.type === activeTab);
  const getIconEmoji = (iconValue: string) => {
    return AVAILABLE_ICONS.find(i => i.value === iconValue)?.icon || '📁';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Catégories Financières</h1>
            <p className="text-gray-500">Gérez les catégories de revenus et dépenses</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'revenue' | 'depense')}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="revenue" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Revenus
              </TabsTrigger>
              <TabsTrigger value="depense" className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4" />
                Dépenses
              </TabsTrigger>
            </TabsList>
            
            <Button onClick={openNewForm} className="bg-green-500 hover:bg-green-600">
              <Plus className="mr-2 h-4 w-4" />
              Nouvelle catégorie
            </Button>
          </div>

          {/* Formulaire */}
          {showForm && (
            <Card className="mb-6 border-2 border-dashed border-green-300">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                  </span>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    <X className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nom">Nom *</Label>
                      <Input
                        id="nom"
                        value={formData.nom}
                        onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                        placeholder="Ex: Paiement Fournisseur"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="code">Code *</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                        placeholder="Ex: FOURNISSEUR"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description (optionnel)</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description de la catégorie"
                    />
                  </div>

                  {/* Sélection d'icône */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Icône
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_ICONS.map((icon) => (
                        <button
                          key={icon.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, icon: icon.value }))}
                          className={`p-2 text-xl rounded-lg border-2 transition-all ${
                            formData.icon === icon.value
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          title={icon.label}
                        >
                          {icon.icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Sélection de couleur */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Palette className="h-4 w-4" />
                      Couleur
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {AVAILABLE_COLORS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, couleur: color.value }))}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            formData.couleur === color.value
                              ? 'ring-2 ring-offset-2 ring-gray-400'
                              : ''
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Aperçu */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm text-gray-500 mb-2 block">Aperçu</Label>
                    <div 
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white"
                      style={{ backgroundColor: formData.couleur }}
                    >
                      <span className="text-lg">{getIconEmoji(formData.icon)}</span>
                      <span className="font-medium">{formData.nom || 'Nom de la catégorie'}</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={saving} className="bg-green-500 hover:bg-green-600">
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      {editingCategory ? 'Mettre à jour' : 'Créer'}
                    </Button>
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Annuler
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Liste des catégories */}
          <TabsContent value="revenue">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Catégories de Revenus ({filteredCategories.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredCategories.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Aucune catégorie de revenus. Cliquez sur "Nouvelle catégorie" pour en créer une.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCategories.map((category) => (
                      <div
                        key={category.id}
                        className="p-4 rounded-lg border flex items-center justify-between hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                            style={{ backgroundColor: category.couleur }}
                          >
                            {getIconEmoji(category.icon)}
                          </div>
                          <div>
                            <p className="font-medium">{category.nom}</p>
                            <p className="text-xs text-gray-500">{category.code}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="depense">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  Catégories de Dépenses ({filteredCategories.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredCategories.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Aucune catégorie de dépenses. Cliquez sur "Nouvelle catégorie" pour en créer une.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCategories.map((category) => (
                      <div
                        key={category.id}
                        className="p-4 rounded-lg border flex items-center justify-between hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg"
                            style={{ backgroundColor: category.couleur }}
                          >
                            {getIconEmoji(category.icon)}
                          </div>
                          <div>
                            <p className="font-medium">{category.nom}</p>
                            <p className="text-xs text-gray-500">{category.code}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(category)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:bg-red-50"
                            onClick={() => handleDelete(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default CategoriesFinances;
