import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Receipt, 
  FileText, 
  Calendar,
  DollarSign,
  User,
  Phone,
  MapPin
} from 'lucide-react';
import type { Client } from '@/types';
import ClientFacturesTab from './ClientFacturesTab';

interface ClientHistoryModalProps {
  client: Client | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ClientHistoryModal: React.FC<ClientHistoryModalProps> = ({ 
  client, 
  open, 
  onOpenChange 
}) => {
  const [activeTab, setActiveTab] = useState('transactions');

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{client.nom}</h2>
              <p className="text-sm text-gray-500">Historique complet</p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informations client */}
          <Card>
            <CardHeader>
              <CardTitle>Informations client</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{client.telephone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{client.ville}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium">
                    Total payé: ${client.total_paye?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Onglets */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="transactions" className="flex items-center space-x-2">
                <Receipt className="h-4 w-4" />
                <span>Transactions</span>
              </TabsTrigger>
              <TabsTrigger value="factures" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Factures</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transactions" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Historique des transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                      L'historique des transactions sera bientôt disponible
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="factures" className="mt-6">
              <ClientFacturesTab 
                clientId={client.id} 
                clientName={client.nom} 
              />
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ClientHistoryModal;