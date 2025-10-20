"use client";

import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Settings as SettingsIcon,
  TrendingUp,
  Percent,
  CreditCard,
  Users,
  Activity,
  Plus,
  Edit,
  Trash2,
  Save,
  Loader2
} from 'lucide-react';
import { useSettings, useExchangeRates, useFees } from '@/hooks/useSettings';
import { showSuccess, showError } from '@/utils/toast';

const Settings = () => {
  const [exchangeRates, setExchangeRates] = useState({
    usdToCny: '7.25',
    usdToCdf: '2850',
    autoMode: false
  });

  const [fees, setFees] = useState({
    transfert: '5',
    commande: '10',
    partenaire: '3'
  });

  const { updateSettings, isUpdating } = useSettings();
  const { rates, isLoading: ratesLoading } = useExchangeRates();
  const { fees: currentFees, isLoading: feesLoading } = useFees();

  // Charger les données actuelles
  React.useEffect(() => {
    if (rates) {
      setExchangeRates({
        usdToCny: rates.usdToCny.toString(),
        usdToCdf: rates.usdToCdf.toString(),
        autoMode: false
      });
    }
  }, [rates]);
// Ajoutez ceci dans le composant Settings pour déboguer
React.useEffect(() => {
  const checkUserRole = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    console.log('User metadata:', user?.user_metadata);
    console.log('App metadata:', user?.app_metadata);
    console.log('JWT claims:', user?.aud);
  };
  checkUserRole();
}, []);

  React.useEffect(() => {
    if (currentFees) {
      setFees({
        transfert: currentFees.transfert.toString(),
        commande: currentFees.commande.toString(),
        partenaire: currentFees.partenaire.toString()
      });
    }
  }, [currentFees]);

  const handleSaveExchangeRates = async () => {
    try {
      await updateSettings({
        categorie: 'taux_change',
        settings: {
          usdToCny: exchangeRates.usdToCny,
          usdToCdf: exchangeRates.usdToCdf
        }
      });
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la sauvegarde des taux');
    }
  };

  const handleSaveFees = async () => {
    try {
      await updateSettings({
        categorie: 'frais',
        settings: {
          transfert: fees.transfert,
          commande: fees.commande,
          partenaire: fees.partenaire
        }
      });
    } catch (error: any) {
      showError(error.message || 'Erreur lors de la sauvegarde des frais');
    }
  };

  const paymentMethods = [
    { id: 1, name: 'Cash', active: true },
    { id: 2, name: 'Airtel Money', active: true },
    { id: 3, name: 'Orange Money', active: true },
    { id: 4, name: 'M-Pesa', active: true },
    { id: 5, name: 'Banque', active: true }
  ];

  const transactionStatuses = [
    { id: 1, name: 'En attente', color: 'yellow' },
    { id: 2, name: 'Servi', color: 'green' },
    { id: 3, name: 'Remboursé', color: 'blue' },
    { id: 4, name: 'Annulé', color: 'red' }
  ];

  const paymentMotifs = [
    { id: 1, name: 'Commande', fee: '10%' },
    { id: 2, name: 'Transfert', fee: '5%' }
  ];

  const users = [
    { id: 1, name: 'Admin', email: 'admin@coxipay.com', role: 'admin', status: 'Actif' },
    { id: 2, name: 'Opérateur 1', email: 'op1@coxipay.com', role: 'operateur', status: 'Actif' },
    { id: 3, name: 'Opérateur 2', email: 'op2@coxipay.com', role: 'operateur', status: 'Inactif' }
  ];

  const recentLogs = [
    { id: 1, user: 'Admin', action: 'Validation transaction TRX-001', target: 'Transaction', date: '20/10/2025 14:30' },
    { id: 2, user: 'Opérateur 1', action: 'Création client Jean Mukendi', target: 'Client', date: '20/10/2025 13:15' },
    { id: 3, user: 'Admin', action: 'Modification taux USD→CNY', target: 'Paramètres', date: '20/10/2025 10:00' },
    { id: 4, user: 'Opérateur 2', action: 'Création transaction TRX-002', target: 'Transaction', date: '19/10/2025 16:45' }
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Paramètres</h2>
          <p className="text-gray-500">Configurez les paramètres de l'application CoxiPay</p>
        </div>

        <Tabs defaultValue="rates" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="rates">Taux de change</TabsTrigger>
            <TabsTrigger value="fees">Frais</TabsTrigger>
            <TabsTrigger value="payment">Modes de paiement</TabsTrigger>
            <TabsTrigger value="status">Statuts</TabsTrigger>
            <TabsTrigger value="users">Utilisateurs</TabsTrigger>
            <TabsTrigger value="logs">Logs d'activité</TabsTrigger>
          </TabsList>

          {/* Exchange Rates */}
          <TabsContent value="rates">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="h-5 w-5" />
                  <span>Taux de change</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {ratesLoading ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-10 w-full" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="usd-cny">USD → CNY</Label>
                        <Input
                          id="usd-cny"
                          type="number"
                          step="0.01"
                          value={exchangeRates.usdToCny}
                          onChange={(e) => setExchangeRates({...exchangeRates, usdToCny: e.target.value})}
                          placeholder="7.25"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="usd-cdf">USD → CDF</Label>
                        <Input
                          id="usd-cdf"
                          type="number"
                          step="1"
                          value={exchangeRates.usdToCdf}
                          onChange={(e) => setExchangeRates({...exchangeRates, usdToCdf: e.target.value})}
                          placeholder="2850"
                        />
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={exchangeRates.autoMode}
                        onCheckedChange={(checked) => setExchangeRates({...exchangeRates, autoMode: checked})}
                      />
                      <Label>Mode automatique via API</Label>
                    </div>
                    
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleSaveExchangeRates}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sauvegarde...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Enregistrer les taux
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Fees */}
          <TabsContent value="fees">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Percent className="h-5 w-5" />
                  <span>Frais de transaction</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {feesLoading ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <div key={index} className="space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="fee-transfert">Frais transfert (%)</Label>
                        <Input
                          id="fee-transfert"
                          type="number"
                          step="0.1"
                          value={fees.transfert}
                          onChange={(e) => setFees({...fees, transfert: e.target.value})}
                          placeholder="5"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fee-commande">Frais commande (%)</Label>
                        <Input
                          id="fee-commande"
                          type="number"
                          step="0.1"
                          value={fees.commande}
                          onChange={(e) => setFees({...fees, commande: e.target.value})}
                          placeholder="10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fee-partenaire">Commission partenaire (%)</Label>
                        <Input
                          id="fee-partenaire"
                          type="number"
                          step="0.1"
                          value={fees.partenaire}
                          onChange={(e) => setFees({...fees, partenaire: e.target.value})}
                          placeholder="3"
                        />
                      </div>
                    </div>
                    
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleSaveFees}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sauvegarde...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Enregistrer les frais
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payment Methods */}
          <TabsContent value="payment">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CreditCard className="h-5 w-5" />
                    <span>Modes de paiement</span>
                  </div>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentMethods.map((method) => (
                    <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Switch checked={method.active} />
                        <span className="font-medium">{method.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transaction Status */}
          <TabsContent value="status">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Statuts de transaction</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {transactionStatuses.map((status) => (
                    <div key={status.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge className={`bg-${status.color}-100 text-${status.color}-800`}>
                          {status.name}
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users */}
          <TabsContent value="users">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Users className="h-5 w-5" />
                    <span>Utilisateurs & Permissions</span>
                  </div>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter un utilisateur
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Nom</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Rôle</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Statut</th>
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={user.id} className="border-b hover:bg-gray-50">
                          <td className="py-3 px-4 font-medium">{user.name}</td>
                          <td className="py-3 px-4 text-gray-600">{user.email}</td>
                          <td className="py-3 px-4">
                            <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                              {user.role === 'admin' ? 'Admin' : 'Opérateur'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={user.status === 'Actif' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                              {user.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-2">
                              <Button variant="ghost" size="icon">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="text-red-600">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Logs */}
          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="h-5 w-5" />
                  <span>Logs d'activité</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium">{log.user}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600">{log.action}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline">{log.target}</Badge>
                          <span className="text-xs text-gray-500">{log.date}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;