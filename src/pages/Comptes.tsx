import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { useComptesFinanciers } from '@/hooks/useComptesFinanciers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, Wallet, Building, DollarSign, Grid3x3, List, Smartphone, CreditCard, Banknote, Eye } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import type { CompteFinancier, CreateCompteFinancierData, UpdateCompteFinancierData } from '@/types';
import { cn } from '@/lib/utils';
import CompteDetailModal from '@/components/comptes/CompteDetailModal';

const Comptes: React.FC = () => {
  const { 
    comptes, 
    loading, 
    error, 
    createCompte, 
    updateCompte, 
    deleteCompte,
    getComptesByType,
    getTotalBalance,
    getActiveComptes
  } = useComptesFinanciers();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCompte, setSelectedCompte] = useState<CompteFinancier | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [compteForDetail, setCompteForDetail] = useState<CompteFinancier | null>(null);
  const [formData, setFormData] = useState<CreateCompteFinancierData>({
    nom: '',
    type_compte: 'mobile_money',
    numero_compte: '',
    solde_actuel: 0,
    devise: 'USD',
    description: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedCompte) {
        // Update existing compte
        await updateCompte(selectedCompte.id, formData as UpdateCompteFinancierData);
        showSuccess('Compte mis à jour avec succès');
      } else {
        // Create new compte
        await createCompte(formData);
        showSuccess('Compte créé avec succès');
      }
      
      // Reset form
      setFormData({
        nom: '',
        type_compte: 'mobile_money',
        numero_compte: '',
        solde_actuel: 0,
        devise: 'USD',
        description: ''
      });
      setSelectedCompte(null);
      setIsCreateDialogOpen(false);
      setIsEditDialogOpen(false);
    } catch (error: any) {
      console.error('Error saving compte:', error);
      showError(error.message || 'Erreur lors de la sauvegarde du compte');
    }
  };

  const handleEdit = (compte: CompteFinancier) => {
    setSelectedCompte(compte);
    setFormData({
      nom: compte.nom,
      type_compte: compte.type_compte,
      numero_compte: compte.numero_compte || '',
      solde_actuel: compte.solde_actuel,
      devise: compte.devise,
      description: compte.description || ''
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (compte: CompteFinancier) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer le compte "${compte.nom}" ?`)) {
      try {
        await deleteCompte(compte.id);
        showSuccess('Compte supprimé avec succès');
      } catch (error: any) {
        console.error('Error deleting compte:', error);
        showError(error.message || 'Erreur lors de la suppression du compte');
      }
    }
  };

  const handleViewDetail = (compte: CompteFinancier) => {
    setCompteForDetail(compte);
    setIsDetailModalOpen(true);
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'mobile_money':
        return <Smartphone className="h-5 w-5" />;
      case 'banque':
        return <Building className="h-5 w-5" />;
      case 'cash':
        return <Banknote className="h-5 w-5" />;
      default:
        return <Wallet className="h-5 w-5" />;
    }
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'mobile_money':
        return 'Mobile Money';
      case 'banque':
        return 'Banque';
      case 'cash':
        return 'Cash';
      default:
        return type;
    }
  };

  const getAccountColor = (nom: string, type: string) => {
    const nomLower = nom.toLowerCase();
    
    // Couleurs spécifiques par opérateur
    if (nomLower.includes('airtel')) {
      return {
        bg: 'bg-red-50 dark:bg-red-950/20',
        border: 'border-red-200 dark:border-red-800',
        icon: 'bg-red-500',
        text: 'text-red-700 dark:text-red-300',
        badge: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      };
    }
    if (nomLower.includes('orange')) {
      return {
        bg: 'bg-orange-50 dark:bg-orange-950/20',
        border: 'border-orange-200 dark:border-orange-800',
        icon: 'bg-orange-500',
        text: 'text-orange-700 dark:text-orange-300',
        badge: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      };
    }
    if (nomLower.includes('m-pesa') || nomLower.includes('mpesa')) {
      return {
        bg: 'bg-green-50 dark:bg-green-950/20',
        border: 'border-green-200 dark:border-green-800',
        icon: 'bg-green-600',
        text: 'text-green-700 dark:text-green-300',
        badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      };
    }
    
    // Couleurs par type de compte
    switch (type) {
      case 'banque':
        return {
          bg: 'bg-blue-50 dark:bg-blue-950/20',
          border: 'border-blue-200 dark:border-blue-800',
          icon: 'bg-blue-500',
          text: 'text-blue-700 dark:text-blue-300',
          badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
        };
      case 'cash':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-950/20',
          border: 'border-emerald-200 dark:border-emerald-800',
          icon: 'bg-emerald-500',
          text: 'text-emerald-700 dark:text-emerald-300',
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
        };
      default:
        return {
          bg: 'bg-purple-50 dark:bg-purple-950/20',
          border: 'border-purple-200 dark:border-purple-800',
          icon: 'bg-purple-500',
          text: 'text-purple-700 dark:text-purple-300',
          badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
        };
    }
  };

  const activeComptes = getActiveComptes();
  const totalUSD = getTotalBalance('USD');
  const totalCDF = getTotalBalance('CDF');
  const mobileMoneyComptes = getComptesByType('mobile_money');
  const banqueComptes = getComptesByType('banque');
  const cashComptes = getComptesByType('cash');

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="text-red-600 text-center p-4">
          Erreur: {error}
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Comptes Financiers</h1>
          <p className="text-gray-600">Gérez vos comptes Airtel, Orange, M-Pesa, Banque, Cash</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={cn(
                'h-8 w-8 p-0',
                viewMode === 'grid' && 'bg-white dark:bg-gray-700 shadow-sm'
              )}
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={cn(
                'h-8 w-8 p-0',
                viewMode === 'list' && 'bg-white dark:bg-gray-700 shadow-sm'
              )}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Compte
              </Button>
            </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Créer un nouveau compte</DialogTitle>
              <DialogDescription>
                Ajoutez un nouveau compte financier pour gérer vos transactions.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="nom">Nom du compte</Label>
                <Input
                  id="nom"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  placeholder="Ex: Airtel Money, Orange Money, Banque BCDC"
                  required
                />
              </div>
              <div>
                <Label htmlFor="type_compte">Type de compte</Label>
                <Select
                  value={formData.type_compte}
                  onValueChange={(value: 'mobile_money' | 'banque' | 'cash') =>
                    setFormData({ ...formData, type_compte: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mobile_money">Mobile Money</SelectItem>
                    <SelectItem value="banque">Banque</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="numero_compte">Numéro de compte</Label>
                <Input
                  id="numero_compte"
                  value={formData.numero_compte}
                  onChange={(e) => setFormData({ ...formData, numero_compte: e.target.value })}
                  placeholder="Numéro de téléphone ou numéro de compte bancaire"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="solde_actuel">Solde actuel</Label>
                  <Input
                    id="solde_actuel"
                    type="number"
                    step="0.01"
                    value={formData.solde_actuel}
                    onChange={(e) => setFormData({ ...formData, solde_actuel: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="devise">Devise</Label>
                  <Select
                    value={formData.devise}
                    onValueChange={(value: 'USD' | 'CDF') =>
                      setFormData({ ...formData, devise: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Devise" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="CDF">CDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description optionnelle du compte"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit">Créer</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Comptes</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeComptes.length}</div>
            <p className="text-xs text-muted-foreground">Comptes actifs</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solde Total USD</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalUSD.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">En dollars américains</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Solde Total CDF</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCDF.toFixed(2)} CDF</div>
            <p className="text-xs text-muted-foreground">En francs congolais</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mobile Money</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mobileMoneyComptes.length}</div>
            <p className="text-xs text-muted-foreground">Comptes mobile money</p>
          </CardContent>
        </Card>
      </div>

      {/* Accounts List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {comptes.map((compte) => {
            const colors = getAccountColor(compte.nom, compte.type_compte);
            return (
              <Card 
                key={compte.id} 
                className={cn(
                  'border-2 transition-all hover:shadow-lg',
                  colors.bg,
                  colors.border,
                  !compte.is_active && 'opacity-50'
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn('p-2 rounded-lg', colors.icon)}>
                        {React.cloneElement(getAccountIcon(compte.type_compte) as React.ReactElement, {
                          className: 'h-5 w-5 text-white'
                        })}
                      </div>
                      <div>
                        <CardTitle className="text-lg font-bold">{compte.nom}</CardTitle>
                        <Badge className={cn('mt-1', colors.badge)}>
                          {getAccountTypeLabel(compte.type_compte)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetail(compte)}
                        className="h-8 w-8 p-0"
                        title="Voir détails"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(compte)}
                        className="h-8 w-8 p-0"
                        title="Modifier"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(compte)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Supprimer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {compte.numero_compte && (
                    <div className="flex items-center justify-between p-2 bg-white/50 dark:bg-gray-900/50 rounded">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Numéro:</span>
                      <span className="text-sm font-mono font-medium">{compte.numero_compte}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Solde:</span>
                    <span className={cn('text-2xl font-bold', colors.text)}>
                      {compte.devise === 'USD' ? '$' : ''}{compte.solde_actuel.toFixed(2)} {compte.devise === 'CDF' ? 'FC' : ''}
                    </span>
                  </div>
                  {!compte.is_active && (
                    <Badge variant="destructive" className="w-full justify-center">
                      Inactif
                    </Badge>
                  )}
                  {compte.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 italic">{compte.description}</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {comptes.map((compte) => {
            const colors = getAccountColor(compte.nom, compte.type_compte);
            return (
              <Card 
                key={compte.id}
                className={cn(
                  'border-l-4 transition-all hover:shadow-md',
                  colors.border,
                  !compte.is_active && 'opacity-50'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={cn('p-3 rounded-lg', colors.icon)}>
                        {React.cloneElement(getAccountIcon(compte.type_compte) as React.ReactElement, {
                          className: 'h-6 w-6 text-white'
                        })}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-bold">{compte.nom}</h3>
                          <Badge className={cn(colors.badge)}>
                            {getAccountTypeLabel(compte.type_compte)}
                          </Badge>
                          {!compte.is_active && (
                            <Badge variant="destructive">Inactif</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-6 mt-2 text-sm text-gray-600 dark:text-gray-400">
                          {compte.numero_compte && (
                            <span className="font-mono">{compte.numero_compte}</span>
                          )}
                          {compte.description && (
                            <span className="italic">{compte.description}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-sm text-gray-600 dark:text-gray-400">Solde</div>
                        <div className={cn('text-2xl font-bold', colors.text)}>
                          {compte.devise === 'USD' ? '$' : ''}{compte.solde_actuel.toFixed(2)} {compte.devise === 'CDF' ? 'FC' : ''}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(compte)}
                          className="h-9 w-9 p-0"
                          title="Voir détails"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(compte)}
                          className="h-9 w-9 p-0"
                          title="Modifier"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(compte)}
                          className="h-9 w-9 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Supprimer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Modifier le compte</DialogTitle>
            <DialogDescription>
              Mettez à jour les informations du compte financier.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="edit_nom">Nom du compte</Label>
              <Input
                id="edit_nom"
                value={formData.nom}
                onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit_type_compte">Type de compte</Label>
              <Select
                value={formData.type_compte}
                onValueChange={(value: 'mobile_money' | 'banque' | 'cash') =>
                  setFormData({ ...formData, type_compte: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mobile_money">Mobile Money</SelectItem>
                  <SelectItem value="banque">Banque</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit_numero_compte">Numéro de compte</Label>
              <Input
                id="edit_numero_compte"
                value={formData.numero_compte}
                onChange={(e) => setFormData({ ...formData, numero_compte: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="edit_solde_actuel">Solde actuel</Label>
                <Input
                  id="edit_solde_actuel"
                  type="number"
                  step="0.01"
                  value={formData.solde_actuel}
                  onChange={(e) => setFormData({ ...formData, solde_actuel: parseFloat(e.target.value) || 0 })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit_devise">Devise</Label>
                <Select
                  value={formData.devise}
                  onValueChange={(value: 'USD' | 'CDF') =>
                    setFormData({ ...formData, devise: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CDF">CDF</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="edit_description">Description</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="submit">Mettre à jour</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de détail du compte */}
      <CompteDetailModal
        compte={compteForDetail}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setCompteForDetail(null);
        }}
      />
      </div>
    </Layout>
  );
};

export default Comptes;
