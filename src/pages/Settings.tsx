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
  Phone
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

interface UserProfileData {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  phone?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  auth_user?: {
    email: string;
  };
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
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [users, setUsers] = useState<UserProfileData[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  // États pour les modales
  const [isPaymentMethodFormOpen, setIsPaymentMethodFormOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<PaymentMethod | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // États pour la gestion des utilisateurs
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfileData | null>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'operateur',
    phone: '',
    password: ''
  });
  const [userDeleteDialogOpen, setUserDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfileData | null>(null);
  const [isUserDeleting, setIsUserDeleting] = useState(false);

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
          
          // Fetch profile data from profiles table
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          // Fetch user profile data from user_profiles table
          const { data: userProfileData } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          setProfile(profileData);
          setUserProfile(userProfileData);
          
          // Pré-remplir le formulaire avec les données disponibles
          if (profileData) {
            setProfileForm({
              first_name: profileData.first_name || '',
              last_name: profileData.last_name || ''
            });
          } else if (userProfileData) {
            // Extraire le nom complet depuis user_profiles
            const fullName = userProfileData.full_name || '';
            const nameParts = fullName.split(' ');
            setProfileForm({
              first_name: nameParts[0] || '',
              last_name: nameParts.slice(1).join(' ') || ''
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

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      // Récupérer tous les user_profiles
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
        showError('Erreur lors du chargement des profils utilisateurs');
        return;
      }

      // Récupérer les emails depuis la table profiles
      const userIds = (userProfiles || []).map(up => up.user_id).filter(Boolean);
      
      if (userIds.length === 0) {
        console.log('No users found');
        setUsers([]);
        setUsersLoading(false);
        return;
      }

      const { data: profiles, error: profilesEmailError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .in('id', userIds);

      if (profilesEmailError) {
        console.error('Error fetching profiles for emails:', profilesEmailError);
      }

      // Créer une map des emails par user_id
      const emailMap = new Map();
      (profiles || []).forEach(profile => {
        if (profile.id && profile.email) {
          emailMap.set(profile.id, profile.email);
        }
      });

      // Combiner les données et formater pour l'affichage
      const combinedUsers = (userProfiles || []).map(profile => {
        const email = emailMap.get(profile.user_id);
        
        // Si le nom complet est vide, essayer de le reconstruire depuis profiles
        let fullName = profile.full_name || '';
        if (!fullName && email) {
          const correspondingProfile = profiles?.find(p => p.id === profile.user_id);
          if (correspondingProfile) {
            fullName = `${correspondingProfile.first_name || ''} ${correspondingProfile.last_name || ''}`.trim();
          }
        }

        return {
          ...profile,
          full_name: fullName || 'Nom non spécifié',
          auth_user: { 
            email: email || 'Email non disponible'
          }
        };
      });

      console.log('Combined users:', combinedUsers);
      setUsers(combinedUsers);
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

  // Fonctions pour la gestion des utilisateurs
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

  const handleEditUser = (user: UserProfileData) => {
    setSelectedUser(user);
    setUserForm({
      email: user.auth_user?.email || '',
      first_name: user.full_name?.split(' ')[0] || '',
      last_name: user.full_name?.split(' ').slice(1).join(' ') || '',
      role: user.role,
      phone: user.phone || '',
      password: ''
    });
    setIsUserFormOpen(true);
  };

  const handleDeleteUser = (user: UserProfileData) => {
    setUserToDelete(user);
    setUserDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsUserDeleting(true);
    try {
      // Vérifier si c'est le dernier admin
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

      // Supprimer le profil utilisateur
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (error) throw error;
      
      // Mettre à jour l'état local
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
      if (selectedUser) {
        // Mise à jour
        const { error } = await supabase
          .from('user_profiles')
          .update({
            full_name: `${userForm.first_name} ${userForm.last_name}`.trim(),
            role: userForm.role,
            phone: userForm.phone
          })
          .eq('id', selectedUser.id);

        if (error) throw error;
        showSuccess('Utilisateur mis à jour avec succès');
      } else {
        // Création
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: userForm.email,
          password: userForm.password,
          options: {
            data: {
              first_name: userForm.first_name,
              last_name: userForm.last_name,
              role: userForm.role
            }
          }
        });

        if (authError) throw authError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('user_profiles')
            .insert([{
              user_id: authData.user.id,
              full_name: `${userForm.first_name} ${userForm.last_name}`.trim(),
              role: userForm.role,
              phone: userForm.phone,
              is_active: true
            }]);

          if (profileError) throw profileError;
        }
        showSuccess('Utilisateur créé avec succès');
      }

      setIsUserFormOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      showError(error.message || 'Erreur lors de la sauvegarde de l\'utilisateur');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleUserStatus = async (user: UserProfileData) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (error) throw error;

      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, is_active: !u.is_active } : u
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
          last_name: profileForm.last_name
        })
        .eq('id', user?.id);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, first_name: profileForm.first_name, last_name: profileForm.last_name } : null);
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

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${user?.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      showSuccess('Photo de profil mise à jour avec succès');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      showError(error.message || 'Erreur lors du téléchargement de la photo');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePaymentMethod = async (paymentMethod: PaymentMethod) => {
    setPaymentMethodToDelete(paymentMethod);
    setDeleteDialogOpen(true);
  };

  const confirmDeletePaymentMethod = async () => {
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
  };

  const handleTogglePaymentMethod = async (paymentMethod: PaymentMethod) => {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: !paymentMethod.is_active })
        .eq('id', paymentMethod.id);

      if (error) throw error;

      setPaymentMethods(prev => prev.map(pm => 
        pm.id === paymentMethod.id ? { ...pm, is_active: !pm.is_active } : pm
      ));

      showSuccess(`Moyen de paiement ${paymentMethod.is_active ? 'désactivé' : 'activé'} avec succès`);
    } catch (error: any) {
      console.error('Error toggling payment method:', error);
      showError(error.message || 'Erreur lors de la mise à jour du statut');
    }
  };

  const settingsOptions: SettingsOption[] = [
    {
      id: 'profile',
      label: 'Profil',
      icon: <UserIcon className="h-5 w-5" />,
      description: 'Informations personnelles et photo de profil'
    },
    {
      id: 'users',
      label: 'Utilisateurs',
      icon: <Users className="h-5 w-5" />,
      description: 'Gestion des comptes utilisateurs',
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
      icon: <FileText className="h-5 w-5" />,
      description: 'Historique des actions dans l\'application',
      adminOnly: true
    }
  ];

  const filteredOptions = settingsOptions.filter(option => 
    !option.adminOnly || userProfile?.role === 'admin'
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-2">
                  {filteredOptions.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setActiveTab(option.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                        activeTab === option.id
                          ? 'bg-emerald-100 text-emerald-700'
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
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserIcon className="mr-2 h-5 w-5" />
                    Profil
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center overflow-hidden">
                        {profile?.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <UserIcon className="h-10 w-10 text-emerald-600" />
                        )}
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute bottom-0 right-0 p-1 bg-emerald-600 text-white rounded-full hover:bg-emerald-700 disabled:opacity-50"
                      >
                        {uploading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Camera className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    <div>
                      <h3 className="font-medium">{user?.email}</h3>
                      <p className="text-sm text-gray-500">
                        {userProfile?.role === 'admin' ? 'Administrateur' : 'Opérateur'}
                      </p>
                    </div>
                  </div>

                  {/* Profile Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="first_name">Prénom</Label>
                      <Input
                        id="first_name"
                        value={profileForm.first_name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, first_name: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="last_name">Nom</Label>
                      <Input
                        id="last_name"
                        value={profileForm.last_name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, last_name: e.target.value }))}
                      />
                    </div>
                  </div>

                  <Button onClick={handleSaveProfile} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sauvegarde...
                      </>
                    ) : (
                      'Sauvegarder les modifications'
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Users Tab */}
            {activeTab === 'users' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <Users className="mr-2 h-5 w-5" />
                      Utilisateurs
                    </CardTitle>
                    <Button onClick={handleAddUser}>
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter un utilisateur
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {users.map((user) => (
                        <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                              <UserIcon className="h-5 w-5 text-emerald-600" />
                            </div>
                            <div>
                              <p className="font-medium">{user.full_name}</p>
                              <p className="text-sm text-gray-500">{user.auth_user?.email}</p>
                              <div className="flex items-center space-x-2 mt-1">
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
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
                                <Badge variant={user.is_active ? 'default' : 'secondary'}>
                                  {user.is_active ? 'Actif' : 'Inactif'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleUserStatus(user)}
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
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600"
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

            {/* Payment Methods Tab */}
            {activeTab === 'payment-methods' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <CreditCard className="mr-2 h-5 w-5" />
                      Moyens de paiement
                    </CardTitle>
                    <Button onClick={() => {
                      setSelectedPaymentMethod(undefined);
                      setIsPaymentMethodFormOpen(true);
                    }}>
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter un moyen
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{method.name}</p>
                            <p className="text-sm text-gray-500">{method.description}</p>
                            <Badge variant={method.is_active ? 'default' : 'secondary'}>
                              {method.is_active ? 'Actif' : 'Inactif'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePaymentMethod(method)}
                          >
                            {method.is_active ? 'Désactiver' : 'Activer'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPaymentMethod(method);
                              setIsPaymentMethodFormOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600"
                            onClick={() => handleDeletePaymentMethod(method)}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  <CardTitle className="flex items-center">
                    <FileText className="mr-2 h-5 w-5" />
                    Logs d'activité
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {activityLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                            <FileText className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium">{log.action}</p>
                            <p className="text-sm text-gray-500">
                              {log.cible} - {new Date(log.created_at).toLocaleString('fr-FR')}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
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
              <Button onClick={handleSaveUser} disabled={saving}>
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
        onConfirm={confirmDeletePaymentMethod}
        isConfirming={isDeleting}
        type="delete"
      />

      <ConfirmDialog
        open={userDeleteDialogOpen}
        onOpenChange={setUserDeleteDialogOpen}
        title="Supprimer l'utilisateur"
        description={`Êtes-vous sûr de vouloir supprimer "${userToDelete?.full_name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={confirmDeleteUser}
        isConfirming={isUserDeleting}
        type="delete"
      />
    </Layout>
  );
};

export default Settings;