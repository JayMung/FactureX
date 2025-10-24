import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Eye, 
  Edit, 
  Trash2, 
  Download, 
  RefreshCw,
  Plane,
  Ship,
  Package,
  DollarSign,
  Calendar,
  User,
  FileText,
  ExternalLink
} from 'lucide-react';
import type { Facture, FactureItem } from '@/types';
import { generateFacturePDF } from '@/utils/pdfGenerator';
import { showSuccess, showError } from '@/utils/toast';

interface FactureDetailsModalProps {
  facture: Facture & { items?: FactureItem[] };
  isOpen: boolean;
  onClose: () => void;
}

const FactureDetailsModal: React.FC<FactureDetailsModalProps> = ({ 
  facture, 
  isOpen, 
  onClose 
}) => {
  const [loading, setLoading] = useState(false);

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

  const handleGeneratePDF = async () => {
    setLoading(true);
    try {
      // S'assurer que items est bien un tableau
      const factureWithItems: Facture & { items: FactureItem[] } = {
        ...facture,
        items: facture.items || []
      };
      
      await generateFacturePDF(factureWithItems);
      showSuccess('PDF généré avec succès');
    } catch (error: any) {
      console.error('Erreur lors de la génération du PDF:', error);
      showError('Erreur lors de la génération du PDF');
    } finally {
      setLoading(false);
    }
  };

  const items = facture.items || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <FileText className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Détails de la {facture.type === 'devis' ? 'Devis' : 'Facture'}</h2>
                <p className="text-sm text-gray-500">#{facture.facture_number}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="text-sm">
                {facture.type === 'devis' ? '📄 Devis' : '📋 Facture'}
              </Badge>
              {getStatutBadge(facture.statut)}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <Card className="border-l-4 border-l-emerald-500">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-transparent">
              <CardTitle className="flex items-center text-emerald-700">
                <Package className="mr-2 h-5 w-5" />
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Numéro</label>
                  <p className="text-base font-bold text-gray-900">{facture.facture_number}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date d'émission</label>
                  <p className="text-base font-semibold flex items-center text-gray-900">
                    <Calendar className="mr-2 h-4 w-4 text-emerald-600" />
                    {new Date(facture.date_emission).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Mode livraison</label>
                  <p className="text-base font-semibold flex items-center text-gray-900">
                    {facture.mode_livraison === 'aerien' ? (
                      <>
                        <Plane className="mr-2 h-4 w-4 text-blue-600" />
                        Aérien
                      </>
                    ) : (
                      <>
                        <Ship className="mr-2 h-4 w-4 text-blue-600" />
                        Maritime
                      </>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Devise</label>
                  <p className="text-base font-bold text-gray-900">{facture.devise}</p>
                </div>
              </div>

              {facture.date_validation && (
                <div className="mt-6 pt-4 border-t">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Date de validation</label>
                  <p className="text-base font-semibold flex items-center text-gray-900 mt-1">
                    <Calendar className="mr-2 h-4 w-4 text-emerald-600" />
                    {new Date(facture.date_validation).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations client */}
          <Card className="border-l-4 border-l-blue-500 bg-blue-50/30">
            <CardHeader className="bg-gradient-to-r from-blue-100/50 to-transparent">
              <CardTitle className="flex items-center text-blue-700">
                <User className="mr-2 h-5 w-5" />
                Informations client
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Nom</label>
                  <p className="text-lg font-bold text-gray-900">{(facture as any).client?.nom || (facture as any).clients?.nom || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Téléphone</label>
                  <p className="text-lg font-semibold text-gray-900">{(facture as any).client?.telephone || (facture as any).clients?.telephone || 'N/A'}</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Ville</label>
                  <p className="text-lg font-semibold text-gray-900">{(facture as any).client?.ville || (facture as any).clients?.ville || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Articles */}
          <Card>
            <CardHeader>
              <CardTitle>Articles ({items.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {items.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aucun article</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-300">
                        <th className="text-left py-3 px-3 font-semibold text-sm">N°</th>
                        <th className="text-left py-3 px-3 font-semibold text-sm">Description</th>
                        <th className="text-center py-3 px-3 font-semibold text-sm">Quantité</th>
                        <th className="text-right py-3 px-3 font-semibold text-sm">Prix unitaire</th>
                        <th className="text-right py-3 px-3 font-semibold text-sm">Poids</th>
                        <th className="text-right py-3 px-3 font-semibold text-sm">Montant total</th>
                        <th className="text-center py-3 px-3 font-semibold text-sm">Lien</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id} className={`border-b hover:bg-gray-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                          <td className="py-3 px-3 font-medium">{item.numero_ligne}</td>
                          <td className="py-3 px-3 max-w-xs">
                            <div className="line-clamp-2" title={item.description}>
                              {item.description}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center font-semibold">{item.quantite}</td>
                          <td className="py-3 px-3 text-right">
                            {formatCurrency(item.prix_unitaire, facture.devise)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono">{item.poids}</span> <span className="text-xs text-gray-500">{facture.mode_livraison === 'aerien' ? 'kg' : 'cbm'}</span>
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
                                className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
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
              <CardTitle className="flex items-center">
                <DollarSign className="mr-2 h-5 w-5" />
                Récapitulatif
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end">
                <div className="w-full md:w-96 space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium text-gray-600">Sous-total</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(facture.subtotal, facture.devise)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium text-gray-600">Poids total</span>
                    <span className="font-semibold text-gray-900">
                      {facture.total_poids} {facture.mode_livraison === 'aerien' ? 'kg' : 'cbm'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-sm font-medium text-gray-600">Frais transport & douane</span>
                    <span className="font-semibold text-gray-900">
                      {formatCurrency(facture.frais_transport_douane, facture.devise)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-emerald-50 px-4 rounded-lg border-2 border-emerald-200">
                    <span className="text-base font-bold text-emerald-900">Total général</span>
                    <span className="font-bold text-xl text-emerald-600">
                      {formatCurrency(facture.total_general, facture.devise)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conditions et notes */}
          {(facture.conditions_vente || facture.notes) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Conditions et notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {facture.conditions_vente && (
                  <div className="text-center">
                    <label className="text-sm font-medium text-gray-600 uppercase tracking-wide">Conditions de vente</label>
                    <p className="mt-2 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200 text-gray-700 leading-relaxed">
                      {facture.conditions_vente}
                    </p>
                  </div>
                )}
                {facture.notes && (
                  <div className="text-center">
                    <label className="text-sm font-medium text-gray-600 uppercase tracking-wide">Notes</label>
                    <p className="mt-2 text-sm bg-blue-50 p-4 rounded-lg border border-blue-200 text-gray-700 italic leading-relaxed">
                      {facture.notes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <div className="space-x-2">
              <Button 
                variant="outline" 
                onClick={handleGeneratePDF}
                disabled={loading}
              >
                <Download className="mr-2 h-4 w-4" />
                {loading ? 'Génération...' : 'Générer PDF'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FactureDetailsModal;