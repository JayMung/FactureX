"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/layout/Layout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Search,
  AlertTriangle,
} from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [activeTab, setActiveTab] = useState<'revenue' | 'depense'>('revenue');
  const [searchTerm, setSearchTerm] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<FinanceCategory | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<FinanceCategory | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');

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
    fetchUsageCounts();
  }, []);

  const fetchUsageCounts = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('categorie')
        .not('categorie', 'is', null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        if (row.categorie) counts[row.categorie] = (counts[row.categorie] || 0) + 1;
      });
      setUsageCounts(counts);
    } catch (error: any) {
      console.error('Error fetching usage counts:', error);
    }
  };

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
      if (error.code !== '42P01') showError('Erreur lors du chargement des catégories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nom || !formData.code) { showError('Veuillez remplir tous les champs obligatoires'); return; }
    setSaving(true);
    try {
      if (editingCategory) {
        const { error } = await supabase.from('finance_categories').update({
          nom: formData.nom, code: formData.code.toUpperCase(), type: formData.type,
          icon: formData.icon, couleur: formData.couleur, description: formData.description
        }).eq('id', editingCategory.id);
        if (error) throw error;
        showSuccess('Catégorie mise à jour');
      } else {
        const { error } = await supabase.from('finance_categories').insert([{
          nom: formData.nom, code: formData.code.toUpperCase(), type: formData.type,
          icon: formData.icon, couleur: formData.couleur, description: formData.description, is_active: true
        }]);
        if (error) throw error;
        showSuccess('Catégorie créée');
      }
      setFormModalOpen(false);
      setEditingCategory(null);
      fetchCategories();
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ nom: '', code: '', type: activeTab, icon: 'dollar-sign', couleur: activeTab === 'revenue' ? '#22c55e' : '#ef4444', description: '' });
    setFormModalOpen(true);
  };

  const openEditModal = (cat: FinanceCategory) => {
    setEditingCategory(cat);
    setFormData({ nom: cat.nom, code: cat.code, type: cat.type, icon: cat.icon, couleur: cat.couleur, description: cat.description || '' });
    setFormModalOpen(true);
  };

  const openDeleteModal = (cat: FinanceCategory) => {
    setCategoryToDelete(cat);
    setDeleteConfirmName('');
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('finance_categories').delete().eq('id', categoryToDelete.id);
      if (error) throw error;
      showSuccess(`Catégorie "${categoryToDelete.nom}" supprimée`);
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const getIconEmoji = (v: string) => AVAILABLE_ICONS.find(i => i.value === v)?.icon || '📁';
  const getUsageCount = (item: FinanceCategory) => (usageCounts[item.nom] || 0) + (usageCounts[item.code] || 0);

  const filteredCategories = categories
    .filter(c => c.type === activeTab)
    .filter(c => !searchTerm ||
      c.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.description || '').toLowerCase().includes(searchTerm.toLowerCase()));

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Catégories Financières</h1>
            <p className="text-gray-500">Gérez les catégories de revenus et dépenses</p>
          </div>
          <Button onClick={openCreateModal} className="bg-green-500 hover:bg-green-600">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle catégorie
          </Button>
        </div>

        {/* Tabs + Search */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'revenue' | 'depense')}>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
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
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Category cards */}
          {filteredCategories.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucune catégorie{searchTerm ? ' correspondante' : ''}</p>
              <p className="text-sm mt-1">
                {searchTerm ? 'Modifiez votre recherche' : "Cliquez sur «\u00a0Nouvelle catégorie\u00a0» pour commencer"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredCategories.map((cat) => {
                const count = getUsageCount(cat);
                return (
                  <Card key={cat.id} className="group hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                            style={{ backgroundColor: cat.couleur }}
                          >
                            {getIconEmoji(cat.icon)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{cat.nom}</p>
                            <p className="text-xs text-gray-500 font-mono">{cat.code}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openEditModal(cat)}
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
                            onClick={() => openDeleteModal(cat)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                      {cat.description && (
                        <p className="text-xs text-gray-500 mt-2 line-clamp-2">{cat.description}</p>
                      )}
                      <div className="mt-3">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            count > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
                          )}
                        >
                          {count} {count === 1 ? 'transaction' : 'transactions'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </Tabs>
      </div>

      {/* Modal Création / Édition */}
      <Dialog open={formModalOpen} onOpenChange={setFormModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Modifiez les informations de la catégorie.' : 'Créez une nouvelle catégorie financière.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="modal-nom">Nom *</Label>
                <Input
                  id="modal-nom"
                  value={formData.nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder="Ex: Paiement Fournisseur"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-code">Code *</Label>
                <Input
                  id="modal-code"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="Ex: FOURNISSEUR"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="modal-description">Description (optionnel)</Label>
              <Input
                id="modal-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description de la catégorie"
              />
            </div>
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
                    className={cn(
                      'p-2 text-xl rounded-lg border-2 transition-all',
                      formData.icon === icon.value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    )}
                    title={icon.label}
                  >
                    {icon.icon}
                  </button>
                ))}
              </div>
            </div>
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
                    className={cn(
                      'w-8 h-8 rounded-full border-2 border-transparent transition-all',
                      formData.couleur === color.value ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                    )}
                    style={{ backgroundColor: color.value }}
                    title={color.label}
                  />
                ))}
              </div>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-2">Aperçu</p>
              <div
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-white"
                style={{ backgroundColor: formData.couleur }}
              >
                <span className="text-lg">{getIconEmoji(formData.icon)}</span>
                <span className="font-medium">{formData.nom || 'Nom de la catégorie'}</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormModalOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={saving} className="bg-green-500 hover:bg-green-600">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {editingCategory ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Suppression */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Supprimer la catégorie
            </DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Tapez{' '}
              <span className="font-semibold text-gray-900">"{categoryToDelete?.nom}"</span>{' '}
              pour confirmer la suppression.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder={categoryToDelete?.nom || ''}
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              className="border-red-200 focus-visible:ring-red-400"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Annuler
            </Button>
            <Button
              variant="destructive"
              disabled={deleteConfirmName !== categoryToDelete?.nom || isDeleting}
              onClick={confirmDelete}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
};

export default CategoriesFinances;
