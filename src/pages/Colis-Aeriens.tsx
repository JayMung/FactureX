"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Filter, Package, Calendar, DollarSign, Eye, Edit, Trash2, MoreVertical, ChevronDown, CheckCircle, Clock, X, Truck, MapPin, AlertCircle, Plane, PackageCheck, CreditCard, QrCode, ShoppingCart, User, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PaiementDialog } from '@/components/paiements/PaiementDialog';
import { useColis } from '@/hooks/useColis';
import { useDeleteColis } from '@/hooks/useDeleteColis';
import { useUpdateColisStatut } from '@/hooks/useUpdateColisStatut';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/utils';
import { showSuccess, showError } from '@/lib/notifications';
import { PermissionGuard } from '@/components/auth/PermissionGuard';
import type { Colis } from '@/types';
import SortableHeader from '@/components/ui/sortable-header';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import ProtectedRouteEnhanced from '../components/auth/ProtectedRouteEnhanced';
import Layout from '../components/layout/Layout';
import { useSorting } from '../hooks/useSorting';
import { usePageSetup } from '../hooks/use-page-setup';
import Pagination from '@/components/ui/pagination-custom';
import { getDateRange, PeriodFilter } from '@/utils/dateUtils';
import { PeriodFilterTabs } from '@/components/ui/period-filter-tabs';
import { UnifiedDataTable } from '@/components/ui/unified-data-table';
import { FilterTabs } from '@/components/ui/filter-tabs';
import { useIsMobile } from '@/hooks/use-mobile';
import { ColumnSelector } from '@/components/ui/column-selector';
import { ExportDropdown } from '@/components/ui/export-dropdown';

