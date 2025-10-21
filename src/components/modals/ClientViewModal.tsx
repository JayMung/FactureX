import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  User, 
  Phone, 
  MapPin, 
  DollarSign, 
  Calendar,
  Clock,
  X
} from 'lucide-react';
import type { Client } from '@/types';

interface ClientViewModalProps {
  client: Client | null;
  isOpen: boolean;
  onClose: () => void;
}

const ClientViewModal: React.FC<ClientViewModalProps> = ({
  client,
  isOpen,
  onClose,
}) => {
  if (!client) return null;

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-semibold text-gray-900">
              Détails du Client
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header avec infos principales */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <User className="h-6 w-6 text-emerald-600" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {client.nom}
                  </h3>
                  <p className="text-sm text-gray-500">
                    Client ID: {client.id.slice(0, 8)}...
                  </p>
                </div>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Actif
                </Badge>
              </div>
            </CardHeader>
          </Card>

          {/* Informations de contact */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Informations de Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Téléphone</p>
                  <p className="text-sm text-gray-600">{client.telephone}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Ville</p>
                  <p className="text-sm text-gray-600">{client.ville}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Informations financières */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Informations Financières
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Total Payé</p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {formatCurrency(client.total_paye || 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Historique */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-medium">
                Historique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Date de création</p>
                  <p className="text-sm text-gray-600">
                    {formatDate(client.created_at)}
                  </p>
                </div>
              </div>
              {client.updated_at && (
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Dernière modification</p>
                    <p className="text-sm text-gray-600">
                      {formatDate(client.updated_at)}
                    </p>
                  </div>
                </div>
              )}
              {client.created_by && (
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Créé par</p>
                    <p className="text-sm text-gray-600">{client.created_by}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientViewModal;