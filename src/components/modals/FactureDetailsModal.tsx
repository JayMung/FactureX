import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Image as ImageIcon
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatCurrency';
import ImagePreview from '@/components/ui/ImagePreview';
import { generateFacturePDF } from '@/utils/pdfGenerator';
import { showSuccess, showError } from '@/utils/toast';
import type { Facture, FactureItem } from '@/types';

interface FactureDetailsModalProps {
  facture: Facture | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: (id: string, data: any) => void;
  onDuplicate?: (facture: Facture) => void;
}

const FactureDetailsModal: React.FC<FactureDetailsModalProps> = ({
  facture,
  isOpen,
  onClose,
  onUpdate,
  onDuplicate
}) => {
  const [loading, setLoading] = useState(false);

  if (!facture) return null;

  const handleConvertToFacture = async () => {
    if (!onUpdate || facture.type !== 'devis') return;
    
    setLoading(true);
    try {
      await onUpdate(facture.id, {
        type: 'facture',
        statut: 'validee'
      });
    } catch (error) {
      console.error('Error converting to facture:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!onUpdate) return;
    
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette facture?')) return;
    
    setLoading(true);
    try {
      await onUpdate(facture.id, { statut: 'annulee' });
      onClose();
    } catch (error) {
      console.error('Error deleting facture:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(facture);
      onClose();
    }
  };

  const handleGeneratePDF = async () => {
    setLoading(true);
    try {
      await generateFacturePDF(facture);
      showSuccess('PDF généré avec succès');
    } catch (error) {
      console.error('Error generating PDF:', error);
      showError('Erreur lors de la génération du PDF');
    } finally {
      setLoading(false);
    }
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

  const items = facture.items || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <FileText className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">
                  Détails de la {facture.type === 'devis' ? 'Devis' : 'Facture'} #{facture.facture_number}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline">
                    {facture.type === 'devis' ? '📄 Devis' : '📋 Facture'}
                  </Badge>
                  {getStatutBadge(facture.statut)}
                </div>
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
                    <Calendar className="mr-2 h-4 w-4 text-emerald-600" />
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
                    <User className="mr-2 h-4 w-4 text-emerald-600" />
                    {(facture as any).clients?.nom || (facture as any).client?.nom || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    TÉLÉPHONE
                  </label>
                  <p className="text-base font-semibold flex items-center text-gray-900">
                    <Phone className="mr-2 h-4 w-4 text-emerald-600" />
                    {(facture as any).clients?.telephone || (facture as any).client?.telephone || 'N/A'}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    VILLE
                  </label>
                  <p className="text-base font-semibold flex items-center text-gray-900">
                    <MapPin className="mr-2 h-4 w-4 text-emerald-600" />
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
                          <td className="py-3 px-3 text-right font-bold text-emerald-600">
                            {formatCurrency(item.montant_total, facture.devise)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            {item.product_url ? (
                              <a
                                href={item.product_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 inline-flex items-center"
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
                <div className="flex justify-between items-center py-3 bg-emerald-50 rounded-lg px-4">
                  <span className="font-bold text-lg text-emerald-700">Total général</span>
                  <span className="font-bold text-2xl text-emerald-700">
                    {formatCurrency(facture.total_general, facture.devise)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex space-x-3">
              {facture.type === 'devis' && facture.statut === 'brouillon' && (
                <Button
                  onClick={handleConvertToFacture}
                  disabled={loading}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Convertir en facture
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleDuplicate}
              >
                <Edit className="mr-2 h-4 w-4" />
                Dupliquer
              </Button>
              <Button
                variant="outline"
                onClick={handleGeneratePDF}
                disabled={loading}
              >
                <Download className="mr-2 h-4 w-4" />
                Générer PDF
              </Button>
            </div>
            <div className="flex space-x-3">
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={loading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer
              </Button>
              <Button variant="outline" onClick={onClose}>
                Fermer
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FactureDetailsModal;