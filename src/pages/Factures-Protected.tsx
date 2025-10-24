"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Plus,
  Filter,
  Eye,
  Edit,
  Trash2,
  Download,
  FileText,
  DollarSign,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import ProtectedRouteEnhanced from '../components/auth/ProtectedRouteEnhanced';
import PermissionGuard from '../components/auth/PermissionGuard';
import { useFactures } from '../hooks/useFactures';
import FactureDetailsModal from '../components/modals/FactureDetailsModal';
import type { Facture } from '@/types';
import { showSuccess, showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

const FacturesProtected: React.FC = () => {
  usePageSetup({
    title: 'Gestion des Factures',
    subtitle: 'Gérez vos factures et devis'
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statutFilter, setStatutFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [factureToView, setFactureToView] = useState<Facture | null>(null);
  const navigate = useNavigate();

  const {
    factures,
    pagination,
    isLoading,
    error,
    deleteFacture,
    convertToFacture,
    getFactureWithItems,
    refetch
  } = useFactures(currentPage, {
    type: typeFilter === 'all' ? undefined : typeFilter as 'devis' | 'facture',
    statut: statutFilter === 'all' ? undefined : statutFilter
  });

  const formatCurrency = (amount: number, devise: string) => {
    const formatted = amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return devise === 'USD' ? `$${formatted}` : `${formatted} FC`;
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, { variant: any; className: string; label: string }> = {
      brouillon: { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800', label: 'Brouillon' },
      en_attente: { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800', label: 'En attente' },
      validee: { variant: 'default' as const, className: 'bg-emerald-600 text-white', label: 'Validée' },
      annulee: { variant: 'destructive' as const, className: 'bg-red-100 text-red-800', label: 'Annulée' }
    };
    
    const config = variants[statut] || variants.brouillon;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const handleConvertToFacture = async (facture: Facture) => {
    if (facture.type !== 'devis') return;
    
    try {
      await convertToFacture(facture.id);
      refetch();
    } catch (error) {
      console.error('Error converting:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture?')) return;
    
    try {
      await deleteFacture(id);
      refetch();
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleViewDetails = async (facture: Facture) => {
    try {
      const factureWithItems = await getFactureWithItems(facture.id);
      setFactureToView(factureWithItems);
      setDetailsModalOpen(true);
    } catch (error) {
      console.error('Error fetching facture details:', error);
      showError('Erreur lors du chargement des détails');
    }
  };

  const handleEdit = (facture: Facture) => {
    navigate(`/factures/edit/${facture.id}`);
  };

  const handleAddNew = () => {
    navigate('/factures/new');
  };

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <p className="text-red-600 mb-2">Erreur de chargement des factures</p>
            <p className="text-gray-500">{error}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <ProtectedRouteEnhanced requiredModule="factures" requiredPermission="read">
      <Layout>
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Action Buttons */}
          <div className="flex items-center justify-end">
            <PermissionGuard module="factures" permission="create">
              <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleAddNew}>
                <Plus className="mr-2 h-4 w-4" />
                Nouvelle Facture/Devis
              </Button>
            </PermissionGuard>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600">Total Factures</p>
                    <p className="text-3xl font-bold text-emerald-600">
                      {pagination?.count || 0}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <FileText className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600">Montant Total</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {formatCurrency(
                        factures.reduce((sum, f) => sum + f.total_general, 0),
                        'USD'
                      )}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600">Validées</p>
                    <p className="text-3xl font-bold text-green-600">
                      {factures.filter(f => f.statut === 'validee').length}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-gray-600">En attente</p>
                    <p className="text-3xl font-bold text-yellow-600">
                      {factures.filter(f => f.statut === 'en_attente').length}
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par numéro ou client..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={(value) => {
              setTypeFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="devis">Devis</SelectItem>
                <SelectItem value="facture">Facture</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statutFilter} onValueChange={(value) => {
              setStatutFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="brouillon">Brouillon</SelectItem>
                <SelectItem value="en_attente">En attente</SelectItem>
                <SelectItem value="validee">Validée</SelectItem>
                <SelectItem value="annulee">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Factures Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Liste des Factures et Devis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Type</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">N° Facture</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Client</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Montant</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Statut</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading && factures.length === 0 ? (
                      Array.from({ length: 5 }).map((_, index) => (
                        <tr key={index} className="border-b">
                          <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                          <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                        </tr>
                      ))
                    ) : factures.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16">
                          <div className="flex flex-col items-center justify-center text-center">
                            <FileText className="h-16 w-16 text-gray-300 mb-4" />
                            <p className="text-lg font-medium text-gray-900 mb-2">Aucune facture</p>
                            <p className="text-sm text-gray-500 mb-4">Commencez par créer votre première facture</p>
                            <PermissionGuard module="factures" permission="create">
                              <Button onClick={handleAddNew} className="bg-emerald-600 hover:bg-emerald-700">
                                <Plus className="mr-2 h-4 w-4" />
                                Nouvelle Facture
                              </Button>
                            </PermissionGuard>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      factures.map((facture) => (
                        <tr key={facture.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4">
                            <Badge variant="outline">
                              {facture.type === 'devis' ? '📄 Devis' : '📋 Facture'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 font-medium">{facture.facture_number}</td>
                          <td className="py-3 px-4">{(facture as any).clients?.nom || 'N/A'}</td>
                          <td className="py-3 px-4 text-sm">
                            {new Date(facture.date_emission).toLocaleDateString('fr-FR')}
                          </td>
                          <td className="py-3 px-4 font-medium text-emerald-600">
                            {formatCurrency(facture.total_general, facture.devise)}
                          </td>
                          <td className="py-3 px-4">
                            {getStatutBadge(facture.statut)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(facture)}
                                title="Voir les détails"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              {facture.type === 'devis' && facture.statut === 'brouillon' && (
                                <PermissionGuard module="factures" permission="update">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleConvertToFacture(facture)}
                                    title="Convertir en facture"
                                    className="text-emerald-600 hover:bg-emerald-50"
                                  >
                                    <RefreshCw className="h-4 w-4" />
                                  </Button>
                                </PermissionGuard>
                              )}
                              
                              <PermissionGuard module="factures" permission="update">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEdit(facture)}
                                  title="Modifier"
                                  className="hover:bg-green-50"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </PermissionGuard>
                              
                              <PermissionGuard module="factures" permission="delete">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:bg-red-50"
                                  onClick={() => handleDelete(facture.id)}
                                  title="Supprimer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </PermissionGuard>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Modal de détails */}
          {factureToView && (
            <FactureDetailsModal
              facture={factureToView}
              isOpen={detailsModalOpen}
              onClose={() => {
                setDetailsModalOpen(false);
                setFactureToView(null);
              }}
            />
          )}
        </div>
      </Layout>
    </ProtectedRouteEnhanced>
  );
};

export default FacturesProtected;