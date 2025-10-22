"use client";

import { useState, useEffect } from 'react';
import { 
  User as UserIcon, 
  CreditCard, 
  Settings as SettingsIcon, 
  DollarSign,
  Users,
  FileText,
  Shield,
  Info,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';

interface UserProfile {
  id: string;
  email: string;
  user_metadata?: any;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string;
}

interface PaymentMethod {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  icon?: string;
  description?: string;
}

interface SettingsOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  adminOnly?: boolean;
}

const Settings = () => {
  usePageSetup({
    title: 'Paramètres',
    subtitle: 'Configurez les préférences de votre application'
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  // États pour les formulaires
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: ''
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [exchangeRates, setExchangeRates] = useState({
    usdToCdf: '',
    usdToCny: ''
  });
  const [transactionFees, setTransactionFees] = useState({
    transfert: '',
    commande: '',
    partenaire: ''
  });

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser({
            id: user.id,
            email: user.email || '',
            user_metadata: user.user_metadata
          });
          
          // Fetch profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          setProfile(profileData);
          if (profileData) {
            setProfileForm({
              first_name: profileData.first_name || '',
              last_name: profileData.last_name || ''
            });
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndProfile();
    if (activeTab === 'payment-methods') {
      fetchPaymentMethods();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'activity-logs') {
      fetchActivityLogs();
    } else if (activeTab === 'exchange-rates' || activeTab === 'transaction-fees') {
      fetchSettings();
    }
  }, [activeTab]);

  const fetchPaymentMethods = async () => {
    try {
      const { data } = await supabase
        .from('payment_methods')
        .select('*')
        .order('name');
      
      setPaymentMethods(data || []);
    } catch (error) {
      console.error('Error fetching payment methods:', error);
      showError('Erreur lors du chargement des moyens de paiement');
    }
  };

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select(`
          *,
          auth_user:auth.users(email)
        `)
        .order('created_at', { ascending: false });
      
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      showError('Erreur lors du chargement des utilisateurs');
    }
  };

  const fetchActivityLogs = async () => {
    try {
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      
      setActivityLogs(data || []);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      showError('Erreur lors du chargement des logs d\'activité');
    }
  };

  const fetchSettings = async () => {
    try {
      const { data } = await supabase
        .from('settings')
        .select('*');
      
      if (data) {
        // Extraire les taux de change
        const rates = data.filter(s => s.categorie === 'taux_change');
        const usdToCdf = rates.find(r => r.cle === 'usdToCdf')?.valeur || '';
        const usdToCny = rates.find(r => r.cle === 'usdToCny')?.valeur || '';
        setExchangeRates({ usdToCdf, usdToCny });

        // Extraire les frais
        const fees = data.filter(s => s.categorie === 'frais');
        const transfert = fees.find(r => r.cle === 'transfert')?.valeur || '';
        const commande = fees.find(r => r.cle === 'commande')?.valeur || '';
        const partenaire = fees.find(r => r.cle === 'partenaire')?.valeur || '';
        setTransactionFees({ transfert, commande, partenaire });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      showError('Erreur lors du chargement des paramètres');
    }
  };

  // Fonctions CRUD
  const updateProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profileForm.first_name,
          last_name: profileForm.last_name
        })
        .eq('id', user?.id);

      if (error) throw error;
      
      // Mettre à jour le profil local
      const updatedProfile = { ...profile, ...profileForm };
      setProfile(updatedProfile);
      
      // Mettre à jour les métadonnées utilisateur
      await supabase.auth.updateUser({
        data: { first_name: profileForm.first_name, last_name: profileForm.last_name }
      });

      showSuccess('Profil mis à jour avec succès');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showError(error.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('Les mots de passe ne correspondent pas');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (error) throw error;
      
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSuccess('Mot de passe mis à jour avec succès');
    } catch (error: any) {
      console.error('Error updating password:', error);
      showError(error.message || 'Erreur lors de la mise à jour du mot de passe');
    } finally {
      setSaving(false);
    }
  };

  const updateExchangeRates = async () => {
    setSaving(true);
    try {
      const updates = [
        { categorie: 'taux_change', cle: 'usdToCdf', valeur: exchangeRates.usdToCdf },
        { categorie: 'taux_change', cle: 'usdToCny', valeur: exchangeRates.usdToCny }
      ];

      const { error } = await supabase
        .from('settings')
        .upsert(updates, { onConflict: 'categorie,cle' });

      if (error) throw error;
      showSuccess('Taux de change mis à jour avec succès');
    } catch (error: any) {
      console.error('Error updating exchange rates:', error);
      showError(error.message || 'Erreur lors de la mise à jour des taux de change');
    } finally {
      setSaving(false);
    }
  };

  const updateTransactionFees = async () => {
    setSaving(true);
    try {
      const updates = [
        { categorie: 'frais', cle: 'transfert', valeur: transactionFees.transfert },
        { categorie: 'frais', cle: 'commande', valeur: transactionFees.commande },
        { categorie: 'frais', cle: 'partenaire', valeur: transactionFees.partenaire }
      ];

      const { error } = await supabase
        .from('settings')
        .upsert(updates, { onConflict: 'categorie,cle' });

      if (error) throw error;
      showSuccess('Frais de transaction mis à jour avec succès');
    } catch (error: any) {
      console.error('Error updating transaction fees:', error);
      showError(error.message || 'Erreur lors de la mise à jour des frais de transaction');
    } finally {
      setSaving(false);
    }
  };

  const togglePaymentMethod = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      
      // Mettre à jour l'état local
      setPaymentMethods(prev => 
        prev.map(method => 
          method.id === id ? { ...method, is_active: isActive } : method
        )
      );
      
      showSuccess(`Moyen de paiement ${isActive ? 'activé' : 'désactivé'} avec succès`);
    } catch (error: any) {
      console.error('Error toggling payment method:', error);
      showError(error.message || 'Erreur lors de la mise à jour du moyen de paiement');
    }
  };

  const createUserProfile = async (userData: any) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      
      await fetchUsers(); // Recharger la liste
      showSuccess('Utilisateur créé avec succès');
      return data;
    } catch (error: any) {
      console.error('Error creating user profile:', error);
      showError(error.message || 'Erreur lors de la création de l\'utilisateur');
      throw error;
    }
  };

  const toggleUserProfile = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;
      
      // Mettre à jour l'état local
      setUsers(prev => 
        prev.map(user => 
          user.id === id ? { ...user, is_active: isActive } : user
        )
      );
      
      showSuccess(`Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès`);
    } catch (error: any) {
      console.error('Error toggling user profile:', error);
      showError(error.message || 'Erreur lors de la mise à jour de l\'utilisateur');
    }
  };

  const tabs: SettingsOption[] = [
    {
      id: 'profile',
      label: 'Profil',
      icon: <UserIcon className="w-4 h-4" />,
      description: 'Informations personnelles et préférences'
    },
    {
      id: 'security',
      label: 'Sécurité',
      icon: <Shield className="w-4 h-4" />,
      description: 'Mot de passe et authentification'
    },
    {
      id: 'payment-methods',
      label: 'Moyens de paiement',
      icon: <CreditCard className="w-4 h-4" />,
      description: 'Gérer Airtel Money, Orange Money, Wave, etc.'
    },
    {
      id: 'exchange-rates',
      label: 'Taux de change',
      icon: <DollarSign className="w-4 h-4" />,
      description: 'Configurer USD/CDF et USD/CNY'
    },
    {
      id: 'transaction-fees',
      label: 'Frais de transaction',
      icon: <SettingsIcon className="w-4 h-4" />,
      description: 'Définir les frais par type (Transfert/Commande)'
    },
    {
      id: 'users',
      label: 'Utilisateurs',
      icon: <Users className="w-4 h-4" />,
      description: 'Gérer les comptes opérateurs et administrateurs',
      adminOnly: true
    },
    {
      id: 'activity-logs',
      label: 'Journal d\'activité',
      icon: <FileText className="w-4 h-4" />,
      description: 'Consulter les logs des transactions et actions',
      adminOnly: true
    },
    {
      id: 'about',
      label: 'À propos',
      icon: <Info className="w-4 h-4" />,
      description: 'Version et informations sur CoxiPay'
    }
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Profil</h2>
              <p className="text-gray-600">Gérez vos informations personnelles et vos préférences</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Informations personnelles</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Prénom</Label>
                      <Input
                        id="firstName"
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, first_name: e.target.value }))}
                        placeholder="Jean"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Nom</Label>
                      <Input
                        id="lastName"
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, last_name: e.target.value }))}
                        placeholder="Mukendi"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        value={user?.email || ''}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rôle</Label>
                      <Input
                        value={profile?.role || ''}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={updateProfile}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mise à jour...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Enregistrer les modifications
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Sécurité</h2>
              <p className="text-gray-600">Gérez votre mot de passe et les options de sécurité</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Changer le mot de passe</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="••••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="••••••••••"
                    />
                  </div>
                  <Button 
                    onClick={updatePassword}
                    disabled={saving || !passwordForm.newPassword || !passwordForm.confirmPassword}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mise à jour...
                      </>
                    ) : (
                      <>
                        <Shield className="mr-2 h-4 w-4" />
                        Mettre à jour le mot de passe
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'payment-methods':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Moyens de paiement</h2>
              <p className="text-gray-600">Configurez les modes de paiement acceptés dans votre système</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Liste des moyens de paiement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentMethods.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-sm font-medium text-gray-900 mb-2">
                        Aucun moyen de paiement configuré
                      </h3>
                      <p className="text-sm text-gray-500">
                        Commencez par ajouter les moyens de paiement mobile money.
                      </p>
                    </div>
                  ) : (
                    paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{method.name}</div>
                            <div className="text-sm text-gray-500">{method.code}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={method.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {method.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => togglePaymentMethod(method.id, !method.is_active)}
                          >
                            {method.is_active ? 'Désactiver' : 'Activer'}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'exchange-rates':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Taux de change</h2>
              <p className="text-gray-600">Configurez les taux de conversion USD/CDF et USD/CNY</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Configuration des taux</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="usdToCdf">1 USD = (CDF)</Label>
                      <Input
                        id="usdToCdf"
                        type="number"
                        step="0.01"
                        value={exchangeRates.usdToCdf}
                        onChange={(e) => setExchangeRates(prev => ({ ...prev, usdToCdf: e.target.value }))}
                        placeholder="2850"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="usdToCny">1 USD = (CNY)</Label>
                      <Input
                        id="usdToCny"
                        type="number"
                        step="0.01"
                        value={exchangeRates.usdToCny}
                        onChange={(e) => setExchangeRates(prev => ({ ...prev, usdToCny: e.target.value }))}
                        placeholder="7.25"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={updateExchangeRates}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mise à jour...
                      </>
                    ) : (
                      <>
                        <DollarSign className="mr-2 h-4 w-4" />
                        Mettre à jour les taux
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'transaction-fees':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Frais de transaction</h2>
              <p className="text-gray-600">Définissez les frais par type de transaction</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Configuration des frais</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="transfert">Frais de Transfert (%)</Label>
                    <Input
                      id="transfert"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={transactionFees.transfert}
                      onChange={(e) => setTransactionFees(prev => ({ ...prev, transfert: e.target.value }))}
                      placeholder="5.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="commande">Frais de Commande (%)</Label>
                    <Input
                      id="commande"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={transactionFees.commande}
                      onChange={(e) => setTransactionFees(prev => ({ ...prev, commande: e.target.value }))}
                      placeholder="10.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="partenaire">Frais Partenaire (%)</Label>
                    <Input
                      id="partenaire"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={transactionFees.partenaire}
                      onChange={(e) => setTransactionFees(prev => ({ ...prev, partenaire: e.target.value }))}
                      placeholder="3.00"
                    />
                  </div>
                  <Button 
                    onClick={updateTransactionFees}
                    disabled={saving}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Mise à jour...
                      </>
                    ) : (
                      <>
                        <SettingsIcon className="mr-2 h-4 w-4" />
                        Mettre à jour les frais
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'users':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Utilisateurs</h2>
              <p className="text-gray-600">Gérer les comptes opérateurs et administrateurs</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Liste des utilisateurs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-sm font-medium text-gray-900 mb-2">
                        Aucun utilisateur trouvé
                      </h3>
                      <p className="text-sm text-gray-500">
                        Les utilisateurs apparaîtront ici après leur première connexion.
                      </p>
                    </div>
                  ) : (
                    users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{user.full_name}</div>
                            <div className="text-sm text-gray-500">{user.auth_user?.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge className={user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {user.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                          <Badge className="bg-blue-100 text-blue-800">
                            {user.role}
                          </Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleUserProfile(user.id, !user.is_active)}
                          >
                            {user.is_active ? 'Désactiver' : 'Activer'}
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'activity-logs':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Journal d'activité</h2>
              <p className="text-gray-600">Consulter les logs des transactions et actions</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Activité récente</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activityLogs.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <h3 className="text-sm font-medium text-gray-900 mb-2">
                        Aucune activité récente
                      </h3>
                      <p className="text-sm text-gray-500">
                        Les activités apparaîtront ici au fur et à mesure.
                      </p>
                    </div>
                  ) : (
                    activityLogs.map((log) => (
                      <div key={log.id} className="flex items-start space-x-3 p-4 border border-gray-200 rounded-lg">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <FileText className="h-4 w-4 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900">{log.action}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(log.created_at).toLocaleString('fr-FR')}
                          </div>
                          {log.details && (
                            <div className="text-xs text-gray-400 mt-1">
                              {JSON.stringify(log.details)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">À propos</h2>
              <p className="text-gray-600">Informations sur CoxiPay</p>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-20 h-20 bg-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-white text-3xl font-bold">C</span>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">CoxiPay</h3>
                  <p className="text-gray-600 mb-6">Plateforme de transfert USD/CDF/CNY simplifiée</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Version</h4>
                      <p className="text-gray-600">v1.0.0</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Dernière mise à jour</h4>
                      <p className="text-gray-600">15 Décembre 2024</p>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Support</h4>
                      <p className="text-gray-600">support@coxipay.com</p>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200 pt-6">
                    <p className="text-sm text-gray-500">
                      © 2024 CoxiPay. Tous droits réservés.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h2>
              <p className="text-gray-600">
                {tabs.find(tab => tab.id === activeTab)?.description}
              </p>
            </div>
            
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <SettingsIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    Cette section est en cours de développement
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Les fonctionnalités pour cette section seront bientôt disponibles.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );
    }
  };

  // Vérifier si l'utilisateur est admin
  const isAdmin = user?.user_metadata?.role === 'admin' || profile?.role === 'admin';

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Settings Navigation in Header - Dropdown Menu */}
      <div className="flex justify-end mb-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
            >
              <SettingsIcon className="w-4 h-4 mr-2" />
              Paramètres
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            {tabs.map((tab) => {
              // Cacher les options admin si l'utilisateur n'est pas admin
              if (tab.adminOnly && !isAdmin) {
                return null;
              }
              
              return (
                <DropdownMenuItem
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    cursor-pointer
                    ${activeTab === tab.id 
                      ? 'bg-emerald-50 text-emerald-700' 
                      : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <div className="flex items-center space-x-3">
                    {tab.icon}
                    <div>
                      <div className="font-medium">{tab.label}</div>
                      <div className="text-xs text-gray-500">{tab.description}</div>
                    </div>
                  </div>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Content */}
      <main className="flex-1">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
          <div className="space-y-6">
            {renderContent()}
          </div>
        </div>
      </main>
    </Layout>
  );
};

export default Settings;