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
  Plane,
  Plus,
  Search,
  Edit,
  Eye,
  DollarSign,
  Package,
  Filter,
  Download
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Client</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Fournisseur</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Tracking</th>
                        <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Poids (kg)</th>
                        <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Tarif/kg</th>
                        <th className="text-right py-3 px-4 font-semibold text-sm text-gray-700">Montant</th>
                        <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Transitaire</th>
                        <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Statut</th>
                        <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Paiement</th>
                        <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Date Arrivée</th>
                        <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredColis.map((c) => (
                        <tr key={c.id} className="border-b hover:bg-gray-50 transition-colors">
                          <td className="py-3 px-4">
                            <div>
                              <p className="font-medium text-gray-900">{c.client?.nom}</p>
                              <p className="text-xs text-gray-500">{c.client?.telephone}</p>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant="outline" className="text-xs">
                              {c.fournisseur}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-sm">
                              <p className="font-mono text-xs text-gray-600">{c.tracking_chine || '-'}</p>
                              {c.numero_commande && (
                                <p className="text-xs text-gray-400">Cmd: {c.numero_commande}</p>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-semibold">{c.poids}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="text-sm">${c.tarif_kg}</span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-bold text-green-600">
                              {formatCurrency(c.montant_a_payer, 'USD')}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-gray-600">
                              {c.transitaire?.nom || '-'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            {getStatutBadge(c.statut)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {getStatutPaiementBadge(c.statut_paiement)}
                          </td>
                          <td className="py-3 px-4 text-center text-sm text-gray-600">
                            {c.date_arrivee_agence 
                              ? new Date(c.date_arrivee_agence).toLocaleDateString('fr-FR')
                              : '-'
                            }
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/colis/aeriens/${c.id}`)}
                                title="Voir détails"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate(`/colis/aeriens/${c.id}/modifier`)}
                                title="Modifier"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              {c.statut_paiement !== 'paye' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700"
                                  onClick={() => navigate(`/colis/aeriens/${c.id}/payer`)}
                                  title="Enregistrer paiement"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
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
      </Layout>
    </ProtectedRouteEnhanced>
  );
};

export default ColisAeriens;
