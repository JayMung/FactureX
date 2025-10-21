"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Phone, 
  MapPin, 
  Mail, 
  Calendar,
  DollarSign,
  X,
  User,
  Building
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
  onClose
}) => {
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

  if (!client) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Détails du Client</span>
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations principales */}
          <div className="flex items-center space-x-4 pb-4 border-b">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-emerald-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">{client.nom}</h2>
              <p className="text-gray-500">ID: {client.id.slice(0, 8)}...</p>
            </div>
            <Badge className="bg-emerald-100 text-emerald-800">
              Actif
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Informations de contact */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Phone className="mr-2 h-5 w-5 text-blue-600" />
                  Informations de Contact
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{client.telephone}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span className="text-gray-900">{client.ville}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informations financières */}
            <Card>
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <DollarSign className="mr-2 h-5 w-5 text-green-600" />
                  Informations Financières
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total payé:</span>
                    <span className="font-semibold text-green-600">
                      {formatCurrency(client.total_paye || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Statut:</span>
                    <Badge variant="outline">Client régulier</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Historique */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Calendar className="mr-2 h-5 w-5 text-purple-600" />
                Historique
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600">Date de création:</span>
                  <span className="text-gray-900">{formatDate(client.created_at)}</span>
                </div>
                {client.updated_at && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Dernière modification:</span>
                    <span className="text-gray-900">{formatDate(client.updated_at)}</span>
                  </div>
                )}
                {client.created_by && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Créé par:</span>
                    <span className="text-gray-900">{client.created_by}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Actions rapides */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Fermer
            </Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700">
              Modifier les informations
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientViewModal;