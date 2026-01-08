"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  Filter,
  Eye,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  Edit,
  Trash2,
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Wallet,
  ChevronDown,
  MoreHorizontal,
  Copy
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTransactions } from '../hooks/useTransactions';
import { usePermissions } from '../hooks/usePermissions';
import Pagination from '../components/ui/pagination-custom';
import TransactionFormFinancial from '@/components/forms/TransactionFormFinancial';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import TransactionDetailsModal from '../components/modals/TransactionDetailsModal';
import PermissionGuard from '../components/auth/PermissionGuard';
import ProtectedRouteEnhanced from '../components/auth/ProtectedRouteEnhanced';
import { TransactionStats } from '@/components/transactions/TransactionStats';
import { StatusBadge } from '@/components/transactions/StatusBadge';
import type { Transaction } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { formatCurrency } from '../utils/formatCurrency';
import { supabase } from '@/integrations/supabase/client';
import {
  sanitizeUserContent,
  validateContentSecurity,
  sanitizeTransactionMotif,
  sanitizePaymentMethod,
  sanitizeCSV
} from '@/lib/security/content-sanitization';

import { getDateRange, PeriodFilter } from '@/utils/dateUtils';
import { PeriodFilterTabs } from '@/components/ui/period-filter-tabs';
import { UnifiedDataTable } from '@/components/ui/unified-data-table';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { ColumnSelector } from '@/components/ui/column-selector';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import { useIsMobile } from '@/hooks/use-mobile';

