"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus, Search, Filter, Package, Calendar, DollarSign, Eye, Edit, Trash2, MoreVertical, ChevronDown, CheckCircle, Clock, X, Truck, MapPin, AlertCircle, Plane, PackageCheck, CreditCard } from 'lucide-react';
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

  // Charger les colis aériens
  useEffect(() => {
    loadColis();
  }, []);

  const loadColis = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('colis')
        .select(`
          *,
          client:clients(id, nom, telephone),
          transitaire:transitaires(id, nom)
        `)
        .eq('type_livraison', 'aerien')
        .order('created_at', { ascending: false });

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
      showError('Erreur lors du chargement des colis');
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
    
    return matchesSearch && matchesStatut;
  });

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
          {/* En-tête avec statistiques */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Colis</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">En Transit</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.enTransit}</p>
                  </div>
                  <Plane className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Arrivés</p>
                    <p className="text-2xl font-bold text-green-600">{stats.arrives}</p>
                  </div>
                  <Package className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Poids</p>
                    <p className="text-2xl font-bold text-red-600">{stats.poidsTotal ? `${stats.poidsTotal.toFixed(2)} kg` : '0.00 kg'}</p>
                  </div>
                  <Package className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tableau des colis */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-blue-500" />
                  Liste des Colis Aériens ({filteredColis.length})
                </CardTitle>
                <Button
                  onClick={() => navigate('/colis/aeriens/nouveau')}
                  className="bg-green-500 hover:bg-green-600"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nouveau Colis
                </Button>
              </div>

              {/* Filtres et recherche */}
              <div className="flex flex-col sm:flex-row gap-4 mt-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Rechercher par client, tracking, commande..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <select
                  value={statutFilter}
                  onChange={(e) => setStatutFilter(e.target.value)}
                  className="px-4 py-2 border rounded-md bg-white"
                >
                  <option value="tous">Tous les statuts</option>
                  <option value="en_preparation">En préparation</option>
                  <option value="expedie_chine">Expédié Chine</option>
                  <option value="en_transit">En transit</option>
                  <option value="arrive_congo">Arrivé Congo</option>
                  <option value="recupere_client">Récupéré</option>
                  <option value="livre">Livré</option>
                </select>
              </div>
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
                  <p className="mt-4 text-gray-500">Chargement des colis...</p>
                </div>
              ) : filteredColis.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500 text-lg">Aucun colis trouvé</p>
                  <p className="text-gray-400 text-sm mt-2">
                    {searchTerm || statutFilter !== 'tous' 
                      ? 'Essayez de modifier vos filtres'
                      : 'Commencez par créer un nouveau colis'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-100">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                      <tr>
                        <SortableHeader
                          title="ID Colis"
                          sortKey="id"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          className="text-left py-4 px-3 md:px-4 font-semibold text-gray-800 text-sm"
                        />
                        <SortableHeader
                          title="Client"
                          sortKey="client.nom"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          className="text-left py-4 px-3 md:px-4 font-semibold text-gray-800 text-sm"
                        />
                        <SortableHeader
                          title="Fournisseur"
                          sortKey="fournisseur"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          className="hidden md:table-cell py-4 px-3 md:px-4 font-semibold text-gray-800 text-sm"
                        />
                        <SortableHeader
                          title="Tracking"
                          sortKey="tracking_chine"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          className="hidden lg:table-cell py-4 px-3 md:px-4 font-semibold text-gray-800 text-sm"
                        />
                        <SortableHeader
                          title="Qté"
                          sortKey="quantite"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          className="text-center py-4 px-3 md:px-4 font-semibold text-gray-800 text-sm"
                        />
                        <SortableHeader
                          title="Poids"
                          sortKey="poids"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          className="text-center py-4 px-3 md:px-4 font-semibold text-gray-800 text-sm"
                        />
                        <SortableHeader
                          title="Tarif/kg"
                          sortKey="tarif_kg"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          className="hidden md:table-cell py-4 px-3 md:px-4 font-semibold text-gray-800 text-sm"
                        />
                        <SortableHeader
                          title="Montant"
                          sortKey="montant_a_payer"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          className="text-right py-4 px-3 md:px-4 font-semibold text-gray-800 text-sm"
                        />
                        <SortableHeader
                          title="Transitaire"
                          sortKey="transitaire.nom"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          className="hidden lg:table-cell py-4 px-3 md:px-4 font-semibold text-gray-800 text-sm"
                        />
                        <SortableHeader
                          title="Statut"
                          sortKey="statut"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          className="text-center py-4 px-3 md:px-4 font-semibold text-gray-800 text-sm"
                        />
                        <SortableHeader
                          title="Paiement"
                          sortKey="statut_paiement"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          className="text-center py-4 px-3 md:px-4 font-semibold text-gray-800 text-sm"
                        />
                        <SortableHeader
                          title="Date Arrivée"
                          sortKey="date_arrivee_agence"
                          currentSort={sortConfig}
                          onSort={handleSort}
                          className="hidden md:table-cell py-4 px-3 md:px-4 font-semibold text-gray-800 text-sm"
                        />
                        <th className="text-center py-4 px-3 md:px-4 font-semibold text-gray-800 text-sm w-16">
                          <span className="flex items-center justify-center">
                            <MoreVertical className="h-4 w-4" />
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredColis.map((c, index) => (
                        <tr 
                          key={c.id} 
                          className="hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-all duration-200 border-b border-gray-50"
                        >
                          <td className="py-4 px-3 md:px-4">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 font-mono">#{index + 1}</span>
                              <button
                                onClick={(e) => handleViewDetails(c, e)}
                                className="text-blue-600 hover:text-blue-800 font-mono text-sm font-semibold hover:bg-blue-50 px-2 py-1 rounded transition-colors"
                                title="Voir les détails du colis"
                                type="button"
                              >
                                {generateColisId(c)}
                              </button>
                            </div>
                          </td>
                          <td className="py-4 px-3 md:px-4">
                            <div className="flex flex-col">
                              <p className="font-semibold text-gray-900">{c.client?.nom}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Package className="h-3 w-3" />
                                {c.client?.telephone}
                              </p>
                            </div>
                          </td>
                          <td className="hidden md:table-cell py-4 px-3 md:px-4">
                            <Badge className="text-xs bg-purple-50 text-purple-700 border-purple-200 font-medium" {...({ variant: 'outline' } as any)}>
                              {c.fournisseur}
                            </Badge>
                          </td>
                          <td className="hidden lg:table-cell py-4 px-3 md:px-4">
                            <div className="text-sm space-y-1">
                              <p className="text-sm font-mono text-gray-700 bg-gray-50 px-2 py-1 rounded">
                                {c.tracking_chine || '-'}
                              </p>
                              {c.numero_commande && (
                                <p className="text-xs text-gray-500">Cmd: {c.numero_commande}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-3 md:px-4 text-center">
                            <div className="inline-flex items-center justify-center bg-blue-50 text-blue-700 rounded-lg px-3 py-1 font-bold text-sm">
                              {c.quantite || 1}
                            </div>
                          </td>
                          <td className="py-4 px-3 md:px-4 text-center">
                            <div className="inline-flex items-center justify-center bg-orange-50 text-orange-700 rounded-lg px-3 py-1 font-bold text-sm">
                              {c.poids} kg
                            </div>
                          </td>
                          <td className="hidden md:table-cell py-4 px-3 md:px-4 text-center">
                            <span className="text-sm font-mono bg-gray-50 px-2 py-1 rounded">${c.tarif_kg}</span>
                          </td>
                          <td className="py-4 px-3 md:px-4 text-right">
                            <div className="flex items-center justify-end">
                              <span className="font-bold text-green-700 bg-green-50 px-3 py-1 rounded-lg text-sm">
                                {formatCurrency(c.montant_a_payer, 'USD')}
                              </span>
                            </div>
                          </td>
                          <td className="hidden lg:table-cell py-4 px-3 md:px-4">
                            <div className="flex items-center gap-2">
                              <Truck className="h-4 w-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {c.transitaire?.nom || '-'}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-2 md:px-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 flex items-center gap-2 hover:bg-gray-50"
                                  {...({ variant: 'outline', size: 'sm' } as any)}
                                >
                                  {getStatutBadge(c.statut)}
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => handleStatutChange(c.id, 'en_preparation')}
                                  className="cursor-pointer"
                                >
                                  <Clock className="h-4 w-4 text-gray-600 mr-2" />
                                  En préparation
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatutChange(c.id, 'expedie_chine')}
                                  className="cursor-pointer"
                                >
                                  <Plane className="h-4 w-4 text-blue-600 mr-2" />
                                  Expédié Chine
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatutChange(c.id, 'en_transit')}
                                  className="cursor-pointer"
                                >
                                  <Truck className="h-4 w-4 text-yellow-600 mr-2" />
                                  En transit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatutChange(c.id, 'arrive_congo')}
                                  className="cursor-pointer"
                                >
                                  <MapPin className="h-4 w-4 text-green-600 mr-2" />
                                  Arrivé Congo
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatutChange(c.id, 'recupere_client')}
                                  className="cursor-pointer"
                                >
                                  <PackageCheck className="h-4 w-4 text-purple-600 mr-2" />
                                  Récupéré
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleStatutChange(c.id, 'livre')}
                                  className="cursor-pointer"
                                >
                                  <CheckCircle className="h-4 w-4 text-emerald-600 mr-2" />
                                  Livré
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                          <td className="py-3 px-2 md:px-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 flex items-center gap-2 hover:bg-gray-50"
                                  {...({ variant: 'outline', size: 'sm' } as any)}
                                >
                                  {getStatutPaiementBadge(c.statut_paiement)}
                                  <ChevronDown className="h-4 w-4 text-gray-500" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="center" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => handleStatutPaiementChange(c.id, 'non_paye')}
                                  className="cursor-pointer"
                                >
                                  <X className="h-4 w-4 text-red-600 mr-2" />
                                  Non payé
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatutPaiementChange(c.id, 'partiellement_paye')}
                                  className="cursor-pointer"
                                >
                                  <Clock className="h-4 w-4 text-orange-600 mr-2" />
                                  Partiellement payé
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleStatutPaiementChange(c.id, 'paye')}
                                  className="cursor-pointer"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                                  Payé
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                          <td className="hidden md:table-cell py-4 px-3 md:px-4">
                            <input
                              type="date"
                              value={c.date_arrivee_agence ? new Date(c.date_arrivee_agence).toISOString().split('T')[0] : ''}
                              onChange={(e) => {
                                const date = e.target.value ? new Date(e.target.value) : null;
                                updateDateArrivee(c.id, date);
                              }}
                              className="w-full text-center text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                              placeholder="JJ/MM/AAAA"
                            />
                          </td>
                          <td className="py-4 px-3 md:px-4">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 rounded-md px-3 h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => handleViewDetails(c, e)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Voir détails
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setColisForPaiement(c);
                                    setPaiementDialogOpen(true);
                                  }}
                                  className="cursor-pointer"
                                >
                                  <CreditCard className="h-4 w-4 mr-2 text-blue-600" />
                                  Enregistrer paiement
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => navigate(`/colis/aeriens/${c.id}/modifier`)}
                                  className="cursor-pointer"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(c.id, generateColisId(c))}
                                  className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                          <td className="md:hidden py-3 px-2 md:px-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  type="button"
                                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium h-9 rounded-md px-3 h-8 w-8 p-0 hover:bg-accent hover:text-accent-foreground"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={(e) => handleViewDetails(c, e)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  Voir détails
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => navigate(`/colis/aeriens/${c.id}/modifier`)}
                                  className="cursor-pointer"
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Modifier
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(c.id, generateColisId(c))}
                                  className="cursor-pointer text-red-600 hover:text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Supprimer
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
    </ProtectedRouteEnhanced>
  );
};

export default ColisAeriens;
