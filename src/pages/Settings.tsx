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
  Mail,
  Calendar,
  UserPlus,
  UserX,
  Crown,
  ShieldCheck
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { showSuccess, showError } from '@/utils/toast';
import PaymentMethodForm from '../components/forms/PaymentMethodForm';
import ConfirmDialog from '@/components/ui/confirm-dialog';
import { Skeleton } from '@/components/ui/skeleton';

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
}

interface ExtendedUser {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  last_sign_in_at?: string;
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
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [users, setUsers] = useState<ExtendedUser[]>([]);
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
  const [selectedUser, setSelectedUser] = useState<ExtendedUser | null>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    first_name: '',
    last_name: '',
    role: 'operateur',
    phone: ''
  });
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<ExtendedUser | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

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

  // Amélioration de la fonction fetchUsers
  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      // Récupérer tous les profils utilisateurs
      const { data: userProfiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Error fetching user profiles:', profilesError);
        showError('Erreur lors du chargement des profils utilisateurs');
        return;
      }

      // Récupérer tous les utilisateurs auth
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();

      if (authError) {
        console.error('Error fetching auth users:', authError);
        // Continuer avec les données disponibles
      }

      // Combiner les données
      const extendedUsers: ExtendedUser[] = [];
      
      if (userProfiles) {
        for (const profile of userProfiles) {
          const authUser = authUsers?.users.find((u: any) => u.id === profile.user_id);
          
          if (authUser) {
            extendedUsers.push({
              id: profile.id,
              user_id: profile.user_id,
              full_name: profile.full_name,
              email: authUser.email || '',
              role: profile.role,
              phone: profile.phone,
              is_active: profile.is_active,
              created_at: profile.created_at,
              updated_at: profile.updated_at,
              last_sign_in_at: authUser.last_sign_in_at,
              avatar_url: authUser.user_metadata?.avatar_url || profile.avatar_url
            });
          }
        }
      }

      setUsers(extendedUsers);
    } catch (error: any) {
      console.error('Error in fetchUsers:', error);
      showError('Erreur lors du chargement des utilisateurs');
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

  const handleEditUser = (user: ExtendedUser) => {
    setSelectedUser(user);
    const nameParts = user.full_name.split(' ');
    setUserForm({
      email: user.email,
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      role: user.role,
      phone: user.phone || ''
    });
    setIsUserFormOpen(true);
  };

  const handleDeleteUser = (user: ExtendedUser) => {
    setUserToDelete(user);
    setDeleteUserDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete) return;
    
    setIsDeletingUser(true);
    try {
      // Vérifier que ce n'est pas le dernier admin
      if (userToDelete.role === 'admin') {
        const adminCount = users.filter(u => u.role === 'admin' && u.is_active).length;
        if (adminCount <= 1) {
          showError('Impossible de supprimer le dernier administrateur');
          setDeleteUserDialogOpen(false);
          setUserToDelete(null);
          setIsDeletingUser(false);
          return;
        }
      }

      // Supprimer le profil utilisateur
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userToDelete.id);

      if (profileError) throw profileError;

      // Supprimer l'utilisateur auth
      const { error: authError } = await supabase.auth.admin.deleteUser(userToDelete.user_id);
      
      if (authError) {
        console.warn('Could not delete auth user:', authError);
      }

      setUsers(prev => prev.filter(u => u.id !== userToDelete.id));
      setDeleteUserDialogOpen(false);
      setUserToDelete(null);
      showSuccess('Utilisateur supprimé avec succès');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      showError(error.message || 'Erreur lors de la suppression de l\'utilisateur');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const handleSaveUser = async () => {
    setSaving(true);
    try {
      const fullName = `${userForm.first_name} ${userForm.last_name}`.trim();
      
      if (selectedUser) {
        // Modification d'un utilisateur existant
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            full_name: fullName,
            role: userForm.role,
            phone: userForm.phone
          })
          .eq('id', selectedUser.id);

        if (updateError) throw updateError;

        showSuccess('Utilisateur mis à jour avec succès');
      } else {
        // Création d'un nouvel utilisateur
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: userForm.email,
          email_confirm: true,
          user_metadata: {
            first_name: userForm.first_name,
            last_name: userForm.last_name,
            full_name: fullName,
            role: userForm.role
          }
        });

        if (authError) throw authError;

        if (authData.user) {
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
        }

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

  const handleToggleUserStatus = async (user: ExtendedUser) => {
    try {
      // Ne pas désactiver le dernier admin
      if (user.role === 'admin' && user.is_active) {
        const adminCount = users.filter(u => u.role === 'admin' && u.is_active).length;
        if (adminCount <= 1) {
          showError('Impossible de désactiver le dernier administrateur');
          return;
        }
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: !user.is_active })
        .eq('id', user.id);

      if (error) throw error;
      
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

  // Fonction d'upload de la photo de profil
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

  // Fonctions CRUD pour les moyens de paiement
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

  // Fonctions CRUD améliorées
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

  const createUserProfile = async (userData: any) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      
      await fetchUsers();
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

  // Fonction pour obtenir l'icône du rôle
  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="w-4 h-4" />;
      case 'operateur':
        return <ShieldCheck className="w-4 h-4" />;
      default:
        return <UserIcon className="w-4 h-4" />;
    }
  };

  // Fonction pour obtenir la couleur du rôle
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'operateur':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Vérifier si l'utilisateur est admin
  const isAdmin = user?.user_metadata?.role === 'admin' || profile?.role === 'admin';

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Gestion des Utilisateurs</h2>
                <p className="text-gray-600">Ajoutez, modifiez et gérez les accès des utilisateurs</p>
              </div>
              <Button 
                onClick={handleAddUser}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <UserPlus className="mr-2 h-4 w-4" />
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
                      <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="h-8 w-20" />
                        <Skeleton className="h-8 w-8" />
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
                      <UserPlus className="mr-2 h-4 w-4" />
                      Ajouter le premier utilisateur
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {users.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-4">
                          {/* Avatar */}
                          <div className="relative">
                            {user.avatar_url ? (
                              <img
                                src={user.avatar_url}
                                alt={user.full_name}
                                className="w-12 h-12 rounded-full object-cover border-2 border-gray-200"
                              />
                            ) : (
                              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                                <UserIcon className="w-6 h-6 text-emerald-600" />
                              </div>
                            )}
                            {!user.is_active && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white"></div>
                            )}
                          </div>
                          
                          {/* Informations utilisateur */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <h3 className="text-lg font-medium text-gray-900 truncate">
                                {user.full_name}
                              </h3>
                              <Badge className={getRoleColor(user.role)}>
                                {getRoleIcon(user.role)}
                                <span className="ml-1">{user.role}</span>
                              </Badge>
                            </div>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Mail className="w-4 h-4" />
                                <span>{user.email}</span>
                              </div>
                              {user.phone && (
                                <div className="flex items-center space-x-1">
                                  <span className="w-4 h-4">📱</span>
                                  <span>{user.phone}</span>
                                </div>
                              )}
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(user.created_at).toLocaleDateString('fr-FR')}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center space-x-2">
                          <Badge className={user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {user.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleUserStatus(user)}
                            disabled={user.role === 'admin' && user.is_active && users.filter(u => u.role === 'admin' && u.is_active).length <= 1}
                          >
                            {user.is_active ? (
                              <>
                                <UserX className="w-4 h-4 mr-1" />
                                Désactiver
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-4 h-4 mr-1" />
                                Activer
                              </>
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDeleteUser(user)}
                            disabled={user.role === 'admin' && users.filter(u => u.role === 'admin').length <= 1}
                          >
                            <Trash2 className="w-4 h-4" />
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

      // ... autres cas (garder le reste du code existant)
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

      {/* Modales */}
      <PaymentMethodForm
        paymentMethod={selectedPaymentMethod}
        isOpen={isPaymentMethodFormOpen}
        onClose={() => setIsPaymentMethodFormOpen(false)}
        onSuccess={handlePaymentMethodFormSuccess}
      />

      {/* Modal pour l'ajout/modification d'utilisateur */}
      <Dialog open={isUserFormOpen} onOpenChange={setIsUserFormOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedUser ? 'Modifier l\'utilisateur' : 'Ajouter un utilisateur'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="utilisateur@exemple.com"
                disabled={!!selectedUser}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">Prénom</Label>
                <Input
                  id="first_name"
                  value={userForm.first_name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, first_name: e.target.value }))}
                  placeholder="Jean"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Nom</Label>
                <Input
                  id="last_name"
                  value={userForm.last_name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, last_name: e.target.value }))}
                  placeholder="Mukendi"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="role">Rôle</Label>
              <select
                id="role"
                value={userForm.role}
                onChange={(e) => setUserForm(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="operateur">Opérateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                value={userForm.phone}
                onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+243 123 456 789"
              />
            </div>
            
            <div className="flex space-x-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsUserFormOpen(false)}
                className="flex-1"
              >
                Annuler
              </Button>
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
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialogues de confirmation */}
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

      <ConfirmDialog
        open={deleteUserDialogOpen}
        onOpenChange={setDeleteUserDialogOpen}
        title="Supprimer l'utilisateur"
        description={`Êtes-vous sûr de vouloir supprimer "${userToDelete?.full_name}" ? Cette action est irréversible et supprimera toutes les données associées à cet utilisateur.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        onConfirm={confirmDeleteUser}
        isConfirming={isDeletingUser}
        type="delete"
      />
    </Layout>
  );
};

export default Settings;