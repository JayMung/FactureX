import React, { useState } from 'react';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { useComptesFinanciers } from '@/hooks/useComptesFinanciers';
import { Button } from '@/components/ui/button';
import { KpiCard } from '@/components/ui/kpi-card';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Edit2, Trash2, Wallet, Building, DollarSign, Grid3x3, List, Smartphone, CreditCard, Banknote, Eye, Building2, Wifi, MoreHorizontal as MoreH } from 'lucide-react';
import { TrendBadge } from '@/components/comptes/TrendBadge';
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
import { useSensitiveDataValue } from '@/hooks/useSensitiveData';

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
  const isHidden = useSensitiveDataValue();
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [compteForDetail, setCompteForDetail] = useState<CompteFinancier | null>(null);
  const [typeTab, setTypeTab] = useState<'all' | 'mobile_money' | 'banque' | 'cash'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [compteToDelete, setCompteToDelete] = useState<CompteFinancier | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDelete = (compte: CompteFinancier) => {
    setCompteToDelete(compte);
    setDeleteConfirmName('');
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!compteToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCompte(compteToDelete.id);
      showSuccess(`Compte "${compteToDelete.nom}" supprimé avec succès`);
      setDeleteDialogOpen(false);
      setCompteToDelete(null);
    } catch (error: any) {
      console.error('Error deleting compte:', error);
      showError(error.message || 'Erreur lors de la suppression du compte');
    } finally {
      setIsDeleting(false);
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

  const getBankCardGradient = (nom: string, type: string) => {
    const n = nom.toLowerCase();
    if (n.includes('airtel')) return 'from-red-600 via-red-500 to-rose-400';
    if (n.includes('orange')) return 'from-orange-500 via-orange-400 to-amber-300';
    if (n.includes('m-pesa') || n.includes('mpesa')) return 'from-green-700 via-green-500 to-emerald-400';
    if (n.includes('illicocash') || n.includes('illico')) return 'from-blue-700 via-blue-500 to-cyan-400';
    if (n.includes('alipay')) return 'from-blue-600 via-sky-500 to-cyan-400';
    if (n.includes('cash') || n.includes('bureau')) return 'from-green-700 via-green-500 to-green-400';
    if (type === 'banque') return 'from-slate-700 via-slate-500 to-blue-400';
    if (type === 'cash') return 'from-green-700 via-green-500 to-green-400';
    return 'from-purple-700 via-purple-500 to-violet-400';
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
          bg: 'bg-green-50 dark:bg-green-950/20',
          border: 'border-green-200 dark:border-green-800',
          icon: 'bg-primary',
          text: 'text-primary',
          badge: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
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

  const filteredComptes = typeTab === 'all' ? comptes : comptes.filter(c => c.type_compte === typeTab);

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
        const symbol = item.devise === 'USD' ? '$' : item.devise === 'CNY' ? '¥' : '';
        const suffix = item.devise === 'CDF' ? ' FC' : '';
        const formatted = `${symbol}${value.toFixed(2)}${suffix}`;
        const masked = isHidden ? formatted.replace(/[0-9]/g, '•') : formatted;
        return (
          <span className={cn('font-bold', colors.text)}>
            {masked}
          </span>
        )
      }
    },
    {
      key: 'actions',
      title: 'Actions',
      align: 'right' as const,
      render: (_: any, item: CompteFinancier) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleViewDetail(item); }}>
              <Eye className="mr-2 h-4 w-4" /> Voir détails
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(item); }}>
              <Edit2 className="mr-2 h-4 w-4" /> Modifier
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(item); }} className="text-red-600">
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

      {/* Summary Cards - FreshCart style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Comptes financiers" value={activeComptes.length} icon={Wallet} iconColor="#64748b" iconBg="#f1f5f9" />
        <KpiCard title="Solde USD" value={isHidden ? '$•••' : `$${totalUSD.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={DollarSign} iconColor="#21ac74" iconBg="#dcfce7" />
        <KpiCard title="Solde CDF" value={isHidden ? '••• FC' : `${totalCDF.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} FC`} icon={Banknote} iconColor="#3b82f6" iconBg="#dbeafe" />
        <KpiCard title="Solde CNY" value={isHidden ? '¥•••' : `¥${totalCNY.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} icon={CreditCard} iconColor="#8b5cf6" iconBg="#ede9fe" />
      </div>

      <FilterTabs
        tabs={[
          { id: 'all', label: 'Tous', count: comptes.length },
          { id: 'mobile_money', label: 'Mobile Money', count: mobileMoneyComptes.length },
          { id: 'banque', label: 'Banque', count: banqueComptes.length },
          { id: 'cash', label: 'Cash', count: cashComptes.length },
        ]}
        activeTab={typeTab}
        onTabChange={(id) => setTypeTab(id as 'all' | 'mobile_money' | 'banque' | 'cash')}
        variant="pills"
      />

      {/* Cards view — visual bank card style */}
      {(viewMode === 'cards' || (viewMode === 'auto' && isMobile)) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 rounded-2xl bg-gray-200 dark:bg-gray-700 animate-pulse" />
            ))
          ) : filteredComptes.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">Aucun compte trouvé</div>
          ) : (
            filteredComptes.map((item) => {
              const gradient = getBankCardGradient(item.nom, item.type_compte);
              const symbol = item.devise === 'USD' ? '$' : item.devise === 'CNY' ? '¥' : '';
              const suffix = item.devise === 'CDF' ? ' FC' : '';
              return (
                <div
                  key={item.id}
                  onClick={() => handleViewDetail(item)}
                  className={cn(
                    'relative overflow-hidden rounded-2xl p-5 cursor-pointer shadow-lg hover:shadow-xl transition-all hover:-translate-y-0.5',
                    `bg-gradient-to-br ${gradient}`
                  )}
                >
                  {/* Decorative circles */}
                  <div className="absolute -top-6 -right-6 h-32 w-32 rounded-full bg-white/10" />
                  <div className="absolute top-3 -right-3 h-16 w-16 rounded-full bg-white/10" />
                  <div className="absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-black/10" />

                  {/* Header row */}
                  <div className="relative flex items-start justify-between mb-6">
                    <div>
                      <span className="text-white/60 text-[10px] font-semibold uppercase tracking-widest">
                        {getAccountTypeLabel(item.type_compte)}
                      </span>
                      <p className="text-white font-bold text-lg leading-tight mt-0.5">{item.nom}</p>
                      {item.numero_compte && (
                        <p className="text-white/50 text-xs font-mono mt-0.5">{item.numero_compte}</p>
                      )}
                    </div>
                    <div className="text-white/60">
                      {item.type_compte === 'mobile_money' ? <Wifi className="h-6 w-6" /> :
                       item.type_compte === 'banque' ? <Building2 className="h-6 w-6" /> :
                       <Banknote className="h-6 w-6" />}
                    </div>
                  </div>

                  {/* Balance */}
                  <div className="relative">
                    <p className="text-white/60 text-[10px] uppercase tracking-widest">Solde actuel</p>
                    <p className="text-2xl font-bold text-white mt-0.5">
                      {isHidden ? (symbol + '•••' + suffix) : `${symbol}${item.solde_actuel.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${suffix}`}
                    </p>
                    <div className="mt-1.5">
                      <TrendBadge compteId={item.id} soldeActuel={item.solde_actuel} devise={item.devise} variant="card" />
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="absolute top-4 right-4">
                    {!item.is_active && (
                      <span className="bg-red-500/40 text-white border border-red-400/40 text-[10px] px-2 py-0.5 rounded-full font-medium">
                        Inactif
                      </span>
                    )}
                  </div>

                  {/* Actions overlay */}
                  <div className="relative mt-4 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg p-1.5 transition-colors"
                      onClick={() => handleEdit(item)}
                      title="Modifier"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="text-white/70 hover:text-red-200 bg-white/10 hover:bg-red-500/30 rounded-lg p-1.5 transition-colors"
                      onClick={() => handleDelete(item)}
                      title="Supprimer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
      <UnifiedDataTable
        data={filteredComptes}
        loading={loading}
        viewMode="table"
        onViewModeChange={setViewMode}
        showViewToggle={false}
        onRowClick={handleViewDetail}
        emptyMessage="Aucun compte trouvé"
        emptySubMessage="Créez votre premier compte financier"
        columns={compteColumns.filter(c => columnsConfig[c.key] !== false)}
      />
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

      {/* Modal de suppression avec confirmation du nom */}
      <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!open && !isDeleting) {
          setDeleteDialogOpen(false);
          setCompteToDelete(null);
          setDeleteConfirmName('');
        }
      }}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-950">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <DialogTitle className="text-lg">Supprimer le compte</DialogTitle>
            </div>
            <DialogDescription className="text-sm text-gray-600 dark:text-gray-400 pt-1">
              Cette action est <strong>irréversible</strong>. Le compte et tout son historique de mouvements seront définitivement supprimés.
            </DialogDescription>
          </DialogHeader>

          {compteToDelete && (
            <div className="space-y-4 py-2">
              {/* Aperçu du compte à supprimer */}
              <div className={cn(
                'rounded-xl p-4 flex items-center gap-3',
                `bg-gradient-to-br ${getBankCardGradient(compteToDelete.nom, compteToDelete.type_compte)}`
              )}>
                <div className="text-white/80">
                  {compteToDelete.type_compte === 'mobile_money' ? <Wifi className="h-5 w-5" /> :
                   compteToDelete.type_compte === 'banque' ? <Building2 className="h-5 w-5" /> :
                   <Banknote className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-bold text-white text-sm">{compteToDelete.nom}</p>
                  <p className="text-white/60 text-xs">
                    {compteToDelete.devise === 'USD' ? '$' : compteToDelete.devise === 'CNY' ? '¥' : ''}
                    {compteToDelete.solde_actuel.toFixed(2)}
                    {compteToDelete.devise === 'CDF' ? ' FC' : ''}
                  </p>
                </div>
              </div>

              {/* Saisie de confirmation */}
              <div className="space-y-2">
                <Label className="text-sm text-gray-700 dark:text-gray-300">
                  Pour confirmer, saisissez le nom du compte :{' '}
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {compteToDelete.nom}
                  </span>
                </Label>
                <Input
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder={`Tapez "${compteToDelete.nom}"`}
                  className={cn(
                    'transition-colors',
                    deleteConfirmName === compteToDelete.nom
                      ? 'border-red-500 focus-visible:ring-red-500'
                      : ''
                  )}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && deleteConfirmName === compteToDelete.nom && !isDeleting) {
                      confirmDelete();
                    }
                  }}
                />
                {deleteConfirmName.length > 0 && deleteConfirmName !== compteToDelete.nom && (
                  <p className="text-xs text-red-500">Le nom ne correspond pas.</p>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setCompteToDelete(null);
                setDeleteConfirmName('');
              }}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              onClick={confirmDelete}
              disabled={!compteToDelete || deleteConfirmName !== compteToDelete.nom || isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer définitivement
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Comptes;
