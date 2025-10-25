"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  FileText,
  Calendar,
  User,
  MapPin,
  Phone,
  Package,
  Calculator,
  Download,
  Edit,
  Trash2,
  RefreshCw,
  ExternalLink,
  Image as ImageIcon,
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import ImagePreview from '@/components/ui/ImagePreview';
import { generateFacturePDF } from '@/utils/pdfGenerator';
import { showSuccess, showError } from '@/utils/toast';
import { useFactures } from '../hooks/useFactures';
import ProtectedRouteEnhanced from '../components/auth/ProtectedRouteEnhanced';
import PermissionGuard from '../components/auth/PermissionGuard';
import type { Facture } from '@/types';

const FacturesView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getFactureWithItems, deleteFacture, convertToFacture } = useFactures();
  
  const [facture, setFacture] = useState<Facture | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  usePageSetup({
    title: facture ? `${facture.type === 'devis' ? 'Devis' : 'Facture'} #${facture.facture_number}` : 'Détails',
    subtitle: 'Détails complets de la facture ou du devis'
  });

  useEffect(() => {
    const loadFacture = async () => {
      if (!id) {
        navigate('/factures');
        return;
      }

      setLoading(true);
      try {
        const data = await getFactureWithItems(id);
        if (!data) {
          showError('Facture introuvable');
          navigate('/factures');
          return;
        }
        setFacture(data);
      } catch (error) {
        console.error('Error loading facture:', error);
        showError('Erreur lors du chargement de la facture');
        navigate('/factures');
      } finally {
        setLoading(false);
      }
    };

    loadFacture();
  }, [id]);

  const handleConvertToFacture = async () => {
    if (!facture || facture.type !== 'devis') return;
    
    setActionLoading(true);
    try {
      await convertToFacture(facture.id);
      showSuccess('Devis converti en facture avec succès');
      // Reload facture data
      const updatedFacture = await getFactureWithItems(facture.id);
      setFacture(updatedFacture);
    } catch (error) {
      console.error('Error converting to facture:', error);
      showError('Erreur lors de la conversion');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!facture) return;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture?')) return;
    
    setActionLoading(true);
    try {
      await deleteFacture(facture.id);
      showSuccess('Facture supprimée avec succès');
      navigate('/factures');
    } catch (error) {
      console.error('Error deleting facture:', error);
      showError('Erreur lors de la suppression');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = () => {
    if (!facture) return;
    navigate(`/factures/edit/${facture.id}`);
  };

  const handleGeneratePDF = async () => {
    if (!facture) return;
    
    setActionLoading(true);
    try {
      await generateFacturePDF(facture);
      showSuccess('PDF généré avec succès');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showError('Erreur lors de la génération du PDF');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatutBadge = (statut: string) => {
    const variants: Record<string, { variant: any; className: string; label: string }> = {
      brouillon: { variant: 'secondary' as const, className: 'bg-gray-100 text-gray-800', label: 'Brouillon' },
      en_attente: { variant: 'secondary' as const, className: 'bg-yellow-100 text-yellow-800', label: 'En attente' },
      validee: { variant: 'default' as const, className: 'bg-green-500 text-white', label: 'Validée' },
      annulee: { variant: 'destructive' as const, className: 'bg-red-100 text-red-800', label: 'Annulée' }
    };
    
    const config = variants[statut] || variants.brouillon;
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <ProtectedRouteEnhanced requiredModule="factures" requiredPermission="read">
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement...</p>
            </div>
          </div>
        </Layout>
      </ProtectedRouteEnhanced>
    );
  }

  if (!facture) {
    return (
      <ProtectedRouteEnhanced requiredModule="factures" requiredPermission="read">
        <Layout>
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <p className="text-red-600">Facture introuvable</p>
            </div>
          </div>
        </Layout>
      </ProtectedRouteEnhanced>
    );
  }

  const items = facture.items || [];

  return (
    <ProtectedRouteEnhanced requiredModule="factures" requiredPermission="read">
      <Layout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                onClick={() => navigate('/factures')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Retour
              </Button>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <FileText className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {facture.type === 'devis' ? 'Devis' : 'Facture'} #{facture.facture_number}
                  </h1>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">
                      {facture.type === 'devis' ? '📄 Devis' : '📋 Facture'}
                    </Badge>
                    {getStatutBadge(facture.statut)}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions principales */}
            <div className="flex space-x-3">
              <PermissionGuard module="factures" permission="update">
                <Button
                  variant="outline"
                  onClick={handleEdit}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Modifier
                </Button>
              </PermissionGuard>
              <Button
                variant="outline"
                onClick={handleGeneratePDF}
                disabled={actionLoading}
              >
                <Download className="mr-2 h-4 w-4" />
                Générer PDF
              </Button>
            </div>
          </div>

          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations générales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    NUMÉRO
                  </label>
                  <p className="text-base font-bold text-gray-900">
                    {facture.facture_number}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    DATE D'ÉMISSION
                  </label>
                  <p className="text-base font-semibold flex items-center text-gray-900">
                    <Calendar className="mr-2 h-4 w-4 text-green-500" />
                    {new Date(facture.date_emission).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    MODE LIVRAISON
                  </label>
                  <p className="text-base font-semibold text-gray-900">
                    {facture.mode_livraison === 'aerien' ? 'Aérien' : 'Maritime'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    DEVISE
                  </label>
                  <p className="text-base font-semibold text-gray-900">
                    {facture.devise}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations client */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informations client</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    NOM
                  </label>
                  <p className="text-base font-semibold flex items-center text-gray-900">
                    <User className="mr-2 h-4 w-4 text-green-500" />
                    {(facture as any).clients?.nom || (facture as any).client?.nom || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    TÉLÉPHONE
                  </label>
                  <p className="text-base font-semibold flex items-center text-gray-900">
                    <Phone className="mr-2 h-4 w-4 text-green-500" />
                    {(facture as any).clients?.telephone || (facture as any).client?.telephone || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    VILLE
                  </label>
                  <p className="text-base font-semibold flex items-center text-gray-900">
                    <MapPin className="mr-2 h-4 w-4 text-green-500" />
                    {(facture as any).clients?.ville || (facture as any).client?.ville || 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Articles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Articles ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Aucun article dans cette facture</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="text-left py-3 px-3 font-semibold text-sm">N°</th>
                        <th className="text-left py-3 px-3 font-semibold text-sm">Image</th>
                        <th className="text-left py-3 px-3 font-semibold text-sm">Description</th>
                        <th className="text-center py-3 px-3 font-semibold text-sm">Quantité</th>
                        <th className="text-right py-3 px-3 font-semibold text-sm">Prix unitaire</th>
                        <th className="text-right py-3 px-3 font-semibold text-sm">Poids</th>
                        <th className="text-right py-3 px-3 font-semibold text-sm">Montant total</th>
                        <th className="text-center py-3 px-3 font-semibold text-sm">Lien</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, index) => (
                        <tr key={item.id || index} className="border-b hover:bg-gray-50 transition-colors bg-white">
                          <td className="py-3 px-3 font-medium">{item.numero_ligne}</td>
                          <td className="py-3 px-3">
                            {item.image_url ? (
                              <div className="flex items-center justify-center">
                                <ImagePreview 
                                  url={item.image_url} 
                                  alt={`Article ${item.numero_ligne}`}
                                  size="sm"
                                  className="border rounded"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center">
                                <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                                  <ImageIcon className="h-6 w-6 text-gray-400" />
                                </div>
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 max-w-xs">
                            <div className="line-clamp-2" title={item.description}>
                              {item.description || '-'}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-semibold">{item.quantite}</td>
                          <td className="py-3 px-3 text-right">
                            {formatCurrency(item.prix_unitaire, facture.devise)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono">
                              {item.poids} <span className="text-xs text-gray-500">kg</span>
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-bold text-green-500">
                            {formatCurrency(item.montant_total, facture.devise)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {item.product_url ? (
                              <a
                                href={item.product_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-500 hover:text-green-600 inline-flex items-center"
                                title="Voir le produit"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            ) : (
                              <span className="text-gray-300">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Récapitulatif */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Calculator className="mr-2 h-5 w-5" />
                Récapitulatif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-w-md ml-auto">
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Sous-total</span>
                  <span className="font-semibold text-lg">
                    {formatCurrency(facture.subtotal, facture.devise)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Poids total</span>
                  <span className="font-mono">
                    {facture.total_poids} <span className="text-xs text-gray-500">kg</span>
                  </span>
                </div>
                <div className="flex justify-between items-center py-2 border-b">
                  <span className="text-gray-600">Frais transport & douane</span>
                  <span className="font-semibold text-lg">
                    {formatCurrency(facture.frais_transport_douane, facture.devise)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 bg-green-50 rounded-lg px-4">
                  <span className="font-bold text-lg text-green-600">Total général</span>
                  <span className="font-bold text-2xl text-green-600">
                    {formatCurrency(facture.total_general, facture.devise)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes et conditions */}
          {(facture.conditions_vente || facture.notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes et conditions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {facture.conditions_vente && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Conditions de vente
                    </label>
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                      {facture.conditions_vente}
                    </p>
                  </div>
                )}
                {facture.notes && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Notes
                    </label>
                    <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                      {facture.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex space-x-3">
              {facture.type === 'devis' && facture.statut === 'brouillon' && (
                <PermissionGuard module="factures" permission="update">
                  <Button
                    onClick={handleConvertToFacture}
                    disabled={actionLoading}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Convertir en facture
                  </Button>
                </PermissionGuard>
              )}
            </div>
            <div className="flex space-x-3">
              <PermissionGuard module="factures" permission="delete">
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={actionLoading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </Button>
              </PermissionGuard>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRouteEnhanced>
  );
};

export default FacturesView;
