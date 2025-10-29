"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plane,
  Plus,
  Search,
  Edit,
  Eye,
  DollarSign,
  Package,
  Filter,
  Download,
  X,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import type { Colis } from '@/types';
import ProtectedRouteEnhanced from '../components/auth/ProtectedRouteEnhanced';

const ColisAeriens: React.FC = () => {
  const navigate = useNavigate();
  const [colis, setColis] = useState<Colis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statutFilter, setStatutFilter] = useState<string>('tous');
  const [selectedColis, setSelectedColis] = useState<Colis | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

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
    } catch (error) {
      console.error('Error loading colis:', error);
      showError('Erreur lors du chargement des colis');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les colis
  const filteredColis = colis.filter(c => {
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

  // Supprimer un colis
  const handleDelete = async (colisId: string, colisName: string) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer le colis ${colisName} ?\n\nCette action est irréversible.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('colis')
        .delete()
        .eq('id', colisId);

      if (error) throw error;

      showSuccess('Colis supprimé avec succès');
      loadColis(); // Recharger la liste
    } catch (error) {
      console.error('Error deleting colis:', error);
      showError('Erreur lors de la suppression du colis');
    }
  };

  // Statistiques rapides
  const stats = {
    total: filteredColis.length,
    enTransit: filteredColis.filter(c => c.statut === 'en_transit').length,
    arrives: filteredColis.filter(c => c.statut === 'arrive_congo').length,
    montantTotal: filteredColis.reduce((sum, c) => sum + c.montant_a_payer, 0),
    nonPayes: filteredColis.filter(c => c.statut_paiement === 'non_paye').length
  };

  return (
    <ProtectedRouteEnhanced requiredModule="colis">
      <Layout>
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
                    <p className="text-sm text-gray-500">À Encaisser</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.montantTotal, 'USD')}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-red-500" />
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
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left py-3 px-2 md:px-4 font-semibold text-sm text-gray-700">ID Colis</th>
                        <th className="text-left py-3 px-2 md:px-4 font-semibold text-sm text-gray-700">Client</th>
                        <th className="hidden md:table-cell py-3 px-2 md:px-4 font-semibold text-sm text-gray-700">Fournisseur</th>
                        <th className="hidden lg:table-cell py-3 px-2 md:px-4 font-semibold text-sm text-gray-700">Tracking</th>
                        <th className="text-center py-3 px-2 md:px-4 font-semibold text-sm text-gray-700">Qté</th>
                        <th className="text-center py-3 px-2 md:px-4 font-semibold text-sm text-gray-700">Poids (kg)</th>
                        <th className="hidden md:table-cell py-3 px-2 md:px-4 font-semibold text-sm text-gray-700">Tarif/kg</th>
                        <th className="text-right py-3 px-2 md:px-4 font-semibold text-sm text-gray-700">Montant</th>
                        <th className="hidden lg:table-cell py-3 px-2 md:px-4 font-semibold text-sm text-gray-700">Transitaire</th>
                        <th className="text-center py-3 px-2 md:px-4 font-semibold text-sm text-gray-700">Statut</th>
                        <th className="text-center py-3 px-2 md:px-4 font-semibold text-sm text-gray-700">Paiement</th>
                        <th className="hidden md:table-cell py-3 px-2 md:px-4 font-semibold text-sm text-gray-700">Date Arrivée</th>
                        <th className="text-center py-3 px-2 md:px-4 font-semibold text-sm text-gray-700 w-12"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredColis.map((c) => (
                        <tr key={c.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-2 md:px-4">
                            <button
                              onClick={(e) => handleViewDetails(c, e)}
                              className="text-blue-600 hover:text-blue-800 font-mono text-sm font-medium hover:underline"
                              title="Voir les détails du colis"
                              type="button"
                            >
                              {generateColisId(c)}
                            </button>
                          </td>
                          <td className="py-3 px-2 md:px-4">
                            <div>
                              <p className="font-medium text-gray-900">{c.client?.nom}</p>
                              <p className="hidden md:block text-xs text-gray-500">{c.client?.telephone}</p>
                            </div>
                          </td>
                          <td className="hidden md:table-cell py-3 px-2 md:px-4">
                            <Badge variant="outline" className="text-xs">
                              {c.fournisseur}
                            </Badge>
                          </td>
                          <td className="hidden lg:table-cell py-3 px-2 md:px-4">
                            <div className="text-sm">
                              <p className="text-sm text-gray-600">{c.tracking_chine || '-'}</p>
                              {c.numero_commande && (
                                <p className="text-xs text-gray-500">Cmd: {c.numero_commande}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2 md:px-4 text-center">
                            <span className="font-semibold text-gray-900">{c.quantite || 1}</span>
                          </td>
                          <td className="py-3 px-2 md:px-4 text-center">
                            <span className="font-semibold text-gray-900">{c.poids}</span>
                          </td>
                          <td className="hidden md:table-cell py-3 px-2 md:px-4 text-center">
                            <span className="text-sm">${c.tarif_kg}</span>
                          </td>
                          <td className="py-3 px-2 md:px-4 text-right">
                            <span className="font-bold text-green-600">
                              {formatCurrency(c.montant_a_payer, 'USD')}
                            </span>
                          </td>
                          <td className="hidden lg:table-cell py-3 px-2 md:px-4">
                            <span className="text-sm text-gray-600">
                              {c.transitaire?.nom || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-2 md:px-4 text-center">
                            {getStatutBadge(c.statut)}
                          </td>
                          <td className="py-3 px-2 md:px-4 text-center">
                            {getStatutPaiementBadge(c.statut_paiement)}
                          </td>
                          <td className="hidden md:table-cell py-3 px-2 md:px-4 text-center text-sm text-gray-600">
                            <div className="flex items-center justify-between">
                              <span>
                                {c.date_arrivee_agence 
                                  ? new Date(c.date_arrivee_agence).toLocaleDateString('fr-FR')
                                  : '-'
                                }
                              </span>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
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
                                  {c.statut_paiement !== 'paye' && (
                                    <>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => navigate(`/colis/aeriens/${c.id}/payer`)}
                                        className="cursor-pointer text-green-600"
                                      >
                                        <DollarSign className="h-4 w-4 mr-2" />
                                        Enregistrer paiement
                                      </DropdownMenuItem>
                                    </>
                                  )}
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
                            </div>
                          </td>
                          <td className="md:hidden py-3 px-2 md:px-4 text-center">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
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
                                {c.statut_paiement !== 'paye' && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => navigate(`/colis/aeriens/${c.id}/payer`)}
                                      className="cursor-pointer text-green-600"
                                    >
                                      <DollarSign className="h-4 w-4 mr-2" />
                                      Enregistrer paiement
                                    </DropdownMenuItem>
                                  </>
                                )}
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
                        <span className="text-sm text-gray-500">Adresse:</span>
                        <p className="font-medium">{selectedColis.client?.adresse || '-'}</p>
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
                  <Button
                    variant="outline"
                    onClick={() => setIsDetailModalOpen(false)}
                  >
                    Fermer
                  </Button>
                  <Button
                    onClick={() => {
                      setIsDetailModalOpen(false);
                      navigate(`/colis/aeriens/${selectedColis.id}/modifier`);
                    }}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier le colis
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </Layout>
    </ProtectedRouteEnhanced>
  );
};

export default ColisAeriens;