// Error Boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('DatePicker Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-64 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-center">
            <div className="text-red-600 text-lg font-medium mb-2">
              Erreur de chargement
            </div>
            <div className="text-red-500 text-sm mb-4">
              Le sélecteur de date a rencontré un problème
            </div>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ColisAeriens: React.FC = () => {
  const navigate = useNavigate();
  const [colis, setColis] = useState<Colis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('tous');
  const [transitaireFilter, setTransitaireFilter] = useState<string>('tous');
  const [fournisseurFilter, setFournisseurFilter] = useState<string>('tous');
  const [currentPage, setCurrentPage] = useState(1);
  const isMobile = useIsMobile();
  const [viewMode, setViewMode] = useState<'table' | 'cards' | 'auto'>('auto');
  const [columnsConfig, setColumnsConfig] = useState<Record<string, boolean>>({});

  const PAGE_SIZE = 10;

  // Filtre de période
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('month');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({ start: null, end: null });

  // Mettre à jour les dates quand la période change
  useEffect(() => {
    if (periodFilter !== 'all') {
      const { current } = getDateRange(periodFilter);
      setDateRange({ start: current.start, end: current.end });
    } else {
      setDateRange({ start: null, end: null });
    }
  }, [periodFilter]);

  // Hook pour mettre à jour la date d'arrivée
  const updateDateArrivee = async (colisId: string, date: Date | null) => {
    try {
      const { error } = await supabase
        .from('colis')
        .update({
          date_arrivee_agence: date ? date.toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', colisId);

      if (error) throw error;

      // Recharger les colis
      loadColis();
      toast.success('Date d\'arrivée mise à jour avec succès');
    } catch (error: any) {
      console.error('Error updating date arrivée:', error);
      toast.error('Erreur lors de la mise à jour de la date d\'arrivée');
    }
  };
  const [selectedColis, setSelectedColis] = useState<Colis | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [colisToDelete, setColisToDelete] = useState<{ id: string; name: string } | null>(null);
  const [paiementDialogOpen, setPaiementDialogOpen] = useState(false);
  const [colisForPaiement, setColisForPaiement] = useState<Colis | null>(null);
  const [globalTotals, setGlobalTotals] = useState({
    total: 0,
    enTransit: 0,
    arrives: 0,
    montantTotal: 0
  });

  usePageSetup({
    title: 'Colis Aériens',
    subtitle: 'Gestion des colis par voie aérienne'
  });

  // Charger les colis aériens quand la plage de date change
  useEffect(() => {
    loadColis();
  }, [dateRange]);

  const loadColis = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('colis')
        .select(`
          *,
          client:clients(id, nom, telephone),
          transitaire:transitaires(id, nom)
        `)
        .eq('type_livraison', 'aerien')
        .order('created_at', { ascending: false });

      // Appliquer le filtre de date
      if (dateRange.start && dateRange.end) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data, error } = await query;

      // Charger les informations des créateurs séparément
      if (data && data.length > 0) {
        const creatorIds = [...new Set(data.map(c => c.created_by).filter(Boolean))];
        if (creatorIds.length > 0) {
          const { data: creators } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, email')
            .in('id', creatorIds);

          // Ajouter les informations du créateur à chaque colis
          if (creators) {
            data.forEach((colis: any) => {
              const creator = creators.find(c => c.id === colis.created_by);
              if (creator) {
                colis.creator = creator;
              }
            });
          }
        }
      }

      if (error) throw error;

      setColis(data || []);

      // Calculer les totaux globaux (tous les colis aériens, non filtrés)
      const allColis = data || [];
      const totals = {
        total: allColis.length,
        enTransit: allColis.filter(c => c.statut === 'en_transit').length,
        arrives: allColis.filter(c => c.statut === 'arrive_congo').length,
        montantTotal: allColis.reduce((sum, c) => sum + (c.montant_a_payer || 0), 0)
      };
      setGlobalTotals(totals);
    } catch (error) {
      console.error('Error loading colis:', error);
      // Ne pas afficher de toast pour éviter de polluer l'UI
      // L'erreur est loggée dans la console
    } finally {
      setLoading(false);
    }
  };

  // Tri des colis
  const { sortedData, sortConfig, handleSort } = useSorting(colis, { key: 'created_at', direction: 'desc' });

  // Filtrer les colis
  const filteredColis = sortedData.filter(c => {
    const matchesSearch =
      c.client?.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.tracking_chine?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.numero_commande?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.fournisseur.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatut = statutFilter === 'tous' || c.statut === statutFilter;
    const matchesTransitaire = transitaireFilter === 'tous' || c.transitaire?.nom === transitaireFilter;
    const matchesFournisseur = fournisseurFilter === 'tous' || c.fournisseur === fournisseurFilter;

    return matchesSearch && matchesStatut && matchesTransitaire && matchesFournisseur;
  });

  // Extraire les listes uniques de transitaires et fournisseurs
  const transitaires = Array.from(new Set(colis.map(c => c.transitaire?.nom).filter(Boolean))) as string[];
  const fournisseurs = Array.from(new Set(colis.map(c => c.fournisseur).filter(Boolean))) as string[];

  // Pagination
  const totalPages = Math.ceil(filteredColis.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const endIndex = startIndex + PAGE_SIZE;
  const paginatedColis = filteredColis.slice(startIndex, endIndex);

  // Réinitialiser la page quand les filtres changent
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statutFilter, transitaireFilter, fournisseurFilter]);

  // Badge de statut avec couleurs
  const getStatutBadge = (statut: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      en_preparation: { label: 'En préparation', className: 'bg-gray-500' },
      expedie_chine: { label: 'Expédié Chine', className: 'bg-blue-500' },
      en_transit: { label: 'En transit', className: 'bg-yellow-500' },
      arrive_congo: { label: 'Arrivé Congo', className: 'bg-green-500' },
      recupere_client: { label: 'Récupéré', className: 'bg-purple-500' },
      livre: { label: 'Livré', className: 'bg-emerald-600' }
    };

    const variant = variants[statut] || { label: statut, className: 'bg-gray-500' };
    return (
      <Badge className={`${variant.className} text-white`}>
        {variant.label}
      </Badge>
    );
  };

  // Badge de statut paiement
  const getStatutPaiementBadge = (statut: string) => {
    const variants: Record<string, { label: string; className: string }> = {
      non_paye: { label: 'Non payé', className: 'bg-red-500' },
      partiellement_paye: { label: 'Partiel', className: 'bg-orange-500' },
      paye: { label: 'Payé', className: 'bg-green-500' }
    };

    const variant = variants[statut] || { label: statut, className: 'bg-gray-500' };
    return (
      <Badge className={`${variant.className} text-white text-xs`}>
        {variant.label}
      </Badge>
    );
  };

  // Générer un ID de colis lisible
  const generateColisId = (colis: Colis) => {
    const date = new Date(colis.created_at || '');
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const shortId = colis.id.slice(0, 6).toUpperCase();
    return `CA-${year}${month}-${shortId}`;
  };

  // Ouvrir le modal de détails
  const handleViewDetails = (colis: Colis, event?: React.MouseEvent) => {
    event?.preventDefault();
    event?.stopPropagation();
    setSelectedColis(colis);
    setIsDetailModalOpen(true);
  };

  // Ouvrir le dialogue de suppression
  const handleDelete = (colisId: string, colisName: string) => {
    setColisToDelete({ id: colisId, name: colisName });
    setDeleteDialogOpen(true);
  };

  // Changer le statut d'un colis
  const handleStatutChange = async (colisId: string, newStatut: string) => {
    try {
      const { error } = await supabase
        .from('colis')
        .update({ statut: newStatut })
        .eq('id', colisId);

      if (error) throw error;

      showSuccess('Statut mis à jour avec succès');
      loadColis();
    } catch (error) {
      console.error('Error updating statut:', error);
      showError('Erreur lors de la mise à jour du statut');
    }
  };

  // Changer le statut de paiement d'un colis
  const handleStatutPaiementChange = async (colisId: string, newStatut: string) => {
    try {
      const { error } = await supabase
        .from('colis')
        .update({ statut_paiement: newStatut })
        .eq('id', colisId);

      if (error) throw error;

      showSuccess('Statut de paiement mis à jour avec succès');
      loadColis();
    } catch (error) {
      console.error('Error updating statut paiement:', error);
      showError('Erreur lors de la mise à jour du statut de paiement');
    }
  };

  // Confirmer la suppression
  const handleConfirmDelete = async () => {
    if (!colisToDelete) return;

    try {
      // Supprimer le colis
      const { error, count } = await supabase
        .from('colis')
        .delete({ count: 'exact' })
        .eq('id', colisToDelete.id);

      if (error) {
        console.error('Error deleting colis:', error);
        throw error;
      }

      if (count === 0) {
        throw new Error('Colis non trouvé ou permissions insuffisantes');
      }

      // Supprimer immédiatement de l'état local pour une UI réactive
      setColis(prevColis => prevColis.filter(c => c.id !== colisToDelete.id));

      showSuccess('Colis supprimé avec succès');
      setDeleteDialogOpen(false);
      setColisToDelete(null);

      // Recharger pour synchroniser avec la base de données
      setTimeout(() => loadColis(), 500);
    } catch (error) {
      console.error('Error deleting colis:', error);
      showError('Erreur lors de la suppression du colis');
    }
  };



  const tableColumns = [
    {
      key: 'id',
      title: 'ID Colis',
      sortable: true,
      render: (value: any, c: any, index: number) => (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-mono">#{startIndex + index + 1}</span>
          <button
            onClick={(e) => handleViewDetails(c, e)}
            className="text-blue-600 hover:text-blue-800 font-mono text-sm font-semibold hover:bg-blue-50 px-2 py-1 rounded transition-colors"
            title="Voir les détails du colis"
            type="button"
          >
            {generateColisId(c)}
          </button>
        </div>
      )
    },
    {
      key: 'client.nom',
      title: 'Client',
      sortable: true,
      render: (value: any, c: any) => (
        <div className="flex flex-col">
          <p className="font-semibold text-gray-900">{c.client?.nom}</p>
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Package className="h-3 w-3" />
            {c.client?.telephone}
          </p>
        </div>
      )
    },
    {
      key: 'fournisseur',
      title: 'Fournisseur',
      sortable: true,
      hiddenOn: 'sm' as const,
      render: (value: any) => (
        <Badge className="text-xs bg-purple-50 text-purple-700 border-purple-200 font-medium" variant="outline">
          {value}
        </Badge>
      )
    },
    {
      key: 'tracking_chine',
      title: 'Tracking',
      sortable: true,
      hiddenOn: 'sm' as const,
      render: (value: any, c: any) => (
        <div className="flex flex-col gap-1">
          {value ? (
            <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 w-fit">
              <QrCode className="h-3 w-3" />
              <span className="font-mono text-xs cursor-pointer hover:underline" title={value}>
                {value.length > 12 ? value.substring(0, 12) + '...' : value}
              </span>
            </div>
          ) : (
            <span className="text-gray-400 italic text-xs">Non défini</span>
          )}
          {c.numero_commande && (
            <div className="text-[10px] text-gray-500 flex items-center gap-1">
              <ShoppingCart className="h-3 w-3" />
              {c.numero_commande}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'quantite',
      title: 'Qté',
      sortable: true,
      align: 'center' as const,
      render: (value: any) => <span className="font-medium">{value}</span>
    },
    {
      key: 'poids',
      title: 'Poids',
      sortable: true,
      align: 'center' as const,
      render: (value: any) => (
        <Badge variant="secondary" className="font-mono">
          {value} kg
        </Badge>
      )
    },
    {
      key: 'tarif_kg',
      title: 'Tarif/kg',
      sortable: true,
      hiddenOn: 'sm' as const,
      render: (value: any) => (
        <span className="text-sm font-medium text-gray-600">
          {value}$
        </span>
      )
    },
    {
      key: 'montant_a_payer',
      title: 'Montant',
      sortable: true,
      align: 'right' as const,
      render: (value: any) => (
        <div className="font-bold text-gray-900 bg-green-50 px-2.5 py-1 rounded-lg border border-green-100 inline-block">
          {value?.toLocaleString()} $
        </div>
      )
    },
    {
      key: 'transitaire.nom',
      title: 'Transitaire',
      sortable: true,
      hiddenOn: 'lg' as const,
      render: (value: any, c: any) => (
        c.transitaire && (
          <div className="flex items-center gap-1.5 text-indigo-700 bg-indigo-50 px-2 py-1 rounded-md text-xs font-medium">
            <User className="h-3 w-3" />
            {c.transitaire.nom}
          </div>
        )
      )
    },
    {
      key: 'statut',
      title: 'Statut',
      sortable: true,
      align: 'center' as const,
      render: (value: any, c: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 hover:bg-transparent"
            >
              {getStatutBadge(value)}
              <ChevronDown className="h-3 w-3 ml-1 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            <DropdownMenuItem onClick={() => handleStatutChange(c.id, 'en_preparation')} className="cursor-pointer">
              <Clock className="h-4 w-4 text-gray-600 mr-2" /> En préparation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatutChange(c.id, 'expedie_chine')} className="cursor-pointer">
              <Plane className="h-4 w-4 text-blue-600 mr-2" /> Expédié Chine
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatutChange(c.id, 'en_transit')} className="cursor-pointer">
              <Truck className="h-4 w-4 text-yellow-600 mr-2" /> En transit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatutChange(c.id, 'arrive_congo')} className="cursor-pointer">
              <MapPin className="h-4 w-4 text-green-600 mr-2" /> Arrivé Congo
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatutChange(c.id, 'recupere_client')} className="cursor-pointer">
              <PackageCheck className="h-4 w-4 text-purple-600 mr-2" /> Récupéré
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleStatutChange(c.id, 'livre')} className="cursor-pointer">
              <CheckCircle className="h-4 w-4 text-emerald-600 mr-2" /> Livré
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    {
      key: 'statut_paiement',
      title: 'Paiement',
      sortable: true,
      align: 'center' as const,
      render: (value: any, c: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="h-8 flex items-center gap-2 hover:bg-gray-50"
            >
              {getStatutPaiementBadge(value)}
              <ChevronDown className="h-4 w-4 text-gray-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            <DropdownMenuItem onClick={() => handleStatutPaiementChange(c.id, 'non_paye')} className="cursor-pointer">
              <X className="h-4 w-4 text-red-600 mr-2" /> Non payé
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatutPaiementChange(c.id, 'partiellement_paye')} className="cursor-pointer">
              <Clock className="h-4 w-4 text-orange-600 mr-2" /> Partiellement payé
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleStatutPaiementChange(c.id, 'paye')} className="cursor-pointer">
              <CheckCircle className="h-4 w-4 text-green-600 mr-2" /> Payé
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
    {
      key: 'date_arrivee_agence',
      title: 'Date Arrivée',
      sortable: true,
      hiddenOn: 'sm' as const,
      render: (value: any, c: any) => (
        <input
          type="date"
          value={value ? new Date(value).toISOString().split('T')[0] : ''}
          onChange={(e) => {
            const date = e.target.value ? new Date(e.target.value) : null;
            updateDateArrivee(c.id, date);
          }}
          className="w-full text-center text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
          placeholder="JJ/MM/AAAA"
        />
      )
    },
    {
      key: 'actions',
      title: '',
      align: 'right',
      render: (value: any, c: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => handleViewDetails(c)}
              className="cursor-pointer"
            >
              <Eye className="mr-2 h-4 w-4" />
              Voir détails
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                const msg = `*FactureX - Colis Aérien*\n\n` +
                  `📅 Date: ${new Date().toLocaleDateString('fr-FR')}\n` +
                  `📦 Colis: ${generateColisId(c)}\n` +
                  `👤 Client: ${c.client?.nom || 'N/A'}\n` +
                  `⚖️ Poids: ${c.poids} kg\n` +
                  `💰 À payer: ${c.montant_a_payer} $\n\n` +
                  `Connectez-vous pour plus de détails.`;

                const url = `https://wa.me/?text=${encodeURIComponent(msg)}`;
                window.open(url, '_blank');
              }}
              className="cursor-pointer"
            >
              <Send className="mr-2 h-4 w-4" />
              Partager via WhatsApp
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 cursor-pointer"
              onClick={() => handleDelete(c.id, generateColisId(c))}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    }
  ];

  const visibleColumns = tableColumns.filter(col => columnsConfig[col.key] !== false);

  const selectorColumns = tableColumns.map(col => ({
    key: col.key,
    label: col.title,
    visible: columnsConfig[col.key] !== false,
    required: col.key === 'id' || col.key === 'actions' || col.key === 'tracking_chine'
  }));

  const onColumnsChange = (newColumns: any[]) => {
    const newConfig = newColumns.reduce((acc, col) => {
      if (!col.visible) acc[col.key] = false;
      return acc;
    }, {} as Record<string, boolean>);
    setColumnsConfig(newConfig);
  };

  // Statistiques rapides
  const stats = {
    total: globalTotals.total,
    enTransit: globalTotals.enTransit,
    arrives: globalTotals.arrives,
    montantTotal: globalTotals.montantTotal,
    poidsTotal: filteredColis.reduce((total, colis) => total + (colis.poids || 0), 0),
    nonPayes: filteredColis.filter(c => c.statut_paiement === 'non_paye').length
  };

  return (
    <ProtectedRouteEnhanced requiredModule="colis">
      <Layout>
        <ErrorBoundary>
          <div className="space-y-6">
            <div className="flex justify-end">
              <PeriodFilterTabs
                period={periodFilter}
                onPeriodChange={setPeriodFilter}
                showAllOption={true}
              />
            </div>

            {/* En-tête avec statistiques - Modern Gradient Design */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              {/* Total Colis */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 md:p-5 shadow-lg">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-white/20 p-2">
                      <Package className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] md:text-xs font-medium text-white">
                      Total
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-lg md:text-2xl font-bold text-white">{stats.total}</p>
                    <p className="mt-0.5 text-xs md:text-sm text-blue-100">Colis aériens</p>
                  </div>
                </div>
              </div>

              {/* En Transit */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 p-4 md:p-5 shadow-lg">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-white/20 p-2">
                      <Plane className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-yellow-100">En vol</span>
                  </div>
                  <div className="mt-3">
                    <p className="text-lg md:text-2xl font-bold text-white">{stats.enTransit}</p>
                    <p className="mt-0.5 text-xs md:text-sm text-yellow-100">En transit</p>
                  </div>
                </div>
              </div>

              {/* Arrivés */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 p-4 md:p-5 shadow-lg">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-white/20 p-2">
                      <Package className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <span className="inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] md:text-xs font-medium text-white">
                      ✓
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-lg md:text-2xl font-bold text-white">{stats.arrives}</p>
                    <p className="mt-0.5 text-xs md:text-sm text-emerald-100">Arrivés</p>
                  </div>
                </div>
              </div>

              {/* Total Poids */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500 to-red-600 p-4 md:p-5 shadow-lg">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-20 w-20 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="rounded-lg bg-white/20 p-2">
                      <Package className="h-4 w-4 md:h-5 md:w-5 text-white" />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-red-100">kg</span>
                  </div>
                  <div className="mt-3">
                    <p className="text-lg md:text-2xl font-bold text-white">{stats.poidsTotal ? `${stats.poidsTotal.toFixed(1)}` : '0'}</p>
                    <p className="mt-0.5 text-xs md:text-sm text-red-100">Poids total (kg)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Tableau des colis */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                  <CardTitle className="flex items-center gap-2">
                    <Plane className="h-5 w-5 text-blue-500" />
                    Liste des Colis Aériens ({filteredColis.length})
                  </CardTitle>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <ColumnSelector
                      columns={selectorColumns}
                      onColumnsChange={onColumnsChange}
                      className="w-full sm:w-auto"
                    />
                    <ExportDropdown
                      onExport={(format) => {
                        console.log(`Exporting ${format}`);
                        toast.success(`Export ${format.toUpperCase()} lancé`);
                      }}
                      disabled={filteredColis.length === 0}
                      selectedCount={0}
                      className="w-full sm:w-auto"
                    />
                    <Button
                      onClick={() => navigate('/colis/aeriens/nouveau')}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nouveau Colis
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  {/* Status Filter Tabs */}
                  <div>
                    <FilterTabs
                      tabs={[
                        { id: 'tous', label: 'Tous', count: globalTotals.total },
                        { id: 'en_preparation', label: 'En prép.', count: sortedData.filter(c => c.statut === 'en_preparation').length },
                        { id: 'en_transit', label: 'En transit', count: globalTotals.enTransit },
                        { id: 'arrive_congo', label: 'Arrivés', count: globalTotals.arrives },
                        { id: 'recupere_client', label: 'Récupérés' },
                        { id: 'livre', label: 'Livrés' }
                      ]}
                      activeTab={statutFilter}
                      onTabChange={(id) => {
                        setStatutFilter(id);
                        setCurrentPage(1);
                      }}
                      variant="pills"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Rechercher par client, tracking, commande..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    {/* Transitaire & Fournisseur Filters */}
                    <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
                      <select
                        value={transitaireFilter}
                        onChange={(e) => setTransitaireFilter(e.target.value)}
                        className="px-4 py-2 border rounded-md bg-white min-w-[150px]"
                      >
                        <option value="tous">Tous les transitaires</option>
                        {transitaires.map(t => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>

                      <select
                        value={fournisseurFilter}
                        onChange={(e) => setFournisseurFilter(e.target.value)}
                        className="px-4 py-2 border rounded-md bg-white min-w-[150px]"
                      >
                        <option value="tous">Tous les fournisseurs</option>
                        {fournisseurs.map(f => (
                          <option key={f} value={f}>{f}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <UnifiedDataTable
                  data={paginatedColis}
                  loading={loading}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  emptyMessage="Aucun colis trouvé"
                  emptySubMessage={searchTerm || statutFilter !== 'tous' || transitaireFilter !== 'tous' || fournisseurFilter !== 'tous'
                    ? 'Essayez de modifier vos filtres'
                    : 'Commencez par créer un nouveau colis'}
                  onSort={handleSort}
                  sortKey={sortConfig?.key}
                  sortDirection={sortConfig?.direction}
                  columns={visibleColumns}
                  cardConfig={{
                    titleKey: 'tracking_chine',
                    titleRender: (item) => (
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold">{item.tracking_chine || 'Sans Tracking'}</span>
                      </div>
                    ),
                    subtitleKey: 'clients',
                    subtitleRender: (item) => <span className="text-gray-600">{item.client?.nom || 'N/A'}</span>,
                    badgeKey: 'statut',
                    badgeRender: (item) => getStatutBadge(item.statut),
                    infoFields: [
                      { key: 'poids', label: 'Poids', render: (val) => `${val || 0} Kg` },
                      { key: 'montant_a_payer', label: 'Montant', render: (val) => `${val || 0}$` },
                      { key: 'statut_paiement', label: 'Paiement', render: (val) => getStatutPaiementBadge(val) }
                    ]
                  }}
                />


                {/* Pagination */}
                {!loading && filteredColis.length > 0 && totalPages > 1 && (
                  <div className="mt-6 flex justify-center">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                      className="w-full max-w-full overflow-x-auto"
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Modal de détails du colis */}
          <Dialog open={isDetailModalOpen} onOpenChange={setIsDetailModalOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-500" />
                  Détails du Colis - {selectedColis ? generateColisId(selectedColis) : ''}
                </DialogTitle>
              </DialogHeader>

              {selectedColis && (
                <div className="space-y-6">
                  {/* Informations principales */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Informations Client</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-500">Nom du client:</span>
                          <p className="font-medium">{selectedColis.client?.nom}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Téléphone:</span>
                          <p className="font-medium">{selectedColis.client?.telephone}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Ville:</span>
                          <p className="font-medium">{selectedColis.client?.ville || '-'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Informations Fournisseur</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-500">Fournisseur:</span>
                          <p className="font-medium">{selectedColis.fournisseur}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Tracking Chine:</span>
                          <p className="font-medium">{selectedColis.tracking_chine || '-'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">N° Commande:</span>
                          <p className="font-medium">{selectedColis.numero_commande || '-'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Calcul et logistique */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Calcul des Frais</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-500">Quantité:</span>
                          <p className="font-medium">{selectedColis.quantite || 1} colis</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Poids:</span>
                          <p className="font-medium">{selectedColis.poids} kg</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Tarif/kg:</span>
                          <p className="font-medium">${selectedColis.tarif_kg}</p>
                        </div>
                        <div className="pt-3 border-t">
                          <span className="text-sm text-gray-500">Montant Total:</span>
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(selectedColis.montant_a_payer, 'USD')}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Logistique</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-500">Transitaire:</span>
                          <p className="font-medium">{selectedColis.transitaire?.nom || 'Aucun'}</p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Date Expédition:</span>
                          <p className="font-medium">
                            {selectedColis.date_expedition
                              ? new Date(selectedColis.date_expedition).toLocaleDateString('fr-FR')
                              : '-'}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Date Arrivée:</span>
                          <p className="font-medium">
                            {selectedColis.date_arrivee_agence
                              ? new Date(selectedColis.date_arrivee_agence).toLocaleDateString('fr-FR')
                              : '-'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Statuts</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <span className="text-sm text-gray-500">Statut livraison:</span>
                          <div className="mt-1">{getStatutBadge(selectedColis.statut)}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Statut paiement:</span>
                          <div className="mt-1">{getStatutPaiementBadge(selectedColis.statut_paiement)}</div>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Créé le:</span>
                          <p className="font-medium">
                            {new Date(selectedColis.created_at || '').toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <div>
                          <span className="text-sm text-gray-500">Créé par:</span>
                          <p className="font-medium">
                            {(selectedColis as any).creator
                              ? `${(selectedColis as any).creator.first_name} ${(selectedColis as any).creator.last_name}`
                              : '-'}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Détails supplémentaires */}
                  {(selectedColis.contenu_description || selectedColis.notes) && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Détails Supplémentaires</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {selectedColis.contenu_description && (
                          <div>
                            <span className="text-sm text-gray-500">Description du contenu:</span>
                            <p className="mt-1 text-gray-700">{selectedColis.contenu_description}</p>
                          </div>
                        )}
                        {selectedColis.notes && (
                          <div>
                            <span className="text-sm text-gray-500">Notes internes:</span>
                            <p className="mt-1 text-gray-700">{selectedColis.notes}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                      onClick={() => setIsDetailModalOpen(false)}
                    >
                      Fermer
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-green-500 text-white hover:bg-green-600 h-10 px-4 py-2"
                      onClick={() => {
                        setIsDetailModalOpen(false);
                        navigate(`/colis/aeriens/${selectedColis.id}/modifier`);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Modifier le colis
                    </button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Dialogue Paiement */}
          {colisForPaiement && (
            <PaiementDialog
              open={paiementDialogOpen}
              onOpenChange={setPaiementDialogOpen}
              type="colis"
              colisId={colisForPaiement.id}
              clientId={colisForPaiement.client_id}
              clientNom={colisForPaiement.client?.nom || 'N/A'}
              montantTotal={colisForPaiement.montant_a_payer}
              montantRestant={colisForPaiement.montant_a_payer}
              numeroFacture={generateColisId(colisForPaiement)}
              onSuccess={() => {
                loadColis(); // Recharger les colis
                setColisForPaiement(null);
              }}
            />
          )}

          {/* Dialogue de confirmation de suppression */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="text-red-600">Confirmer la suppression</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Êtes-vous sûr de vouloir supprimer le colis <strong>{colisToDelete?.name}</strong> ?
                </p>
                <p className="text-sm text-red-600 font-medium">
                  ⚠️ Cette action est irréversible.
                </p>
                <div className="flex justify-end space-x-2 pt-4">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
                    onClick={() => {
                      setDeleteDialogOpen(false);
                      setColisToDelete(null);
                    }}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium bg-red-600 text-white hover:bg-red-700 h-10 px-4 py-2"
                    onClick={handleConfirmDelete}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </ErrorBoundary>
      </Layout>
    </ProtectedRouteEnhanced >
  );
};

export default ColisAeriens;
