import React, { useState } from 'react';
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
import { UnifiedDataTable } from '@/components/ui/unified-data-table';
import { ColumnSelector } from '@/components/ui/column-selector';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, FileDown } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'auto'>('auto');
  const [columnsConfig, setColumnsConfig] = useState<Record<string, boolean>>({});
  const isMobile = useIsMobile();
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
  const totalCNY = getTotalBalance('CNY');
  const mobileMoneyComptes = getComptesByType('mobile_money');
  const banqueComptes = getComptesByType('banque');
  const cashComptes = getComptesByType('cash');

  const compteColumns = [
    {
      key: 'nom',
      title: 'Compte',
      sortable: true,
      render: (value: string, item: CompteFinancier) => {
        const colors = getAccountColor(item.nom, item.type_compte);
        return (
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', colors.icon)}>
              {getAccountIcon(item.type_compte)}
            </div>
            <div className="flex flex-col">
              <span className="font-bold">{value}</span>
              <span className="text-xs text-gray-500">{item.numero_compte}</span>
            </div>
          </div>
        );
      }
    },
    {
      key: 'type_compte',
      title: 'Type',
      sortable: true,
      render: (value: string, item: CompteFinancier) => {
        const colors = getAccountColor(item.nom, item.type_compte);
        return <Badge className={colors.badge}>{getAccountTypeLabel(value)}</Badge>
      }
    },
    {
      key: 'solde_actuel',
      title: 'Solde',
      sortable: true,
      align: 'right' as const,
      render: (value: number, item: CompteFinancier) => {
        const colors = getAccountColor(item.nom, item.type_compte);
        return (
          <span className={cn('font-bold', colors.text)}>
            {item.devise === 'USD' ? '$' : item.devise === 'CNY' ? '¥' : ''}{value.toFixed(2)} {item.devise === 'CDF' ? 'FC' : ''}
          </span>
        )
      }
    },
    {
      key: 'actions',
      title: '',
      align: 'right' as const,
      render: (_: any, item: CompteFinancier) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewDetail(item)}>
              <Eye className="mr-2 h-4 w-4" /> Voir détails
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEdit(item)}>
              <Edit2 className="mr-2 h-4 w-4" /> Modifier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleDelete(item)} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" /> Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 text-center p-4">
        Erreur: {error}
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Actions */}
      <div className="flex flex-col sm:flex-row justify-end items-stretch sm:items-center gap-3">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* View Toggle */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              type="button"
              className={cn(
                'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-3',
                viewMode === 'cards'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'hover:bg-accent hover:text-accent-foreground text-gray-500'
              )}
              onClick={() => setViewMode('cards')}
              title="Vue Grille"
            >
              <Grid3x3 className="h-4 w-4" />
              <span className="hidden sm:inline">Cartes</span>
            </button>
            <button
              type="button"
              className={cn(
                'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 px-3',
                viewMode === 'table'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'hover:bg-accent hover:text-accent-foreground text-gray-500'
              )}
              onClick={() => setViewMode('table')}
              title="Vue Liste"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block" />

          <ExportDropdown
            onExport={(format) => {
              showSuccess(`Export ${format} non implémenté`);
            }}
          />
          <ColumnSelector
            columns={compteColumns.map(c => ({ key: c.key as string, label: c.title, visible: columnsConfig[c.key as string] !== false }))}
            onColumnsChange={(cols) => setColumnsConfig(cols.reduce((acc, c) => ({ ...acc, [c.key]: c.visible }), {}))}
          />
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full sm:w-auto"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Nouveau Compte</span>
                <span className="sm:hidden">Nouveau</span>
              </button>
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
                      onValueChange={(value: 'USD' | 'CDF' | 'CNY') =>
                        setFormData({ ...formData, devise: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Devise" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="CDF">CDF</SelectItem>
                        <SelectItem value="CNY">CNY (RMB)</SelectItem>
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
                <div className="flex flex-col sm:flex-row justify-end gap-2">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full sm:w-auto"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full sm:w-auto"
                  >
                    Créer
                  </button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards - Enhanced Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Comptes Card */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/5"></div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-white/10 p-2.5">
                <Wallet className="h-5 w-5 text-white" />
              </div>
              <span className="text-xs font-medium text-slate-400">Actifs</span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-white">{activeComptes.length}</p>
              <p className="mt-1 text-sm text-slate-400">Comptes financiers</p>
            </div>
          </div>
        </div>

        {/* USD Balance Card */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-5 shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-white/20 p-2.5">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                USD
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-white">${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="mt-1 text-sm text-emerald-100">Dollars américains</p>
            </div>
          </div>
        </div>

        {/* CDF Balance Card */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-5 shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-white/20 p-2.5">
                <Banknote className="h-5 w-5 text-white" />
              </div>
              <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                CDF
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-white">{totalCDF.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FC</p>
              <p className="mt-1 text-sm text-blue-100">Francs congolais</p>
            </div>
          </div>
        </div>

        {/* CNY Balance Card */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-5 shadow-lg">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="rounded-lg bg-white/20 p-2.5">
                <CreditCard className="h-5 w-5 text-white" />
              </div>
              <span className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white">
                CNY
              </span>
            </div>
            <div className="mt-4">
              <p className="text-3xl font-bold text-white">¥{totalCNY.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="mt-1 text-sm text-purple-100">Yuan chinois (RMB)</p>
            </div>
          </div>
        </div>
      </div>

      <UnifiedDataTable
        data={comptes}
        loading={loading}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showViewToggle={false} // Disable internal toggle to avoid duplication
        onRowClick={handleViewDetail} // Open details on row click
        emptyMessage="Aucun compte trouvé"
        emptySubMessage="Créez votre premier compte financier"
        columns={compteColumns.filter(c => columnsConfig[c.key] !== false)}
        cardConfig={{
          titleKey: 'nom',
          titleRender: (item) => {
            const colors = getAccountColor(item.nom, item.type_compte);
            return (
              <div className="flex items-center gap-2">
                <span className={cn('p-1 rounded bg-gray-100 dark:bg-gray-800', colors.text)}>
                  {getAccountIcon(item.type_compte)}
                </span>
                <span className={cn('font-bold', colors.text)}>{item.nom}</span>
              </div>
            );
          },
          subtitleRender: (item) => (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-gray-500">{getAccountTypeLabel(item.type_compte)}</span>
              {item.numero_compte && <span className="font-mono text-xs text-gray-400">{item.numero_compte}</span>}
            </div>
          ),
          badgeKey: 'type_compte',
          badgeRender: (item) => {
            const colors = getAccountColor(item.nom, item.type_compte);
            return <Badge className={colors.badge}>{getAccountTypeLabel(item.type_compte)}</Badge>
          },
          infoFields: [
            {
              key: 'solde_actuel',
              label: 'Solde',
              render: (val, item) => {
                const colors = getAccountColor(item.nom, item.type_compte);
                return (
                  <span className={cn('text-lg font-bold', colors.text)}>
                    {item.devise === 'USD' ? '$' : item.devise === 'CNY' ? '¥' : ''}{val.toFixed(2)} {item.devise === 'CDF' ? 'FC' : ''}
                  </span>
                )
              }
            }
          ]
        }}
      />

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
                  onValueChange={(value: 'USD' | 'CDF' | 'CNY') =>
                    setFormData({ ...formData, devise: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="CDF">CDF</SelectItem>
                    <SelectItem value="CNY">CNY (RMB)</SelectItem>
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
              <button
                type="button"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 w-full sm:w-auto"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Annuler
              </button>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2 w-full sm:w-auto"
              >
                Mettre à jour
              </button>
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
  );
};

export default Comptes;
