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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  Loader2,
  Eye,
  EyeOff
} from 'lucide-react';
import { useSettings, useExchangeRates, useFees } from '@/hooks/useSettings';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useUserProfiles } from '@/hooks/useUserProfiles';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import type { PaymentMethod, UserProfile } from '@/types';

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

  // États pour les dialogues
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentMethod | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  // Formulaires
  const [paymentForm, setPaymentForm] = useState({
    name: '',
    code: '',
    icon: '',
    description: '',
    is_active: true
  });

  const [userForm, setUserForm] = useState({
    user_id: '',
    full_name: '',
    role: 'operateur' as 'admin' | 'operateur',
    phone: '',
    is_active: true
  });

  const { updateSettings, isUpdating } = useSettings();
  const { rates, isLoading: ratesLoading } = useExchangeRates();
  const { fees: currentFees, isLoading: feesLoading } = useFees();
  const { 
    paymentMethods, 
    isLoading: paymentsLoading, 
    togglePaymentMethod, 
    createPaymentMethod, 
    updatePaymentMethod, 
    deletePaymentMethod 
  } = usePaymentMethods();
  const { 
    userProfiles, 
    isLoading: usersLoading, 
    toggleUserProfile, 
    createUserProfile, 
    updateUserProfile 
  } = useUserProfiles();
  const { logs, isLoading: logsLoading } = useActivityLogs();

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

  React.useEffect(() => {
    if (currentFees) {
      setFees({
        transfert: currentFees.transfert.toString(),
        commande: currentFees.commande.toString(),
        partenaire: currentFees.partenaire.toString()
      });
    }
  }, [currentFees]);

  // Debug user role
  React.useEffect(() => {
    const checkUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('User metadata:', user?.user_metadata);
      console.log('App metadata:', user?.app_metadata);
      console.log('JWT claims:', user?.aud);
    };
    checkUserRole();
  }, []);

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

  const handleTogglePayment = async (id: string, isActive: boolean) => {
    try {
      await togglePaymentMethod(id, isActive);
      showSuccess(`Mode de paiement ${isActive ? 'activé' : 'désactivé'} avec succès`);
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleToggleUser = async (id: string, isActive: boolean) => {
    try {
      await toggleUserProfile(id, isActive);
      showSuccess(`Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès`);
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleSavePayment = async () => {
    try {
      if (editingPayment) {
        await updatePaymentMethod(editingPayment.id, paymentForm);
        showSuccess('Mode de paiement mis à jour avec succès');
      } else {
        await createPaymentMethod(paymentForm as any);
        showSuccess('Mode de paiement créé avec succès');
      }
      setPaymentDialogOpen(false);
      resetPaymentForm();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleSaveUser = async () => {
    try {
      if (editingUser) {
        await updateUserProfile(editingUser.id, userForm);
        showSuccess('Profil utilisateur mis à jour avec succès');
      } else {
        await createUserProfile(userForm as any);
        showSuccess('Profil utilisateur créé avec succès');
      }
      setUserDialogOpen(false);
      resetUserForm();
    } catch (error: any) {
      showError(error.message);
    }
  };

  const handleEditPayment = (payment: PaymentMethod) => {
    setEditingPayment(payment);
    setPaymentForm({
      name: payment.name,
      code: payment.code,
      icon: payment.icon || '',
      description: payment.description || '',
      is_active: payment.is_active
    });
    setPaymentDialogOpen(true);
  };

  const handleEditUser = (user: UserProfile) => {
    setEditingUser(user);
    setUserForm({
      user_id: user.user_id,
      full_name: user.full_name,
      role: user.role,
      phone: user.phone || '',
      is_active: user.is_active
    });
    setUserDialogOpen(true);
  };

  const handleDeletePayment = async (id: string) => {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce mode de paiement ?')) {
      try {
        await deletePaymentMethod(id);
        showSuccess('Mode de paiement supprimé avec succès');
      } catch (error: any) {
        showError(error.message);
      }
    }
  };

  const resetPaymentForm = () => {
    setPaymentForm({
      name: '',
      code: '',
      icon: '',
      description: '',
      is_active: true
    });
    setEditingPayment(null);
  };

  const resetUserForm = () => {
    setUserForm({
      user_id: '',
      full_name: '',
      role: 'operateur',
      phone: '',
      is_active: true
    });
    setEditingUser(null);
  };

  const transactionStatuses = [
    { id: 1, name: 'En attente', color: 'yellow' },
    { id: 2, name: 'Servi', color: 'green' },
    { id: 3, name: 'Remboursé', color: 'blue' },
    { id: 4, name: 'Annulé', color: 'red' }
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
                  <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={resetPaymentForm}>
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingPayment ? 'Modifier le mode de paiement' : 'Ajouter un mode de paiement'}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="payment-name">Nom</Label>
                          <Input
                            id="payment-name"
                            value={paymentForm.name}
                            onChange={(e) => setPaymentForm({...paymentForm, name: e.target.value})}
                            placeholder="Ex: Airtel Money"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment-code">Code</Label>
                          <Input
                            id="payment-code"
                            value={paymentForm.code}
                            onChange={(e) => setPaymentForm({...paymentForm, code: e.target.value})}
                            placeholder="Ex: airtel_money"
                            disabled={!!editingPayment}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment-icon">Icône</Label>
                          <Input
                            id="payment-icon"
                            value={paymentForm.icon}
                            onChange={(e) => setPaymentForm({...paymentForm, icon: e.target.value})}
                            placeholder="Ex: smartphone"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="payment-description">Description</Label>
                          <Textarea
                            id="payment-description"
                            value={paymentForm.description}
                            onChange={(e) => setPaymentForm({...paymentForm, description: e.target.value})}
                            placeholder="Description du mode de paiement"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={paymentForm.is_active}
                            onCheckedChange={(checked) => setPaymentForm({...paymentForm, is_active: checked})}
                          />
                          <Label>Actif</Label>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                            Annuler
                          </Button>
                          <Button onClick={handleSavePayment}>
                            {editingPayment ? 'Mettre à jour' : 'Créer'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {paymentsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="h-6 w-6" />
                          <Skeleton className="h-4 w-32" />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Switch 
                            checked={method.is_active} 
                            onCheckedChange={(checked) => handleTogglePayment(method.id, checked)}
                          />
                          <div>
                            <span className="font-medium">{method.name}</span>
                            {method.description && (
                              <p className="text-sm text-gray-500">{method.description}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEditPayment(method)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-red-600"
                            onClick={() => handleDeletePayment(method.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm" onClick={resetUserForm}>
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter un utilisateur
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>
                          {editingUser ? 'Modifier le profil utilisateur' : 'Ajouter un profil utilisateur'}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="user-id">ID Utilisateur</Label>
                          <Input
                            id="user-id"
                            value={userForm.user_id}
                            onChange={(e) => setUserForm({...userForm, user_id: e.target.value})}
                            placeholder="UUID de l'utilisateur"
                            disabled={!!editingUser}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-name">Nom complet</Label>
                          <Input
                            id="user-name"
                            value={userForm.full_name}
                            onChange={(e) => setUserForm({...userForm, full_name: e.target.value})}
                            placeholder="Nom complet de l'utilisateur"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-role">Rôle</Label>
                          <Select value={userForm.role} onValueChange={(value: 'admin' | 'operateur') => setUserForm({...userForm, role: value})}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="operateur">Opérateur</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-phone">Téléphone</Label>
                          <Input
                            id="user-phone"
                            value={userForm.phone}
                            onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                            placeholder="Numéro de téléphone"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={userForm.is_active}
                            onCheckedChange={(checked) => setUserForm({...userForm, is_active: checked})}
                          />
                          <Label>Actif</Label>
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setUserDialogOpen(false)}>
                            Annuler
                          </Button>
                          <Button onClick={handleSaveUser}>
                            {editingUser ? 'Mettre à jour' : 'Créer'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="h-10 w-10 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-24 mb-1" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Skeleton className="h-6 w-16" />
                          <Skeleton className="h-8 w-8" />
                          <Skeleton className="h-8 w-8" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
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
                        {userProfiles.map((user) => (
                          <tr key={user.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-4 font-medium">{user.full_name}</td>
                            <td className="py-3 px-4 text-gray-600">{user.user?.email}</td>
                            <td className="py-3 px-4">
                              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                {user.role === 'admin' ? 'Admin' : 'Opérateur'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <Badge className={user.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                                {user.is_active ? 'Actif' : 'Inactif'}
                              </Badge>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="icon"
                                  onClick={() => handleToggleUser(user.id, !user.is_active)}
                                >
                                  {user.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
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
                {logsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-4 w-48" />
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Skeleton className="h-5 w-20" />
                            <Skeleton className="h-3 w-24" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {logs.data.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{log.user?.email || 'Utilisateur inconnu'}</span>
                            <span className="text-gray-400">•</span>
                            <span className="text-gray-600">{log.action}</span>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline">{log.entity_type || 'Système'}</Badge>
                            <span className="text-xs text-gray-500">
                              {new Date(log.created_at).toLocaleString('fr-FR')}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;