// Helper function to get columns compatible with UnifiedDataTable
const getTransactionColumnsCombined = (props: any) => {
  const { activeTab, onView, onEdit, onDuplicate, onDelete, onStatusChange, canUpdate, canDelete, generateReadableId, categoriesMap } = props;

  const defaultActions = {
    key: 'actions',
    title: '',
    align: 'right' as const,
    render: (_: any, item: any) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onView(item)}>
            <Eye className="mr-2 h-4 w-4" /> Voir détails
          </DropdownMenuItem>
          {canUpdate && (
            <DropdownMenuItem onClick={() => onEdit(item)}>
              <Edit className="mr-2 h-4 w-4" /> Modifier
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => onDuplicate(item)}>
            <Copy className="mr-2 h-4 w-4" /> Dupliquer
          </DropdownMenuItem>
          {canDelete && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(item)} className="text-red-600">
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  };

  if (activeTab === 'clients') {
    return [
      {
        key: 'id',
        title: 'ID',
        sortable: true,
        render: (_: any, item: any, index: number) => (
          <button
            onClick={(e) => { e.stopPropagation(); onView(item); }}
            className="text-blue-600 font-medium font-mono text-xs whitespace-nowrap hover:underline focus:outline-none"
          >
            {generateReadableId(item.id, index)}
          </button>
        )
      },
      {
        key: 'client',
        title: 'Client',
        sortable: true,
        render: (_: any, item: any) => (
          <div className="flex flex-col">
            <span className="font-bold whitespace-nowrap">{item.client?.nom || '-'}</span>
          </div>
        )
      },
      {
        key: 'date_paiement',
        title: 'Date',
        sortable: true,
        render: (value: any) => (
          <span className="text-gray-600 whitespace-nowrap">
            {new Date(value).toLocaleDateString()}
          </span>
        )
      },
      {
        key: 'montant',
        title: 'Montant',
        sortable: true,
        render: (value: any, item: any) => (
          <span className="font-bold text-gray-900 whitespace-nowrap">
            {formatCurrency(value, item.devise)}
          </span>
        )
      },
      {
        key: 'motif',
        title: 'Motif',
        sortable: true,
        render: (value: any, item: any) => {
          // Try to find the category definition to get its color
          // For commercial transactions, the 'motif' often matches the category name
          const category = categoriesMap?.[value] || categoriesMap?.[item.categorie];

          return (
            <Badge
              variant="outline"
              className="font-normal whitespace-nowrap border-0"
              style={{
                backgroundColor: category?.couleur ? `${category.couleur}15` : '#f3f4f6',
                color: category?.couleur || '#374151',
                border: `1px solid ${category?.couleur ? `${category.couleur}30` : '#e5e7eb'}`
              }}
            >
              {value}
            </Badge>
          );
        }
      },
      {
        key: 'statut',
        title: 'Statut',
        sortable: true,
        render: (value: any, item: any) => (
          <StatusBadge
            status={value}
            transaction={item}
            onStatusChange={onStatusChange}
            canUpdate={canUpdate}
          />
        )
      },
      {
        key: 'frais',
        title: 'Frais',
        sortable: true,
        render: (value: any) => (
          <span className="font-medium text-gray-600 whitespace-nowrap">
            {formatCurrency(value || 0, 'USD')}
          </span>
        )
      },
      {
        key: 'benefice',
        title: 'Bénéfice',
        sortable: true,
        render: (value: any) => (
          <span className="font-bold text-green-600 whitespace-nowrap">
            {formatCurrency(value || 0, 'USD')}
          </span>
        )
      },
      {
        key: 'montant_cny',
        title: 'CNY',
        sortable: true,
        render: (value: any) => (
          <span className="font-medium text-blue-600 whitespace-nowrap">
            {value ? formatCurrency(value, 'CNY') : '-'}
          </span>
        )
      },
      {
        key: 'mode_paiement',
        title: 'Compte',
        sortable: true,
        render: (value: any) => (
          <span className="font-medium whitespace-nowrap">
            {value === 'AIRTEL_MONEY' ? 'Airtel Money' : value === 'CASH' ? 'Cash' : value === 'M_PESA' ? 'M-Pesa' : value?.replace('_', ' ')}
          </span>
        )
      },
      defaultActions
    ];
  }

  if (activeTab === 'internes') {
    return [
      {
        key: 'id',
        title: 'ID',
        sortable: true,
        render: (_: any, item: any, index: number) => (
          <button
            onClick={(e) => { e.stopPropagation(); onView(item); }}
            className="text-blue-600 font-medium font-mono text-xs whitespace-nowrap hover:underline focus:outline-none"
          >
            {generateReadableId(item.id, index)}
          </button>
        )
      },
      {
        key: 'date_paiement',
        title: 'Date',
        sortable: true,
        render: (value: any) => (
          <span className="text-gray-600 whitespace-nowrap font-medium">
            {new Date(value).toLocaleDateString()}
          </span>
        )
      },
      {
        key: 'type_transaction',
        title: 'Type',
        sortable: true,
        render: (value: any) => (
          <Badge variant={value === 'revenue' ? 'default' : 'destructive'}
            className={value === 'revenue' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 'bg-red-100 text-red-800 hover:bg-red-100'}>
            {value === 'revenue' ? '↑ Revenu' : '↓ Dépense'}
          </Badge>
        )
      },
      {
        key: 'montant',
        title: 'Montant',
        sortable: true,
        render: (value: any, item: any) => (
          <span className={item.type_transaction === 'revenue' ? "font-bold text-green-600 whitespace-nowrap" : "font-bold text-red-600 whitespace-nowrap"}>
            {item.type_transaction === 'revenue' ? '+' : '-'}{formatCurrency(value, item.devise)}
          </span>
        )
      },
      {
        key: 'finance_category',
        title: 'Catégorie',
        sortable: true,
        render: (_: any, item: any) => {
          // Find category by name if stored as name in item.finance_category or item.categorie
          const catName = item.finance_category?.nom || item.categorie || item.category || 'Non catégorisé';
          const category = categoriesMap?.[catName];

          return (
            <Badge
              variant="outline"
              className="font-normal whitespace-nowrap border-gray-200"
              style={{
                backgroundColor: category?.couleur ? `${category.couleur}15` : '#f9fafb',
                color: category?.couleur || '#374151',
                borderColor: category?.couleur ? `${category.couleur}30` : '#e5e7eb'
              }}
            >
              {catName}
            </Badge>
          );
        }
      },
      {
        key: 'mode_paiement',
        title: 'Compte',
        sortable: true,
        render: (_: any, item: any) => {
          const isExpense = item.type_transaction === 'depense';
          const accountName = isExpense
            ? item.compte_source?.nom
            : item.compte_destination?.nom;

          return (
            <span className={`font-medium whitespace-nowrap ${isExpense ? 'text-red-600' : 'text-emerald-600'}`}>
              {accountName || item.mode_paiement?.replace('_', ' ') || '-'}
            </span>
          );
        }
      },
      {
        key: 'notes',
        title: 'Notes',
        sortable: false,
        render: (value: any) => (
          <span className="text-gray-500 text-sm truncate max-w-[150px] inline-block" title={value}>
            {value || '-'}
          </span>
        )
      },
      defaultActions
    ];
  }

  if (activeTab === 'swaps') {
    return [
      {
        key: 'id',
        title: 'ID',
        sortable: true,
        render: (_: any, item: any, index: number) => (
          <button
            onClick={(e) => { e.stopPropagation(); onView(item); }}
            className="text-blue-600 font-medium font-mono text-xs whitespace-nowrap hover:underline focus:outline-none"
          >
            {generateReadableId(item.id, index)}
          </button>
        )
      },
      {
        key: 'date_paiement',
        title: 'Date',
        sortable: true,
        render: (value: any) => (
          <span className="text-gray-600 whitespace-nowrap font-medium">
            {new Date(value).toLocaleDateString()}
          </span>
        )
      },
      {
        key: 'compte_source',
        title: 'Source',
        sortable: true,
        render: (_: any, item: any) => (
          <span className="text-red-500 font-medium whitespace-nowrap">
            {item.compte_source?.nom || '-'}
          </span>
        )
      },
      {
        key: 'compte_destination',
        title: 'Destination',
        sortable: true,
        render: (_: any, item: any) => (
          <span className="text-emerald-500 font-medium whitespace-nowrap">
            {item.compte_destination?.nom || '-'}
          </span>
        )
      },
      {
        key: 'montant',
        title: 'Montant',
        sortable: true,
        render: (value: any, item: any) => (
          <span className="font-bold text-blue-600 whitespace-nowrap">
            {formatCurrency(value, item.devise)}
          </span>
        )
      },
      {
        key: 'notes',
        title: 'Notes',
        sortable: true,
        render: (value: any) => (
          <span className="text-gray-500 text-sm truncate max-w-[200px] block" title={value || ''}>
            {value || '-'}
          </span>
        )
      },
      defaultActions
    ];
  }

  // Column definitions for other tabs (keep simplified version or previous logic)
  return [
    {
      key: 'date_paiement',
      title: 'Date',
      sortable: true,
      render: (value: any) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-gray-100">
            {new Date(value).toLocaleDateString()}
          </span>
          <span className="text-xs text-gray-500">
            {new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )
    },
    {
      key: 'motif',
      title: 'Motif',
      sortable: true,
      render: (value: any, item: any) => (
        <div className="flex flex-col max-w-[200px]">
          <span className="font-medium truncate" title={value}>{value}</span>
          {item.client && (
            <span className="text-xs text-blue-600 dark:text-blue-400 truncate">
              {item.client.nom}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'type_transaction',
      title: 'Type',
      sortable: true,
      hiddenOn: 'sm' as const,
      render: (value: any) => (
        <Badge variant={value === 'revenue' ? 'default' : value === 'depense' ? 'destructive' : 'secondary'}
          className={value === 'revenue' ? 'bg-green-100 text-green-800' : value === 'depense' ? 'bg-red-100 text-red-800' : ''}>
          {value === 'revenue' ? 'Entrée' : value === 'depense' ? 'Sortie' : 'Transfert'}
        </Badge>
      )
    },
    {
      key: 'montant',
      title: 'Montant',
      sortable: true,
      align: 'right' as const,
      render: (value: any, item: any) => (
        <div className="flex flex-col items-end">
          <span className={item.type_transaction === 'revenue' ? "font-bold text-green-600" : "font-bold text-red-600"}>
            {formatCurrency(value, item.devise)}
          </span>
          {item.montant_cny && (
            <span className="text-xs text-purple-600">
              {formatCurrency(item.montant_cny, 'CNY')}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'statut',
      title: 'Statut',
      sortable: true,
      align: 'center' as const,
      render: (value: any, item: any) => (
        <StatusBadge
          status={value}
          transaction={item}
          onStatusChange={onStatusChange}
          canUpdate={canUpdate}
        />
      )
    },
    {
      key: 'mode_paiement',
      title: 'Moyen',
      sortable: true,
      hiddenOn: 'md' as const,
      render: (value: any) => <span className="text-sm text-gray-600 capitalization">{value?.replace('_', ' ')}</span>
    },
    defaultActions
  ];
};

const TransactionsProtected: React.FC = () => {
  usePageSetup({
    title: 'Gestion des Transactions',
    subtitle: 'Gérez toutes vos opérations financières'
  });

  // État pour l'onglet actif
  const [activeTab, setActiveTab] = useState<'clients' | 'internes' | 'swaps'>('clients');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | undefined>();
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
  const [bulkActionOpen, setBulkActionOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState('date_paiement');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'auto'>('auto');
  const [columnsConfig, setColumnsConfig] = useState<Record<string, boolean>>({});
  const isMobile = useIsMobile();

  // États pour les modales de confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);
  const [validateDialogOpen, setValidateDialogOpen] = useState(false);
  const [transactionToValidate, setTransactionToValidate] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [transactionToView, setTransactionToView] = useState<Transaction | null>(null);
  const { checkPermission } = usePermissions();
  const [categoriesMap, setCategoriesMap] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase.from('finance_categories').select('*');
      if (data) {
        const map = data.reduce((acc: any, cat: any) => {
          acc[cat.nom] = cat; // Map by name as 'transactions.categorie' likely stores the name
          if (cat.code) acc[cat.code] = cat;
          return acc;
        }, {});
        setCategoriesMap(map);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Filtrer selon l'onglet actif et la période
  const memoFilters = useMemo(() => {
    const baseFilters: any = {
      status: statusFilter === 'all' ? undefined : statusFilter,
      currency: currencyFilter === 'all' ? undefined : currencyFilter,
      search: searchTerm || undefined,
    };

    // Ajouter le filtre de période
    if (periodFilter !== 'all') {
      const { current } = getDateRange(periodFilter);
      if (current.start && current.end) {
        baseFilters.dateFrom = current.start.toISOString();
        baseFilters.dateTo = current.end.toISOString();
      }
    }

    // Filtrer selon l'onglet
    if (activeTab === 'clients') {
      // Transactions commerciales (Commande, Transfert, Paiement Colis) - AVEC client
      baseFilters.motifCommercial = true;
      baseFilters.isSwap = false; // Exclure les swaps (transferts sans client)
    } else if (activeTab === 'internes') {
      // Opérations internes (dépenses et revenus sans client)
      baseFilters.typeTransaction = ['depense', 'revenue'];
      baseFilters.excludeMotifs = ['Commande', 'Commande (Facture)', 'Transfert', 'Transfert Reçu', 'Paiement Colis'];
    } else if (activeTab === 'swaps') {
      // Swaps entre comptes (transferts SANS client)
      baseFilters.typeTransaction = ['transfert'];
      baseFilters.isSwap = true; // Uniquement les swaps (transferts sans client)
    }

    return baseFilters;
  }, [statusFilter, currencyFilter, searchTerm, activeTab, periodFilter]);

  const {
    transactions,
    loading,
    isCreating,
    isUpdating,
    error,
    pagination,
    globalTotals,
    updateTransaction,
    deleteTransaction,
    refetch
  } = useTransactions(currentPage, memoFilters,
    // Only pass server-supported columns to the hook
    ['finance_category', 'mode_paiement'].includes(sortColumn) ? 'created_at' : sortColumn,
    sortDirection
  );

  // Client-side sorting for complex columns
  const sortedTransactions = useMemo(() => {
    if (!['finance_category', 'mode_paiement'].includes(sortColumn)) {
      return transactions;
    }

    return [...transactions].sort((a: any, b: any) => {
      let valA = '';
      let valB = '';

      if (sortColumn === 'finance_category') {
        valA = a.finance_category?.nom || a.categorie || a.category || '';
        valB = b.finance_category?.nom || b.categorie || b.category || '';
      } else if (sortColumn === 'mode_paiement') {
        if (activeTab === 'internes') {
          const isExpenseA = a.type_transaction === 'depense';
          const isExpenseB = b.type_transaction === 'depense';
          valA = isExpenseA ? a.compte_source?.nom : a.compte_destination?.nom;
          valB = isExpenseB ? b.compte_source?.nom : b.compte_destination?.nom;
        }
        // Fallback or standard value
        valA = valA || a.mode_paiement || '';
        valB = valB || b.mode_paiement || '';
      }

      const comparison = valA.localeCompare(valB);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [transactions, sortColumn, sortDirection, activeTab]);

  const commercialTransactions = sortedTransactions;

  // Fonction de tri côté serveur
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      // Inverser la direction si on clique sur la même colonne
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Nouvelle colonne, commencer par ordre descendant
      setSortColumn(column);
      setSortDirection('desc');
    }
    // Retourner à la première page lors du tri
    setCurrentPage(1);
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!transactionToDelete) return;

    setIsDeleting(true);
    try {
      await deleteTransaction(transactionToDelete.id);
      setDeleteDialogOpen(false);
      setTransactionToDelete(null);

      // La mise à jour optimiste dans useTransactions gère déjà l'actualisation
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      showError(error.message || 'Erreur lors de la suppression de la transaction');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleValidateTransaction = (transaction: Transaction) => {
    setTransactionToValidate(transaction);
    setValidateDialogOpen(true);
  };

  const confirmValidateTransaction = async () => {
    if (!transactionToValidate) return;

    setIsValidating(true);
    try {
      await updateTransaction(transactionToValidate.id, {
        statut: 'Servi',
        valide_par: currentUserId || undefined,
        date_validation: new Date().toISOString()
      });
      setValidateDialogOpen(false);
      setTransactionToValidate(null);

      // La mutation dans useTransactions gère déjà l'actualisation
    } catch (error: any) {
      console.error('Erreur lors de la validation:', error);
      showError(error.message || 'Erreur lors de la validation');
    } finally {
      setIsValidating(false);
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsFormOpen(true);
  };

  const handleAddTransaction = () => {
    setSelectedTransaction(undefined);
    setIsFormOpen(true);
  };

  const handleViewTransaction = (transaction: Transaction) => {
    setTransactionToView(transaction);
    setDetailsModalOpen(true);
  };

  const handleDuplicateTransaction = (transaction: Transaction) => {
    // Open form with transaction data but without ID (for duplication)
    const duplicateData = {
      ...transaction,
      id: undefined,
      created_at: undefined,
      updated_at: undefined,
      date_validation: undefined,
      valide_par: undefined,
      statut: 'En attente'
    } as Transaction;
    setSelectedTransaction(duplicateData);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    // Forcer le rafraîchissement de la liste des transactions de cette page
    console.log('📋 Form success - forcing refetch');
    refetch();
    setSelectedTransaction(undefined);
  };

  const handleStatusChange = async (transaction: Transaction, newStatus: string) => {
    try {
      await updateTransaction(transaction.id, {
        statut: newStatus,
        ...(newStatus === 'Servi' ? {
          valide_par: currentUserId || undefined,
          date_validation: new Date().toISOString()
        } : {})
      });
      showSuccess(`Statut mis à jour: ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating status:', error);
      showError(error.message || 'Erreur lors de la mise à jour du statut');
    }
  };

  // Fonctions de sélection multiple
  const handleSelectAll = () => {
    if (selectedTransactions.size === transactions.length) {
      setSelectedTransactions(new Set());
    } else {
      setSelectedTransactions(new Set(transactions.map(t => t.id)));
    }
  };

  const handleSelectTransaction = (id: string) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedTransactions(newSelected);
  };

  const handleBulkDelete = async () => {
    if (selectedTransactions.size === 0) return;

    try {
      setIsDeleting(true);
      const promises = Array.from(selectedTransactions).map(id => deleteTransaction(id));
      await Promise.all(promises);
      showSuccess(`${selectedTransactions.size} transaction(s) supprimée(s)`);
      setSelectedTransactions(new Set());
      setBulkActionOpen(false);
    } catch (error: any) {
      showError('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedTransactions.size === 0) return;

    try {
      const promises = Array.from(selectedTransactions).map(id =>
        updateTransaction(id, {
          statut: newStatus,
          ...(newStatus === 'Servi' ? {
            valide_par: currentUserId || undefined,
            date_validation: new Date().toISOString()
          } : {})
        })
      );
      await Promise.all(promises);
      showSuccess(`${selectedTransactions.size} transaction(s) mise(s) à jour`);
      setSelectedTransactions(new Set());
      setBulkActionOpen(false);
    } catch (error: any) {
      showError('Erreur lors de la mise à jour');
    }
  };

  // Calculer les totaux des transactions sélectionnées
  const calculateSelectedTotals = () => {
    const selectedTxs = transactions.filter(t => selectedTransactions.has(t.id));

    const totalUSD = selectedTxs
      .filter(t => t.devise === 'USD')
      .reduce((sum, t) => sum + t.montant, 0);

    const totalCDF = selectedTxs
      .filter(t => t.devise === 'CDF')
      .reduce((sum, t) => sum + t.montant, 0);

    const totalCNY = selectedTxs
      .reduce((sum, t) => sum + (t.montant_cny || 0), 0);

    const totalFrais = selectedTxs
      .reduce((sum, t) => sum + t.frais, 0);

    const totalBenefice = selectedTxs
      .reduce((sum, t) => sum + t.benefice, 0);

    const totalDepenses = selectedTxs
      .reduce((sum, t) => {
        // Si c'est une dépense explicite
        if (t.type_transaction === 'depense') {
          return sum + t.montant;
        }
        // Sinon, c'est la commission partenaire (Frais - Bénéfice)
        return sum + ((t.frais || 0) - (t.benefice || 0));
      }, 0);

    return { totalUSD, totalCDF, totalCNY, totalFrais, totalBenefice, totalDepenses };
  };

  const { totalUSD, totalFrais, totalBenefice, totalDepenses } = globalTotals;

  const generateReadableId = (transactionId: string, index: number) => {
    // Utiliser les derniers caractères de l'ID UUID pour garantir l'unicité
    const shortId = transactionId.slice(-6).toUpperCase();
    const paddedNumber = (index + 1).toString().padStart(3, '0');
    return `TX${paddedNumber}-${shortId}`;
  };

  const exportTransactions = () => {
    const csv = [
      ['client', 'montant', 'devise', 'motif', 'mode_paiement', 'statut', 'date_paiement', 'frais', 'benefice'],
      ...transactions.map(transaction => [
        transaction.client?.nom || '',
        transaction.montant.toString(),
        transaction.devise,
        transaction.motif,
        transaction.mode_paiement,
        transaction.statut,
        transaction.created_at,
        transaction.frais.toString(),
        transaction.benefice.toString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showSuccess('Transactions exportées avec succès');
  };

  // Analyse temporaire des anciens transferts
  useEffect(() => {
    const analyzeOldTransfers = async () => {
      console.log('🔍 Analysing old transfers...');
      const { data } = await supabase
        .from('transactions')
        .select('created_at, motif, type_transaction, montant, frais, benefice')
        .ilike('motif', 'Transfert') // Chercher exactement "Transfert" (anciens)
        .eq('type_transaction', 'revenue')
        .order('created_at', { ascending: false })
        .limit(5);

      if (data) {
        console.table(data.map(t => ({
          ...t,
          ratio_frais: t.montant ? (t.frais / t.montant * 100).toFixed(2) + '%' : 'N/A',
          ratio_benefice: t.montant ? (t.benefice / t.montant * 100).toFixed(2) + '%' : 'N/A',
          partenaire_estime: t.montant ? ((t.frais - t.benefice) / t.montant * 100).toFixed(2) + '%' : 'N/A'
        })));
      }
    };

    analyzeOldTransfers();
  }, []);

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-red-600 mb-2">Erreur de chargement des transactions</p>
            <p className="text-gray-500">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  // Titre et bouton dynamiques selon l'onglet
  const getTabConfig = () => {
    switch (activeTab) {
      case 'clients':
        return {
          title: 'Transactions Client',
          buttonText: 'Nouvelle Transaction',
          buttonTextMobile: 'Nouvelle',
          defaultType: 'revenue' as const
        };
      case 'internes':
        return {
          title: 'Opérations Internes',
          buttonText: 'Nouvelle Opération',
          buttonTextMobile: 'Nouvelle',
          defaultType: 'depense' as const
        };
      case 'swaps':
        return {
          title: 'Swaps entre Comptes',
          buttonText: 'Nouveau Swap',
          buttonTextMobile: 'Swap',
          defaultType: 'transfert' as const
        };
    }
  };

  const tabConfig = getTabConfig();

  return (
    <ProtectedRouteEnhanced requiredModule="transactions" requiredPermission="read">
      <Layout>
        <div className="space-y-4 md:space-y-6 p-2 sm:p-4 md:p-0 animate-in fade-in duration-300">
          {/* Bulk Actions Bar */}
          {selectedTransactions.size > 0 && (() => {
            const selectedTotals = calculateSelectedTotals();
            return (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col space-y-3 sm:space-y-4">
                    {/* Première ligne: Sélection et actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                        <Badge variant="default" className="bg-blue-600">
                          {selectedTransactions.size} sélectionnée(s)
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTransactions(new Set())}
                          className="w-full sm:w-auto"
                        >
                          Désélectionner tout
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full sm:w-auto">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Changer le statut
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('En attente')}>En attente</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('Servi')}>Servi</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('Remboursé')}>Remboursé</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleBulkStatusChange('Annulé')}>Annulé</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <PermissionGuard module="finances" permission="delete">
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                            className="w-full sm:w-auto"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Supprimer
                          </Button>
                        </PermissionGuard>
                      </div>
                    </div>

                    {/* Deuxième ligne: Résumé des montants */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm border-t border-blue-200 pt-3">
                      <div className="flex items-center gap-2 sm:gap-4">
                        <DollarSign className="h-4 w-4 text-green-600" />
                        <span className="font-medium text-gray-700">Montant USD:</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(selectedTotals.totalUSD, 'USD')}
                        </span>
                      </div>
                      {selectedTotals.totalCDF > 0 && (
                        <div className="flex items-center gap-2 sm:gap-4">
                          <Wallet className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-gray-700">Montant CDF:</span>
                          <span className="font-bold text-blue-600">
                            {formatCurrency(selectedTotals.totalCDF, 'CDF')}
                          </span>
                        </div>
                      )}
                      {selectedTotals.totalCNY > 0 && (
                        <div className="flex items-center gap-2 sm:gap-4">
                          <span className="font-medium text-gray-700">CNY:</span>
                          <span className="font-bold text-purple-600">
                            {formatCurrency(selectedTotals.totalCNY, 'CNY')}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 sm:gap-4">
                        <TrendingUp className="h-4 w-4 text-orange-600" />
                        <span className="font-medium text-gray-700">Bénéfice:</span>
                        <span className="font-bold text-orange-600">
                          {formatCurrency(selectedTotals.totalBenefice, 'USD')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4">
                        <Receipt className="h-4 w-4 text-gray-600" />
                        <span className="font-medium text-gray-700">Frais:</span>
                        <span className="font-bold text-gray-600">
                          {formatCurrency(selectedTotals.totalFrais, 'USD')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4">
                        <TrendingDown className="h-4 w-4 text-red-600" />
                        <span className="font-medium text-gray-700">Dépenses:</span>
                        <span className="font-bold text-red-600">
                          {formatCurrency(selectedTotals.totalDepenses, 'USD')}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Tabs de navigation */}
          <Tabs value={activeTab} onValueChange={(value) => {
            setActiveTab(value as 'clients' | 'internes' | 'swaps');
            setCurrentPage(1); // Reset pagination on tab change
            setSelectedTransactions(new Set()); // Clear selection
          }} className="w-full">
            <div className="flex justify-center mb-6">
              <TabsList className="inline-flex w-full max-w-2xl p-1.5 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl gap-1">
                <TabsTrigger
                  value="clients"
                  className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all
                    text-gray-500 dark:text-gray-400
                    hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50
                    data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-emerald-500/20"
                >
                  <DollarSign className="h-4 w-4" />
                  <span className="hidden sm:inline">Transactions Client</span>
                  <span className="sm:hidden">Clients</span>
                </TabsTrigger>
                <TabsTrigger
                  value="internes"
                  className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all
                    text-gray-500 dark:text-gray-400
                    hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50
                    data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-orange-500/20"
                >
                  <Receipt className="h-4 w-4" />
                  <span className="hidden sm:inline">Opérations Internes</span>
                  <span className="sm:hidden">Internes</span>
                </TabsTrigger>
                <TabsTrigger
                  value="swaps"
                  className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all
                    text-gray-500 dark:text-gray-400
                    hover:text-gray-700 dark:hover:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-700/50
                    data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-blue-500/20"
                >
                  <Wallet className="h-4 w-4" />
                  <span className="hidden sm:inline">Swaps Comptes</span>
                  <span className="sm:hidden">Swaps</span>
                </TabsTrigger>
              </TabsList>
            </div>


            {/* Stats Cards - Design System */}
            <div className="mb-6 space-y-4">
              <div className="flex justify-end">
                <PeriodFilterTabs
                  period={periodFilter}
                  onPeriodChange={setPeriodFilter}
                  showAllOption={true}
                />
              </div>
              <TransactionStats globalTotals={globalTotals} />
            </div>

            {/* Filters */}
            <div className="flex flex-col xl:flex-row gap-4 mb-6">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <FilterTabs
                  tabs={[
                    { id: 'all', label: 'Tous' },
                    { id: 'Servi', label: 'Servi' },
                    { id: 'En attente', label: 'En attente' },
                    { id: 'Remboursé', label: 'Remboursé' },
                    { id: 'Annulé', label: 'Annulé' },
                  ]}
                  activeTab={statusFilter}
                  onTabChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}
                  variant="default"
                />

                <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-1 hidden sm:block" />

                <FilterTabs
                  tabs={[
                    { id: 'all', label: 'Devises' },
                    { id: 'USD', label: 'USD' },
                    { id: 'CDF', label: 'CDF' },
                  ]}
                  activeTab={currencyFilter}
                  onTabChange={(val) => { setCurrencyFilter(val); setCurrentPage(1); }}
                  variant="default"
                />
              </div>
            </div>

            {/* Transactions Table */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <CardTitle>{tabConfig.title}</CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <ExportDropdown
                      onExport={() => exportTransactions()} // Reuse existing export logic
                      disabled={transactions.length === 0}
                    />
                    <ColumnSelector
                      columns={getTransactionColumnsCombined({
                        activeTab,
                        onView: handleViewTransaction,
                        onEdit: handleEditTransaction,
                        onDuplicate: handleDuplicateTransaction,
                        onDelete: handleDeleteTransaction,
                        onStatusChange: handleStatusChange,
                        canUpdate: checkPermission('finances', 'update'),
                        canDelete: checkPermission('finances', 'delete'),
                        generateReadableId,
                        categoriesMap
                      }).map(c => ({ key: c.key as string, label: c.title, visible: columnsConfig[c.key as string] !== false }))}
                      onColumnsChange={(cols) => setColumnsConfig(cols.reduce((acc, c) => ({ ...acc, [c.key]: c.visible }), {}))}
                    />

                    <PermissionGuard module="finances" permission="create">
                      <Button className="bg-green-500 hover:bg-green-600 w-full sm:w-auto" onClick={handleAddTransaction}>
                        <Plus className="mr-2 h-4 w-4" />
                        <span className="hidden sm:inline">{tabConfig.buttonText}</span>
                        <span className="sm:hidden">{tabConfig.buttonTextMobile}</span>
                      </Button>
                    </PermissionGuard>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <UnifiedDataTable
                  data={commercialTransactions}
                  loading={loading}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  emptyMessage="Aucune transaction trouvée"
                  emptySubMessage="Commencez par créer votre première transaction"
                  onSort={handleSort}
                  sortKey={sortColumn}
                  sortDirection={sortDirection}
                  bulkSelect={{
                    selected: Array.from(selectedTransactions),
                    onSelectAll: (checked) => {
                      if (checked) handleSelectAll();
                      else setSelectedTransactions(new Set());
                    },
                    onSelectItem: (id, checked) => handleSelectTransaction(id),
                    getId: (transaction: Transaction) => transaction.id,
                    isAllSelected: selectedTransactions.size === transactions.length && transactions.length > 0,
                    isPartiallySelected: selectedTransactions.size > 0 && selectedTransactions.size < transactions.length
                  }}
                  columns={getTransactionColumnsCombined({
                    activeTab,
                    onView: handleViewTransaction,
                    onEdit: handleEditTransaction,
                    onDuplicate: handleDuplicateTransaction,
                    onDelete: handleDeleteTransaction,
                    onStatusChange: handleStatusChange,
                    canUpdate: checkPermission('finances', 'update'),
                    canDelete: checkPermission('finances', 'delete'),
                    generateReadableId,
                    categoriesMap
                  }).filter(c => columnsConfig[c.key] !== false)}
                  cardConfig={{
                    titleKey: 'motif',
                    titleRender: (item, index) => (
                      <div className="flex flex-col gap-1 w-full">
                        <div className="flex justify-between items-start w-full">
                          <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                            {generateReadableId(item.id, index)}
                          </span>
                          <span className={item.type_transaction === 'revenue' ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
                            {formatCurrency(item.montant, item.devise)}
                          </span>
                        </div>
                        <div className="font-bold text-gray-900 dark:text-gray-100 mt-1">{item.motif}</div>
                      </div>
                    ),
                    subtitleRender: (item) => (
                      <div className="flex flex-col gap-1 text-sm text-gray-500 mt-1">
                        {item.client && <span className="font-medium text-gray-700">{item.client.nom}</span>}
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          <span className="text-xs">{new Date(item.date_paiement).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ),
                    badgeKey: 'statut',
                    badgeRender: (item) => (
                      <StatusBadge
                        status={item.statut}
                        transaction={item}
                        onStatusChange={handleStatusChange}
                        canUpdate={checkPermission('finances', 'update')}
                      />
                    ),
                    infoFields: [
                      { key: 'mode_paiement', label: 'Compte', render: (val) => val === 'AIRTEL_MONEY' ? 'Airtel' : val === 'M_PESA' ? 'M-Pesa' : val },
                      { key: 'benefice', label: 'Bénéfice', render: (val) => <span className="text-orange-600 font-medium">{formatCurrency(val, 'USD')}</span> }
                    ]
                  }}
                />

                {/* Pagination avec sélecteur de taille */}
                {pagination && (
                  <div className="mt-6 space-y-4">
                    {/* Informations et sélecteur de taille - Stack sur mobile */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-600">Afficher</span>
                          <Select
                            value={String(pageSize)}
                            onValueChange={(value) => {
                              const nextSize = parseInt(value, 10);
                              if (!Number.isNaN(nextSize)) {
                                setPageSize(nextSize);
                                setCurrentPage(1);
                              }
                            }}
                          >
                            <SelectTrigger className="w-20 h-8">
                              <SelectValue placeholder="10" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="10">10</SelectItem>
                              <SelectItem value="20">20</SelectItem>
                              <SelectItem value="25">25</SelectItem>
                              <SelectItem value="50">50</SelectItem>
                              <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                          </Select>
                          <span className="text-sm text-gray-600">par page</span>
                        </div>
                        <span className="text-sm text-gray-500 sm:ml-4">
                          {pagination.count} transaction{pagination.count > 1 ? 's' : ''} au total
                        </span>
                      </div>
                    </div>

                    {/* Pagination - Centrée et responsive */}
                    {pagination.totalPages > 1 && (
                      <div className="flex justify-center">
                        <Pagination
                          currentPage={currentPage}
                          totalPages={pagination.totalPages}
                          onPageChange={setCurrentPage}
                          className="w-full max-w-full overflow-x-auto"
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transaction Form Modal */}
            <TransactionFormFinancial
              isOpen={isFormOpen}
              onClose={() => setIsFormOpen(false)}
              onSuccess={handleFormSuccess}
              transaction={selectedTransaction}
              defaultType={tabConfig.defaultType}
            />

            {/* Delete Confirmation Dialogs */}
            <ConfirmDialog
              open={deleteDialogOpen}
              onOpenChange={setDeleteDialogOpen}
              title="Supprimer la transaction"
              description={`Êtes-vous sûr de vouloir supprimer la transaction de ${formatCurrency(transactionToDelete?.montant || 0, transactionToDelete?.devise || 'USD')} ? Cette action est irréversible.`}
              confirmText="Supprimer"
              cancelText="Annuler"
              onConfirm={confirmDeleteTransaction}
              isConfirming={isDeleting}
              type="delete"
            />

            <ConfirmDialog
              open={validateDialogOpen}
              onOpenChange={setValidateDialogOpen}
              title="Valider la transaction"
              description={`Êtes-vous sûr de vouloir valider la transaction de ${formatCurrency(transactionToValidate?.montant || 0, transactionToValidate?.devise || 'USD')} ? Le statut passera à "Servi".`}
              confirmText="Valider"
              cancelText="Annuler"
              onConfirm={confirmValidateTransaction}
              isConfirming={isValidating}
              type="warning"
            />

            {/* Transaction Details Modal */}
            <TransactionDetailsModal
              transaction={transactionToView}
              isOpen={detailsModalOpen}
              onClose={() => {
                setDetailsModalOpen(false);
                setTransactionToView(null);
              }}
              onUpdate={updateTransaction}
              onDuplicate={handleDuplicateTransaction}
            />
          </Tabs>
        </div>
      </Layout>
    </ProtectedRouteEnhanced>
  );
};

export default TransactionsProtected;