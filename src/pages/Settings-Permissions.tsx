"use client";

import { useState, useEffect, useRef } from 'react';
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
  Loader2,
  Camera,
  Upload,
  Plus,
  Edit,
  Trash2,
  Crown,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Key,
  Building2,
  Lock,
  Save,
  Receipt,
  History,
  Package
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '@/components/auth/AuthProvider';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { showSuccess, showError } from '@/utils/toast';
import PaymentMethodForm from '../components/forms/PaymentMethodForm';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import PermissionsManager from '../components/permissions/PermissionsManager';
import { SettingsFacture } from './Settings-Facture';
import { CompanySettings } from '../components/settings/CompanySettings';
import { SettingsColis } from '../components/settings/SettingsColis';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PaymentMethod } from '@/types';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}


interface SettingsOption {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  adminOnly?: boolean;
}

const SettingsWithPermissions = () => {
  usePageSetup({
    title: 'Paramètres',
    subtitle: 'Configurez les préférences et permissions de votre application'
  });

  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Hook d'authentification
  const { user: authUser } = useAuth();
  
  // Vérifier si l'utilisateur est admin
  const isAdmin = authUser?.app_metadata?.role === 'admin';

  // Hook des permissions
  const { checkPermission, canAccessModule, getAccessibleModules } = usePermissions();

  // États pour les formulaires
  const [profileForm, setProfileForm] = useState({
    first_name: '',
    last_name: '',
    role: 'operateur',
    phone: '',
    avatar_url: ''
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

  // États pour les modales
  const [isPaymentMethodFormOpen, setIsPaymentMethodFormOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<PaymentMethod | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // États pour la gestion des utilisateurs
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'operateur',
    phone: '',
    password: ''
  });
  const [userDeleteDialogOpen, setUserDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isUserDeleting, setIsUserDeleting] = useState(false);

  // États pour la gestion des permissions
  const [permissionsManagerOpen, setPermissionsManagerOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUser({
            id: user.id,
            email: user.email || '',
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            role: user.user_metadata?.role || 'operateur',
            phone: user.user_metadata?.phone || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            is_active: true
          });
          
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          setProfile(profileData);
          
          if (profileData) {
            setProfileForm({
              first_name: profileData.first_name || '',
              last_name: profileData.last_name || '',
              role: profileData.role || 'operateur',
              phone: profileData.phone || '',
              avatar_url: profileData.avatar_url || ''
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
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'payment-methods') {
      fetchPaymentMethods();
    } else if (activeTab === 'activity-logs') {
      fetchActivityLogs();
    } else if (activeTab === 'exchange-rates' || activeTab === 'transaction-fees') {
      fetchSettings();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        showError('Erreur lors du chargement des utilisateurs');
        return;
      }

      setUsers(users || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      showError(error.message || 'Erreur lors du chargement des utilisateurs');
    } finally {
      setUsersLoading(false);
    }
  };

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

  const fetchActivityLogs = async () => {
    try {
      const { data } = await supabase
        .from('activity_logs')
        .select('*')
        .order('date', { ascending: false })
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
        const rates = data.filter(s => s.categorie === 'taux_change');
        const usdToCdf = rates.find(r => r.cle === 'usdToCdf')?.valeur || '';
        const usdToCny = rates.find(r => r.cle === 'usdToCny')?.valeur || '';
        setExchangeRates({ usdToCdf, usdToCny });

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

  // Gestionnaires pour les utilisateurs
  const handleAddUser = () => {
    setSelectedUser(null);
    setUserForm({
      email: '',
      first_name: '',
      last_name: '',
      role: 'operateur',
      phone: '',
      password: ''
    });
    setIsUserFormOpen(true);
  };

  const handleEditUser = (user: UserProfile) => {
    setSelectedUser(user);
    setUserForm({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      phone: user.phone || '',
      password: ''
    });
    setIsUserFormOpen(true);
  };

  const handleDeleteUser = (user: UserProfile) => {
    setUserToDelete(user);
    setUserDeleteDialogOpen(true);
  };

  const handleManagePermissions = (user: UserProfile) => {
    setSelectedUserForPermissions(user);
    setPermissionsManagerOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsUserDeleting(true);
    try {
      if (userToDelete.role === 'admin') {
        const adminCount = users.filter(u => u.role === 'admin' && u.is_active).length;
        if (adminCount <= 1) {
          showError('Impossible de supprimer le dernier administrateur actif');
          setUserDeleteDialogOpen(false);
          setUserToDelete(null);
          setIsUserDeleting(false);
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;
      
      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      
      setUserDeleteDialogOpen(false);
      setUserToDelete(null);
      showSuccess('Utilisateur supprimé avec succès');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      showError(error.message || 'Erreur lors de la suppression de l\'utilisateur');
    } finally {
      setIsUserDeleting(false);
    }
  };

  const handleSaveUser = async () => {
    setSaving(true);
    try {
      if (!userForm.email || (!userForm.password && !selectedUser)) {
        throw new Error('L\'email et le mot de passe sont requis');
      }

      if (selectedUser) {
        const { error } = await supabase
          .from('profiles')
          .update({
            first_name: userForm.first_name,
            last_name: userForm.last_name,
            role: userForm.role,
            phone: userForm.phone
          })
          .eq('id', selectedUser.id);

        if (error) throw error;
        showSuccess('Utilisateur mis à jour avec succès');
        await fetchUsers();
      } else {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userForm.email,
          password: userForm.password,
          options: {
            data: {
              first_name: userForm.first_name,
              last_name: userForm.last_name,
              role: userForm.role,
              phone: userForm.phone
            }
          }
        });

        if (authError) throw new Error(`Erreur lors de la création de l'utilisateur: ${authError.message}`);
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', userForm.email)
          .single();
        
        if (profile) {
          showSuccess('Utilisateur créé avec succès');
          await fetchUsers();
        } else {
          const { data: manualProfile, error: manualError } = await supabase
            .from('profiles')
            .insert([{
              id: authData.user?.id,
              email: userForm.email,
              first_name: userForm.first_name,
              last_name: userForm.last_name,
              role: userForm.role,
              phone: userForm.phone,
              is_active: true
            }])
            .select()
            .single();
          
          if (manualError) {
            showError('Utilisateur créé mais erreur lors de la création du profil');
          } else {
            showSuccess('Utilisateur créé avec succès');
            await fetchUsers();
          }
        }
        
        setIsUserFormOpen(false);
        return;
      }

      setIsUserFormOpen(false);
    } catch (error: any) {
      console.error('Error saving user:', error);
      showError(error.message || 'Erreur lors de la sauvegarde de l\'utilisateur');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserStatus = async (user: UserProfile) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, is_active: !user.is_active } : u
      ));

      showSuccess(`Utilisateur ${user.is_active ? 'désactivé' : 'activé'} avec succès`);
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      showError(error.message || 'Erreur lors de la mise à jour du statut');
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profileForm.first_name,
          last_name: profileForm.last_name,
          role: profileForm.role,
          phone: profileForm.phone
        })
        .eq('id', user?.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...profileForm } : null);
      showSuccess('Profil mis à jour avec succès');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      showError(error.message || 'Erreur lors de la mise à jour du profil');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (category: string, settings: Record<string, string>) => {
    setSaving(true);
    try {
      const updates = Object.entries(settings).map(([cle, valeur]) => ({
        categorie: category,
        cle,
        valeur
      }));

      const { error } = await supabase
        .from('settings')
        .upsert(updates, { onConflict: 'categorie,cle' });

      if (error) throw error;
      showSuccess('Paramètres sauvegardés avec succès');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      showError(error.message || 'Erreur lors de la sauvegarde des paramètres');
    } finally {
      setSaving(false);
    }
  };

  // Options de navigation filtrées selon les permissions
  const settingsOptions: SettingsOption[] = [
    {
      id: 'profile',
      label: 'Profil',
      icon: <UserIcon className="h-5 w-5" />,
      description: 'Informations personnelles et photo de profil'
    },
    {
      id: 'company',
      label: 'Entreprise',
      icon: <Building2 className="h-5 w-5" />,
      description: 'Informations entreprise et logo',
      adminOnly: false
    },
    {
      id: 'users',
      label: 'Utilisateurs',
      icon: <Users className="h-5 w-5" />,
      description: 'Gestion des comptes utilisateurs et permissions',
      adminOnly: true
    },
    {
      id: 'payment-methods',
      label: 'Moyens de paiement',
      icon: <CreditCard className="h-5 w-5" />,
      description: 'Configuration des modes de paiement',
      adminOnly: true
    },
    {
      id: 'factures',
      label: 'Factures',
      icon: <Receipt className="h-5 w-5" />,
      description: 'Frais de livraison et catégories produits',
      adminOnly: false
    },
    {
      id: 'colis',
      label: 'Colis',
      icon: <Package className="h-5 w-5" />,
      description: 'Fournisseurs et tarifs pour colis aériens/maritimes',
      adminOnly: false
    },
    {
      id: 'exchange-rates',
      label: 'Taux de change',
      icon: <DollarSign className="h-5 w-5" />,
      description: 'Configuration des taux USD/CDF et USD/CNY',
      adminOnly: true
    },
    {
      id: 'transaction-fees',
      label: 'Frais de transaction',
      icon: <SettingsIcon className="h-5 w-5" />,
      description: 'Configuration des frais par type de transaction',
      adminOnly: true
    },
    {
      id: 'activity-logs',
      label: 'Logs d\'activité',
      icon: <History className="h-5 w-5" />,
      description: 'Historique des actions dans l\'application',
      adminOnly: true
    }
  ];

  // Mapper les IDs des sections aux modules de permissions
  const sectionToModuleMap: { [key: string]: string } = {
    'profile': 'profile',
    'company': 'settings',
    'users': 'users',
    'payment-methods': 'payment_methods',
    'exchange-rates': 'exchange_rates',
    'transaction-fees': 'transaction_fees',
    'activity-logs': 'activity_logs',
    'factures': 'factures',
    'colis': 'colis'
  };

  const filteredOptions = settingsOptions.filter(option => {
    const moduleId = sectionToModuleMap[option.id];
    return moduleId ? canAccessModule(moduleId as any) : false;
  });

  return (
    <Layout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1 lg:sticky lg:top-4 lg:self-start lg:max-h-screen lg:overflow-visible">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {filteredOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setActiveTab(option.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === option.id
                          ? 'bg-green-100 text-green-600'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {option.icon}
                      <div>
                        <p className="font-medium">{option.label}</p>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content */}
          <div className="lg:col-span-3">
            {/* Users Tab */}
            {activeTab === 'users' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Users className="mr-2 h-5 w-5" />
                      Utilisateurs ({users.length})
                    </CardTitle>
                    <Button onClick={handleAddUser} className="bg-green-500 hover:bg-green-600">
                      <Plus className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Ajouter un utilisateur</span>
                      <span className="sm:hidden">Ajouter</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin text-green-500" />
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucun utilisateur trouvé</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {users.map((user) => (
                        <div key={user.id} className="card-base transition-shadow-hover flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 gap-4">
                          <div className="flex items-center space-x-4">
                            <div className="p-2.5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                              <UserIcon className="h-5 w-5 text-white" />
                            </div>
                            <div>
                              <p className="font-medium">{user.first_name} {user.last_name}</p>
                              <p className="text-sm text-gray-500">{user.email}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge 
                                  variant={user.role === 'admin' ? 'default' : 'secondary'}
                                  className={user.role === 'admin' ? 'bg-green-500 hover:bg-green-600' : ''}
                                >
                                  {user.role === 'admin' ? (
                                    <>
                                      <Crown className="mr-1 h-3 w-3" />
                                      Admin
                                    </>
                                  ) : (
                                    <>
                                      <UserCheck className="mr-1 h-3 w-3" />
                                      Opérateur
                                    </>
                                  )}
                                </Badge>
                                <Badge 
                                  variant={user.is_active ? 'default' : 'secondary'}
                                  className={user.is_active ? 'bg-green-500 hover:bg-green-600' : ''}
                                >
                                  {user.is_active ? 'Actif' : 'Inactif'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleManagePermissions(user)}
                              className="hover:bg-green-50 hover:text-green-600"
                              title="Gérer les permissions"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleUserStatus(user)}
                              className="hover:bg-green-50 hover:text-green-600"
                            >
                              {user.is_active ? (
                                <UserX className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                              className="hover:bg-green-50 hover:text-green-600"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteUser(user)}
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
            )}

            {/* Company Tab */}
            {activeTab === 'company' && <CompanySettings />}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                {/* Photo de profil */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <UserIcon className="mr-2 h-5 w-5" />
                      Photo de profil
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center space-x-6">
                      <div className="relative">
                        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt="Avatar"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <UserIcon className="h-12 w-12 text-green-500" />
                          )}
                        </div>
                        <button
                          className="absolute bottom-0 right-0 bg-green-500 hover:bg-green-600 text-white rounded-full p-2 shadow-lg transition-colors"
                          title="Changer la photo"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{profileForm.first_name} {profileForm.last_name}</h3>
                        <p className="text-sm text-gray-600 mt-1">
                          {profile?.role === 'admin' ? '👑 Administrateur' : '👤 Opérateur'}
                        </p>
                        <p className="text-xs text-gray-500 mt-2">
                          Membre depuis {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' }) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Informations personnelles */}
                <Card>
                  <CardHeader>
                    <CardTitle>Informations personnelles</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label htmlFor="email">Adresse email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user?.email || ''}
                        disabled
                        className="bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">L'email ne peut pas être modifié</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="first_name">Prénom</Label>
                        <Input
                          id="first_name"
                          value={profileForm.first_name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, first_name: e.target.value }))}
                          placeholder="Votre prénom"
                        />
                      </div>
                      <div>
                        <Label htmlFor="last_name">Nom</Label>
                        <Input
                          id="last_name"
                          value={profileForm.last_name}
                          onChange={(e) => setProfileForm(prev => ({ ...prev, last_name: e.target.value }))}
                          placeholder="Votre nom"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="phone">Numéro de téléphone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={profileForm.phone || ''}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+243 XXX XXX XXX"
                      />
                    </div>

                    <Button onClick={handleSaveProfile} disabled={saving} className="bg-green-500 hover:bg-green-600">
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sauvegarde...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Sauvegarder les modifications
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                {/* Sécurité et mot de passe */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Lock className="mr-2 h-5 w-5" />
                      Sécurité et mot de passe
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <Shield className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-blue-900">Modifier votre mot de passe</h4>
                          <p className="text-sm text-blue-700 mt-1">
                            Pour des raisons de sécurité, changez régulièrement votre mot de passe.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="current_password">Mot de passe actuel</Label>
                      <Input
                        id="current_password"
                        type="password"
                        placeholder="Entrez votre mot de passe actuel"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="new_password">Nouveau mot de passe</Label>
                        <Input
                          id="new_password"
                          type="password"
                          placeholder="Minimum 8 caractères"
                        />
                      </div>
                      <div>
                        <Label htmlFor="confirm_password">Confirmer le mot de passe</Label>
                        <Input
                          id="confirm_password"
                          type="password"
                          placeholder="Confirmez le nouveau mot de passe"
                        />
                      </div>
                    </div>

                    <Button variant="outline" className="border-green-500 text-green-600 hover:bg-green-50">
                      <Lock className="mr-2 h-4 w-4" />
                      Changer le mot de passe
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Payment Methods Tab */}
            {activeTab === 'payment-methods' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <CreditCard className="mr-2 h-5 w-5" />
                      Moyens de paiement
                    </CardTitle>
                    <Button 
                      onClick={() => {
                        setSelectedPaymentMethod(undefined);
                        setIsPaymentMethodFormOpen(true);
                      }}
                      className="bg-green-500 hover:bg-green-600"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter un moyen
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg gap-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-green-500" />
                          </div>
                          <div>
                            <p className="font-medium">{method.name}</p>
                            <p className="text-sm text-gray-500">{method.description}</p>
                            <Badge 
                              variant={method.is_active ? 'default' : 'secondary'}
                              className={method.is_active ? 'bg-green-500 hover:bg-green-600' : ''}
                            >
                              {method.is_active ? 'Actif' : 'Inactif'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPaymentMethod(method);
                              setIsPaymentMethodFormOpen(true);
                            }}
                            className="hover:bg-green-50 hover:text-green-600"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setPaymentMethodToDelete(method);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Exchange Rates Tab */}
            {activeTab === 'exchange-rates' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="mr-2 h-5 w-5" />
                    Taux de change
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="usdToCdf">USD vers CDF</Label>
                      <Input
                        id="usdToCdf"
                        type="number"
                        value={exchangeRates.usdToCdf}
                        onChange={(e) => setExchangeRates(prev => ({ ...prev, usdToCdf: e.target.value }))}
                        placeholder="2850"
                      />
                    </div>
                    <div>
                      <Label htmlFor="usdToCny">USD vers CNY</Label>
                      <Input
                        id="usdToCny"
                        type="number"
                        value={exchangeRates.usdToCny}
                        onChange={(e) => setExchangeRates(prev => ({ ...prev, usdToCny: e.target.value }))}
                        placeholder="7.25"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleSaveSettings('taux_change', exchangeRates)}
                    disabled={saving}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      'Sauvegarder les taux'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Transaction Fees Tab */}
            {activeTab === 'transaction-fees' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <SettingsIcon className="mr-2 h-5 w-5" />
                    Frais de transaction
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="transfert">Transfert (%)</Label>
                      <Input
                        id="transfert"
                        type="number"
                        value={transactionFees.transfert}
                        onChange={(e) => setTransactionFees(prev => ({ ...prev, transfert: e.target.value }))}
                        placeholder="5"
                      />
                    </div>
                    <div>
                      <Label htmlFor="commande">Commande (%)</Label>
                      <Input
                        id="commande"
                        type="number"
                        value={transactionFees.commande}
                        onChange={(e) => setTransactionFees(prev => ({ ...prev, commande: e.target.value }))}
                        placeholder="10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="partenaire">Partenaire (%)</Label>
                      <Input
                        id="partenaire"
                        type="number"
                        value={transactionFees.partenaire}
                        onChange={(e) => setTransactionFees(prev => ({ ...prev, partenaire: e.target.value }))}
                        placeholder="3"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={() => handleSaveSettings('frais', transactionFees)}
                    disabled={saving}
                    className="bg-green-500 hover:bg-green-600"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      'Sauvegarder les frais'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Activity Logs Tab */}
            {activeTab === 'activity-logs' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <History className="mr-2 h-5 w-5" />
                      Logs d'activité
                    </CardTitle>
                    {isAdmin && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/security-dashboard')}
                        className="flex items-center gap-2"
                      >
                        <Shield className="h-4 w-4" />
                        Dashboard de sécurité
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {activityLogs.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucune activité enregistrée</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Action</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Cible</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Utilisateur</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Date</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Détails</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activityLogs.map((log) => (
                            <tr key={log.id} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4">
                                <Badge variant="outline" className="font-medium">
                                  {log.action}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm">{log.cible || '-'}</td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {log.user_email || 'Système'}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {log.created_at ? new Date(log.created_at).toLocaleString('fr-FR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                }) : '-'}
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-500">
                                {log.details && typeof log.details === 'object' ? (
                                  <span>
                                    {log.details.facture_number ? `Facture ${log.details.facture_number}` : 
                                     log.details.client_name ? `Client: ${log.details.client_name}` :
                                     log.details.montant ? `Montant: ${log.details.montant}` :
                                     log.details.converted_from ? `Converti depuis ${log.details.converted_from}` :
                                     '-'}
                                  </span>
                                ) : log.details ? log.details : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Factures Settings Tab */}
            {activeTab === 'factures' && <SettingsFacture />}

            {/* Colis Settings Tab */}
            {activeTab === 'colis' && <SettingsColis />}

          </div>
        </div>
      </div>

      {/* User Form Modal */}
      <Dialog open={isUserFormOpen} onOpenChange={setIsUserFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                disabled={!!selectedUser}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  value={userForm.first_name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  value={userForm.last_name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="role">Rôle</Label>
              <Select
                value={userForm.role}
                onValueChange={(value) => setUserForm(prev => ({ ...prev, role: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operateur">Opérateur</SelectItem>
                  <SelectItem value="admin">Administrateur</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={userForm.phone}
                onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            {!selectedUser && (
              <div>
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>
            )}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                onClick={() => setIsUserFormOpen(false)}
                disabled={saving}
              >
                Annuler
              </Button>
              <Button onClick={handleSaveUser} disabled={saving} className="bg-green-500 hover:bg-green-600">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sauvegarde...
                  </>
                ) : (
                  'Sauvegarder'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Permissions Manager Modal */}
      {selectedUserForPermissions && (
        <PermissionsManager
          user={selectedUserForPermissions}
          isOpen={permissionsManagerOpen}
          onClose={() => {
            setPermissionsManagerOpen(false);
            setSelectedUserForPermissions(null);
          }}
          onSuccess={() => {
            fetchUsers();
            setPermissionsManagerOpen(false);
            setSelectedUserForPermissions(null);
          }}
        />
      )}

      {/* Payment Method Form Modal */}
      <PaymentMethodForm
        paymentMethod={selectedPaymentMethod}
        isOpen={isPaymentMethodFormOpen}
        onClose={() => setIsPaymentMethodFormOpen(false)}
        onSuccess={fetchPaymentMethods}
      />

      {/* Delete Confirmation Dialogs */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer le moyen de paiement"
        description={`Êtes-vous sûr de vouloir supprimer "${paymentMethodToDelete?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={async () => {
          if (!paymentMethodToDelete) return;
          
          setIsDeleting(true);
          try {
            const { error } = await supabase
              .from('payment_methods')
              .delete()
              .eq('id', paymentMethodToDelete.id);

            if (error) throw error;
            
            setPaymentMethods(prev => prev.filter(pm => pm.id !== paymentMethodToDelete.id));
            setDeleteDialogOpen(false);
            setPaymentMethodToDelete(null);
            showSuccess('Moyen de paiement supprimé avec succès');
          } catch (error: any) {
            console.error('Error deleting payment method:', error);
            showError(error.message || 'Erreur lors de la suppression du moyen de paiement');
          } finally {
            setIsDeleting(false);
          }
        }}
        isConfirming={isDeleting}
        type="delete"
      />

      <ConfirmDialog
        open={userDeleteDialogOpen}
        onOpenChange={setUserDeleteDialogOpen}
        title="Supprimer l'utilisateur"
        description={`Êtes-vous sûr de vouloir supprimer "${userToDelete?.first_name} ${userToDelete?.last_name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={confirmDeleteUser}
        isConfirming={isUserDeleting}
        type="delete"
      />
    </Layout>
  );
};

export default SettingsWithPermissions;