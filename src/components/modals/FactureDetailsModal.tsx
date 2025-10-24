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
  FileText
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center">
              <FileText className="mr-2 h-5 w-5" />
              Détails de la {facture.type === 'devis' ? 'Devis' : 'Facture'}
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {facture.type === 'devis' ? '📄 Devis' : '📋 Facture'}
              </Badge>
              {getStatutBadge(facture.statut)}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations générales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Informations générales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Numéro</label>
                  <p className="font-semibold">{facture.facture_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Date d'émission</label>
                  <p className="font-semibold flex items-center">
                    <Calendar className="mr-1 h-4 w-4" />
                    {new Date(facture.date_emission).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Mode livraison</label>
                  <p className="font-semibold flex items-center">
                    {facture.mode_livraison === 'aerien' ? (
                      <>
                        <Plane className="mr-1 h-4 w-4" />
                        Aérien
                      </>
                    ) : (
                      <>
                        <Ship className="mr-1 h-4 w-4" />
                        Maritime
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Devise</label>
                  <p className="font-semibold">{facture.devise}</p>
                </div>
              </div>

              {facture.date_validation && (
                <div className="mt-4">
                  <label className="text-sm font-medium text-gray-600">Date de validation</label>
                  <p className="font-semibold flex items-center">
                    <Calendar className="mr-1 h-4 w-4" />
                    {new Date(facture.date_validation).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informations client */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="mr-2 h-5 w-5" />
                Informations client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Nom</label>
                  <p className="font-semibold">{(facture as any).clients?.nom || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Téléphone</label>
                  <p className="font-semibold">{(facture as any).clients?.telephone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Ville</label>
                  <p className="font-semibold">{(facture as any).clients?.ville || 'N/A'}</p>
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
                      <tr className="border-b">
                        <th className="text-left py-2 px-4 font-medium">N°</th>
                        <th className="text-left py-2 px-4 font-medium">Description</th>
                        <th className="text-center py-2 px-4 font-medium">Quantité</th>
                        <th className="text-right py-2 px-4 font-medium">Prix unitaire</th>
                        <th className="text-right py-2 px-4 font-medium">Poids</th>
                        <th className="text-right py-2 px-4 font-medium">Montant total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-2 px-4">{item.numero_ligne}</td>
                          <td className="py-2 px-4">{item.description}</td>
                          <td className="py-2 px-4 text-center">{item.quantite}</td>
                          <td className="py-2 px-4 text-right">
                            {formatCurrency(item.prix_unitaire, facture.devise)}
                          </td>
                          <td className="py-2 px-4 text-right">
                            {item.poids} {facture.mode_livraison === 'aerien' ? 'kg' : 'cbm'}
                          </td>
                          <td className="py-2 px-4 text-right font-medium">
                            {formatCurrency(item.montant_total, facture.devise)}
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Sous-total</label>
                  <p className="font-semibold">
                    {formatCurrency(facture.subtotal, facture.devise)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Poids total</label>
                  <p className="font-semibold">
                    {facture.total_poids} {facture.mode_livraison === 'aerien' ? 'kg' : 'cbm'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Frais transport</label>
                  <p className="font-semibold">
                    {formatCurrency(facture.shipping_fee, facture.devise)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Total général</label>
                  <p className="font-bold text-lg text-emerald-600">
                    {formatCurrency(facture.total_general, facture.devise)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Conditions et notes */}
          {(facture.conditions_vente || facture.notes) && (
            <Card>
              <CardHeader>
                <CardTitle>Conditions et notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {facture.conditions_vente && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Conditions de vente</label>
                    <p className="mt-1 text-sm bg-gray-50 p-3 rounded">
                      {facture.conditions_vente}
                    </p>
                  </div>
                )}
                {facture.notes && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Notes</label>
                    <p className="mt-1 text-sm bg-gray-50 p-3 rounded">
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