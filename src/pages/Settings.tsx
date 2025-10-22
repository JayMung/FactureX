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
    phone: ''
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

      // Récupérer tous les utilisateurs auth pour avoir les emails
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      
      // Combiner les données
      const combinedUsers = (userProfiles || []).map(profile => {
        const authUser = (authUsers.users as any[])?.find(user => user.id === profile.user_id);
        return {
          ...profile,
          auth_user: authUser ? { email: authUser.email } : null
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
      phone: ''
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
      phone: user.phone || ''
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

  const handleToggleUserStatus = async (user: UserProfileData) => {
    try {
      // Vérifier si c'est le dernier admin actif
      if (user.role === 'admin' && user.is_active) {
        const adminCount = users.filter(u => u.role === 'admin' && u.is_active).length;
        if (adminCount <= 1) {
          showError('Impossible de désactiver le dernier administrateur actif');
          return;
        }
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (error) throw error;
      
      // Mettre à jour l'état local
      setUsers(prev => 
        prev.map(u => 
          u.id === user.id ? { ...u, is_active: !u.is_active } : u
        )
      );
      
      showSuccess(`Utilisateur ${user.is_active ? 'désactivé' : 'activé'} avec succès`);
    } catch (error: any) {
      console.error('Error toggling user status:', error);
      showError(error.message || 'Erreur lors de la mise à jour du statut');
    }
  };

  const handleSaveUser = async () => {
    setSaving(true);
    try {
      if (!userForm.email || !userForm.first_name || !userForm.last_name) {
        showError('Veuillez remplir tous les champs obligatoires');
        setSaving(false);
        return;
      }

      if (selectedUser) {
        // Modification
        const fullName = `${userForm.first_name} ${userForm.last_name}`.trim();
        const { error } = await supabase
          .from('user_profiles')
          .update({
            full_name: fullName,
            role: userForm.role,
            phone: userForm.phone
          })
          .eq('id', selectedUser.id);

        if (error) throw error;
        
        showSuccess('Utilisateur mis à jour avec succès');
      } else {
        // Création - Créer d'abord l'utilisateur auth
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: userForm.email,
          password: 'TempPassword123!', // Mot de passe temporaire
          email_confirm: true,
          user_metadata: {
            first_name: userForm.first_name,
            last_name: userForm.last_name,
            role: userForm.role
          }
        });

        if (authError) throw authError;

        // Créer le profil utilisateur
        const fullName = `${userForm.first_name} ${userForm.last_name}`.trim();
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: authData.user.id,
            full_name: fullName,
            role: userForm.role,
            phone: userForm.phone,
            is_active: true
          });

        if (profileError) throw profileError;
        
        showSuccess('Utilisateur créé avec succès');
      }
      
      setIsUserFormOpen(false);
      fetchUsers(); // Recharger la liste
    } catch (error: any) {
      console.error('Error saving user:', error);
      showError(error.message || 'Erreur lors de la sauvegarde de l\'utilisateur');
    } finally {
      setSaving(false);
    }
  };

  // Fonctions pour les autres sections (conservées)
  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        showError('Veuillez sélectionner une image valide');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showError('La taille du fichier ne doit pas dépasser 5MB');
        return;
      }

      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${user?.id}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      });

      const urlWithTimestamp = `${publicUrl}?t=${Date.now()}`;
      
      setProfile(prev => prev ? { ...prev, avatar_url: urlWithTimestamp } : null);
      setUser(prev => prev ? {
        ...prev,
        user_metadata: {
          ...prev.user_metadata,
          avatar_url: urlWithTimestamp
        }
      } : null);

      showSuccess('Photo de profil mise à jour avec succès');
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      showError(error.message || 'Erreur lors du téléchargement de la photo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAddPaymentMethod = () => {
    setSelectedPaymentMethod(undefined);
    setIsPaymentMethodFormOpen(true);
  };

  const handleEditPaymentMethod = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setIsPaymentMethodFormOpen(true);
  };

  const handleDeletePaymentMethod = (method: PaymentMethod) => {
    setPaymentMethodToDelete(method);
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
      
      setPaymentMethods(prev => prev.filter(m => m.id !== paymentMethodToDelete.id));
      
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

  const handlePaymentMethodFormSuccess = () => {
    fetchPaymentMethods();
  };

  const updateProfile = async () => {
    setSaving(true);
    try {
      if (!user?.id) throw new Error('Utilisateur non trouvé');
      
      const fullName = `${profileForm.first_name} ${profileForm.last_name}`.trim();
      
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: profileForm.first_name,
          last_name: profileForm.last_name
        })
        .eq('id', user.id);

      if (profileError) throw profileError;
      
      if (userProfile) {
        const { error: userProfileError } = await supabase
          .from('user_profiles')
          .update({
            full_name: fullName
          })
          .eq('user_id', user.id);

        if (userProfileError) throw userProfileError;
      } else {
        const { error: createProfileError } = await supabase
          .from('user_profiles')
          .insert({
            user_id: user.id,
            full_name: fullName,
            role: profile?.role || 'operateur',
            is_active: true
          });

        if (createProfileError) throw createProfileError;
      }
      
      await supabase.auth.updateUser({
        data: { 
          first_name: profileForm.first_name, 
          last_name: profileForm.last_name,
          full_name: fullName,
          avatar_url: profile?.avatar_url
        }
      });

      const updatedProfile = { ...profile, ...profileForm };
      setProfile(updatedProfile);
      
      const updatedUserProfile = { ...userProfile, full_name: fullName };
      setUserProfile(updatedUserProfile);
      
      setUser(prev => prev ? {
        ...prev,
        user_metadata: {
          ...prev.user_metadata,
          first_name: profileForm.first_name,
          last_name: profileForm.last_name,
          full_name: fullName,
          avatar_url: profile?.avatar_url
        }
      } : null);

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
      case 'users':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Utilisateurs</h2>
                <p className="text-gray-600">Gérer les comptes opérateurs et administrateurs</p>
              </div>
              <Button 
                onClick={handleAddUser}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un utilisateur
              </Button>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Liste des utilisateurs ({users.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {usersLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg animate-pulse">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/3"></div>
                        </div>
                        <div className="h-8 bg-gray-200 rounded w-20"></div>
                      </div>
                    ))}
                  </div>
                ) : users.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Aucun utilisateur trouvé
                    </h3>
                    <p className="text-gray-500 mb-6">
                      Commencez par ajouter le premier utilisateur à votre système.
                    </p>
                    <Button onClick={handleAddUser}>
                      <Plus className="mr-2 h-4 w-4" />
                      Ajouter le premier utilisateur
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users.map((userItem) => (
                      <div key={userItem.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                            {userItem.role === 'admin' ? (
                              <Crown className="h-6 w-6 text-red-600" />
                            ) : (
                              <UserCheck className="h-6 w-6 text-blue-600" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h3 className="font-medium text-gray-900">{userItem.full_name}</h3>
                              <Badge className={
                                userItem.role === 'admin' 
                                  ? "bg-red-100 text-red-800" 
                                  : "bg-blue-100 text-blue-800"
                              }>
                                {userItem.role === 'admin' ? (
                                  <><Crown className="w-3 h-3 mr-1" />Admin</>
                                ) : (
                                  <><UserCheck className="w-3 h-3 mr-1" />Opérateur</>
                                )}
                              </Badge>
                              <Badge className={
                                userItem.is_active 
                                  ? "bg-green-100 text-green-800" 
                                  : "bg-gray-100 text-gray-800"
                              }>
                                {userItem.is_active ? (
                                  <><UserCheck className="w-3 h-3 mr-1" />Actif</>
                                ) : (
                                  <><UserX className="w-3 h-3 mr-1" />Inactif</>
                                )}
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Mail className="w-4 h-4" />
                                <span>{userItem.auth_user?.email || 'Email non disponible'}</span>
                              </div>
                              {userItem.phone && (
                                <div className="flex items-center space-x-1">
                                  <Phone className="w-4 h-4" />
                                  <span>{userItem.phone}</span>
                                </div>
                              )}
                              <span>
                                Créé le {new Date(userItem.created_at || '').toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleUserStatus(userItem)}
                            disabled={userItem.role === 'admin' && userItem.is_active && users.filter(u => u.role === 'admin' && u.is_active).length <= 1}
                          >
                            {userItem.is_active ? 'Désactiver' : 'Activer'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(userItem)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeleteUser(userItem)}
                            disabled={userItem.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1}
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
          </div>
        );

      case 'profile':
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Profil</h2>
              <p className="text-gray-600">Gérez vos informations personnelles et vos préférences</p>
            </div>
            
            <Card>
              <CardHeader>
                <CardTitle>Photo de profil</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center space-x-6">
                  <div className="relative">
                    {profile?.avatar_url || user?.user_metadata?.avatar_url ? (
                      <img
                        src={profile?.avatar_url || user?.user_metadata?.avatar_url}
                        alt="Photo de profil"
                        className="w-24 h-24 rounded-full object-cover border-4 border-emerald-100"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-emerald-500 rounded-full flex items-center justify-center">
                        <UserIcon className="w-12 h-12 text-white" />
                      </div>
                    )}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-700 transition-colors"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Photo de profil</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Cliquez sur l'icône pour télécharger une nouvelle photo. 
                      Formats acceptés: JPG, PNG, GIF. Taille maximale: 5MB.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      disabled={uploading}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Téléchargement...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Changer la photo
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
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
                        value={profile?.role || userProfile?.role || ''}
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
                      placeholder="••••••••••••"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="••••••••••••"
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
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Moyens de paiement</h2>
                <p className="text-gray-600">Configurez les modes de paiement acceptés dans votre système</p>
              </div>
              <Button 
                onClick={handleAddPaymentMethod}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="mr-2 h-4 w-4" />
                Ajouter un moyen
              </Button>
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
                      <p className="text-sm text-gray-500 mb-4">
                        Commencez par ajouter les moyens de paiement mobile money.
                      </p>
                      <Button onClick={handleAddPaymentMethod}>
                        <Plus className="mr-2 h-4 w-4" />
                        Ajouter le premier moyen
                      </Button>
                    </div>
                  ) : (
                    paymentMethods.map((method) => (
                      <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{method.name}</div>
                            <div className="text-sm text-gray-500">{method.code}</div>
                            {method.description && (
                              <div className="text-xs text-gray-400 mt-1">{method.description}</div>
                            )}
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPaymentMethod(method)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDeletePaymentMethod(method)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      <main className="flex-1">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-4 lg:py-8">
          <div className="space-y-6">
            {renderContent()}
          </div>
        </div>
      </main>

      {/* Modal pour ajouter/modifier un utilisateur */}
      <Dialog open={isUserFormOpen} onOpenChange={setIsUserFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="userEmail">Email *</Label>
              <Input
                id="userEmail"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="utilisateur@exemple.com"
                disabled={!!selectedUser}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userFirstName">Prénom *</Label>
                <Input
                  id="userFirstName"
                  value={userForm.first_name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Jean"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userLastName">Nom *</Label>
                <Input
                  id="userLastName"
                  value={userForm.last_name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Mukendi"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userRole">Rôle *</Label>
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
            <div className="space-y-2">
              <Label htmlFor="userPhone">Téléphone</Label>
              <Input
                id="userPhone"
                value={userForm.phone}
                onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+243 123 456 789"
              />
            </div>
            <div className="flex space-x-3 pt-4">
              <Button
                onClick={handleSaveUser}
                disabled={saving}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {selectedUser ? 'Modification...' : 'Création...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {selectedUser ? 'Mettre à jour' : 'Créer'}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsUserFormOpen(false)}
                disabled={saving}
              >
                Annuler
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de confirmation de suppression */}
      <ConfirmDialog
        open={userDeleteDialogOpen}
        onOpenChange={setUserDeleteDialogOpen}
        title="Supprimer l'utilisateur"
        description={`Êtes-vous sûr de vouloir supprimer "${userToDelete?.full_name}" ? Cette action est irréversible et supprimera également toutes les données associées à cet utilisateur.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={confirmDeleteUser}
        isConfirming={isUserDeleting}
        type="delete"
      />

      <PaymentMethodForm
        paymentMethod={selectedPaymentMethod}
        isOpen={isPaymentMethodFormOpen}
        onClose={() => setIsPaymentMethodFormOpen(false)}
        onSuccess={handlePaymentMethodFormSuccess}
      />

      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Supprimer le moyen de paiement"
        description={`Êtes-vous sûr de vouloir supprimer "${paymentMethodToDelete?.name}" ? Cette action est irréversible et affectera toutes les transactions utilisant ce moyen de paiement.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={confirmDeletePaymentMethod}
        isConfirming={isDeleting}
        type="delete"
      />
    </Layout>
  );
};

export default Settings;