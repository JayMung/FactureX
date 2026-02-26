import { useState, useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
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
  Package,
  Truck,
  Webhook,
  KeyRound,
  Send,
  ArrowLeftRight,
  ArrowLeft,
  MoreHorizontal
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
// @ts-ignore - Temporary workaround for Supabase types
import type { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import { usePermissions } from '../hooks/usePermissions';
import { useAuth } from '@/components/auth/AuthProvider';
import { permissionConsolidationService } from '@/lib/security/permission-consolidation';
import { adminService } from '@/services/adminService';
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
import { SettingsTransitaires } from '../components/settings/SettingsTransitaires';
import { SettingsApiWebhooks } from '../components/settings/SettingsApiWebhooks';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExchangeRateHistory } from '@/components/settings/ExchangeRateHistory';
import { SettingsTabsLayout } from '@/components/settings/SettingsTabsLayout';
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

const getRoleDisplay = (role: string) => {
  switch (role) {
    case 'super_admin':
      return { text: 'Super Admin', icon: Crown, color: 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600' };
    case 'admin':
      return { text: 'Admin', icon: Shield, color: 'bg-indigo-500 hover:bg-indigo-600 text-white border-indigo-600' };
    case 'operateur':
      return { text: 'Opérateur', icon: UserCheck, color: 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600' };
    default:
      return { text: 'Opérateur', icon: UserCheck, color: 'bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-600' };
  }
};

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
  const [currentUserRole, setCurrentUserRole] = useState<string>('operateur');
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { user: authUser } = useAuth();

  const { checkPermission, canAccessModule, getAccessibleModules, isAdmin, loading: permissionsLoading } = usePermissions();

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

  const [isPaymentMethodFormOpen, setIsPaymentMethodFormOpen] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentMethodToDelete, setPaymentMethodToDelete] = useState<PaymentMethod | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const [permissionsManagerOpen, setPermissionsManagerOpen] = useState(false);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<UserProfile | null>(null);

  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [userToResetPassword, setUserToResetPassword] = useState<UserProfile | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [resetPasswordMethod, setResetPasswordMethod] = useState<'email' | 'manual'>('email');
  const [manualPassword, setManualPassword] = useState('');

  // États pour le changement de mot de passe personnel
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // États pour les sous-onglets du Profil
  const [profileActiveTab, setProfileActiveTab] = useState('photo');

  // États pour les sous-onglets Finances
  const [financesSubTab, setFinancesSubTab] = useState('taux');

  const isMobile = useIsMobile();
  const [showMobileContent, setShowMobileContent] = useState(false);

  const handleMobileTabSelect = (tabId: string) => {
    setActiveTab(tabId);
    setShowMobileContent(true);
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
      if (updateError) throw updateError;
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl } : null);
      setProfileForm(prev => ({ ...prev, avatar_url: publicUrl }));
      showSuccess('Photo de profil mise a jour avec succes');
    } catch (error: any) {
      showError(error.message || 'Erreur lors du telechargement de la photo');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // app_metadata.role = source canonique (server-controlled, non modifiable par l'utilisateur)
          const actualRole = user.app_metadata?.role || 'operateur';

          setUser({
            id: user.id,
            email: user.email || '',
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            role: actualRole,
            phone: user.user_metadata?.phone || '',
            avatar_url: user.user_metadata?.avatar_url || '',
            is_active: true
          });

          setCurrentUserRole(actualRole);

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
    } else if (activeTab === 'finances') {
      fetchSettings();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      // Afficher immédiatement tous les profils avec le rôle du cache
      const baseUsers = (profiles || []).map(p => ({ ...p, role: p.role || 'operateur' }));
      setUsers(baseUsers);

      // Enrichir les rôles via RPC en best-effort (une erreur individuelle ne bloque pas les autres)
      const roleResults = await Promise.allSettled(
        (profiles || []).map(async (profile) => {
          const { data: roleData } = await supabase.rpc('get_user_role', { p_user_id: profile.id });
          return { id: profile.id, role: (roleData as string) || profile.role || 'operateur' };
        })
      );

      const enriched = (profiles || []).map(profile => {
        const result = roleResults.find((_, i) => (profiles || [])[i]?.id === profile.id);
        const role = result?.status === 'fulfilled' ? result.value.role : (profile.role || 'operateur');
        return { ...profile, role };
      });

      setUsers(enriched);
    } catch (error: any) {
      console.error('Error fetching users:', error);
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
    }
  };

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

  const handlePermissionsApplied = () => {
    fetchUsers();
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
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (!currentUser) throw new Error('Utilisateur non authentifié');

        const previousRole = selectedUser.role;

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            first_name: userForm.first_name,
            last_name: userForm.last_name,
            phone: userForm.phone
          })
          .eq('id', selectedUser.id);

        if (profileError) throw profileError;

        if (previousRole !== userForm.role) {
          if (userForm.role === 'admin' || userForm.role === 'super_admin') {
            await permissionConsolidationService.applyRoleAtomic(
              selectedUser.id,
              userForm.role,
              currentUser.id
            );
          } else if (previousRole === 'admin' || previousRole === 'super_admin') {
            await permissionConsolidationService.revokeRoleAtomic(
              selectedUser.id,
              currentUser.id
            );
          }

          if (selectedUser.id === currentUser.id) {
            await supabase.auth.refreshSession();
          }
        }

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
          if (userForm.role === 'admin' || userForm.role === 'super_admin') {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (currentUser) {
              await permissionConsolidationService.applyRoleAtomic(
                profile.id,
                userForm.role,
                currentUser.id
              );
            }
          }

          showSuccess('Utilisateur créé avec succès');
          await fetchUsers();
        } else {
          const { data: manualProfile, error: manualError } = await supabase
            .from('profiles')
            .insert([{
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

  const handleResetPasswordClick = (user: UserProfile) => {
    setUserToResetPassword(user);
    setResetPasswordMethod('email');
    setManualPassword('');
    setResetPasswordDialogOpen(true);
  };

  const handleSendResetPasswordEmail = async () => {
    if (!userToResetPassword) return;

    setIsResettingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        userToResetPassword.email,
        {
          redirectTo: `${window.location.origin}/reset-password`
        }
      );

      if (error) throw error;

      showSuccess(`Un email de réinitialisation a été envoyé à ${userToResetPassword.email}`);
      setResetPasswordDialogOpen(false);
    } catch (error: any) {
      if (error?.code === 'over_email_send_rate_limit' || error?.status === 429) {
        showError('Limite d\'envoi atteinte. Veuillez attendre quelques minutes avant de renvoyer un email.');
      } else {
        showError(error.message || 'Erreur lors de l\'envoi de l\'email de réinitialisation');
      }
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSetManualPassword = async () => {
    if (!userToResetPassword || !manualPassword) return;

    if (manualPassword.length < 6) {
      showError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsResettingPassword(true);
    try {
      const result = await adminService.updateUserPassword(userToResetPassword.id, manualPassword);

      if (!result.success) {
        throw new Error(result.error || 'Erreur lors de la mise à jour du mot de passe');
      }

      showSuccess(`Mot de passe mis à jour pour ${userToResetPassword.email}. Communiquez-le à l'utilisateur de manière sécurisée.`);
      setResetPasswordDialogOpen(false);
      setManualPassword('');
    } catch (error: any) {
      console.error('Error setting manual password:', error);
      showError(error.message || 'Erreur lors de la mise à jour du mot de passe');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleChangeOwnPassword = async () => {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      showError('Veuillez remplir tous les champs');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showError('Le nouveau mot de passe doit contenir au moins 6 caractères');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('Les mots de passe ne correspondent pas');
      return;
    }

    setIsChangingPassword(true);
    try {
      // D'abord, vérifier le mot de passe actuel en se reconnectant
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser?.email) throw new Error('Utilisateur non connecté');

      // Vérifier le mot de passe actuel
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: currentUser.email,
        password: passwordForm.currentPassword
      });

      if (signInError) {
        throw new Error('Le mot de passe actuel est incorrect');
      }

      // Mettre à jour le mot de passe
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.newPassword
      });

      if (updateError) throw updateError;

      showSuccess('Mot de passe modifié avec succès !');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Error changing password:', error);
      showError(error.message || 'Erreur lors du changement de mot de passe');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      if (!user) throw new Error('Utilisateur non connecté');

      // Get current user for audit trail
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) throw new Error('Utilisateur non authentifié');

      const previousRole = user.role;

      // Update basic profile info
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: profileForm.first_name,
          last_name: profileForm.last_name,
          phone: profileForm.phone
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Handle role changes with atomic operations
      if (previousRole !== profileForm.role) {
        if (profileForm.role === 'admin' || profileForm.role === 'super_admin') {
          // Grant admin role
          await permissionConsolidationService.applyRoleAtomic(
            user.id,
            profileForm.role,
            currentUser.id
          );
        } else if (previousRole === 'admin' || previousRole === 'super_admin') {
          // Revoke admin role
          await permissionConsolidationService.revokeRoleAtomic(
            user.id,
            currentUser.id
          );
        }

        // Force session refresh for current user
        await supabase.auth.refreshSession();
      }

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
      // Récupérer l'organization_id de l'utilisateur courant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', user.id)
        .single();
      
      const orgId = profile?.organization_id;
      if (!orgId) throw new Error('Organization ID non trouvé');

      const updates = Object.entries(settings).map(([cle, valeur]) => ({
        categorie: category,
        cle,
        valeur,
        organization_id: orgId
      }));

      const { error } = await supabase
        .from('settings')
        .upsert(updates, { onConflict: 'categorie,cle,organization_id' });

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
      icon: <div className="p-1.5 rounded-md bg-pink-100"><UserIcon className="h-4 w-4 text-pink-600" /></div>,
      description: 'Informations personnelles et photo de profil'
    },
    {
      id: 'company',
      label: 'Entreprise',
      icon: <div className="p-1.5 rounded-md bg-blue-100"><Building2 className="h-4 w-4 text-blue-600" /></div>,
      description: 'Informations entreprise et logo',
      adminOnly: false
    },
    {
      id: 'users',
      label: 'Utilisateurs',
      icon: <div className="p-1.5 rounded-md bg-indigo-100"><Users className="h-4 w-4 text-indigo-600" /></div>,
      description: 'Gestion des comptes utilisateurs et permissions',
      adminOnly: true
    },
    {
      id: 'payment-methods',
      label: 'Moyens de paiement',
      icon: <div className="p-1.5 rounded-md bg-purple-100"><CreditCard className="h-4 w-4 text-purple-600" /></div>,
      description: 'Configuration des modes de paiement',
      adminOnly: true
    },
    {
      id: 'factures',
      label: 'Factures',
      icon: <div className="p-1.5 rounded-md bg-green-100"><Receipt className="h-4 w-4 text-green-600" /></div>,
      description: 'Frais de livraison et catégories produits',
      adminOnly: false
    },
    {
      id: 'colis',
      label: 'Colis',
      icon: <div className="p-1.5 rounded-md bg-orange-100"><Package className="h-4 w-4 text-orange-600" /></div>,
      description: 'Fournisseurs et tarifs pour colis aériens/maritimes',
      adminOnly: false
    },
    {
      id: 'finances',
      label: 'Finances',
      icon: <div className="p-1.5 rounded-md bg-cyan-100"><ArrowLeftRight className="h-4 w-4 text-cyan-600" /></div>,
      description: 'Taux de change et frais de transaction',
      adminOnly: true
    },
    {
      id: 'activity-logs',
      label: 'Logs d\'activité',
      icon: <div className="p-1.5 rounded-md bg-gray-100"><History className="h-4 w-4 text-gray-600" /></div>,
      description: 'Historique des actions dans l\'application',
      adminOnly: true
    },
    {
      id: 'api-webhooks',
      label: 'API & Webhooks',
      icon: <div className="p-1.5 rounded-md bg-indigo-100"><Key className="h-4 w-4 text-indigo-600" /></div>,
      description: 'Clés API et notifications webhooks',
      adminOnly: true
    }
  ];

  // Mapper les IDs des sections aux modules de permissions
  const sectionToModuleMap: { [key: string]: string } = {
    'profile': 'profile',
    'company': 'settings',
    'users': 'users',
    'payment-methods': 'payment_methods',
    'finances': 'exchange_rates',
    'activity-logs': 'activity_logs',
    'factures': 'factures',
    'colis': 'colis'
  };

  const filteredOptions = settingsOptions.filter(option => {
    // While loading permissions, show all tabs to avoid flash
    if (permissionsLoading) return true;

    // Admins see everything
    if (isAdmin) return true;

    // Fallback: Check if user has super_admin role in metadata
    const userRole = authUser?.user_metadata?.role || authUser?.app_metadata?.role;
    if (userRole === 'super_admin' || userRole === 'admin') return true;

    // If adminOnly and not admin, hide
    if (option.adminOnly) return false;

    // Check module access for non-admin users
    const moduleId = sectionToModuleMap[option.id];
    return moduleId ? canAccessModule(moduleId as any) : true;
  });

  if (loading) {
    return (
      <Layout>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-pulse">
          <div className="lg:col-span-1 h-96 bg-gray-100 rounded-xl" />
          <div className="lg:col-span-3 space-y-4">
            <div className="h-48 bg-gray-100 rounded-xl" />
            <div className="h-64 bg-gray-100 rounded-xl" />
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {(!isMobile || !showMobileContent) && (
            <div className="lg:col-span-1 lg:sticky lg:top-4 lg:self-start">
              <Card className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <SettingsIcon className="h-4 w-4" />
                      Paramètres
                    </h3>
                  </div>
                  <nav className="p-2 space-y-0.5">
                    {filteredOptions.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => isMobile ? handleMobileTabSelect(option.id) : setActiveTab(option.id)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-left transition-all ${
                          activeTab === option.id
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className={activeTab === option.id ? 'text-white' : 'text-gray-400'}>
                          {option.icon}
                        </span>
                        <div className="min-w-0">
                          <p className={`font-medium text-sm ${activeTab === option.id ? 'text-white' : ''}`}>
                            {option.label}
                          </p>
                          <p className={`text-xs truncate mt-0.5 ${activeTab === option.id ? 'text-emerald-100' : 'text-gray-400'}`}>
                            {option.description}
                          </p>
                        </div>
                      </button>
                    ))}
                  </nav>
                </CardContent>
              </Card>
            </div>
          )}

          {(!isMobile || showMobileContent) && (
          <div className="lg:col-span-3">
            {isMobile && showMobileContent && (
              <Button
                variant="ghost"
                onClick={() => setShowMobileContent(false)}
                className="mb-4 flex items-center gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Retour aux paramètres
              </Button>
            )}
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
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">ID</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Nom</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Email</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Rôle</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Statut</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Inscription</th>
                            <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((user) => (
                            <tr key={user.id} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4">
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 font-mono">
                                  {String(users.indexOf(user) + 1).padStart(4, '0')}
                                </code>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-medium text-green-700">
                                      {(user.first_name?.[0] || '?')}{(user.last_name?.[0] || '')}
                                    </span>
                                  </div>
                                  <span className="font-medium text-sm">{user.first_name} {user.last_name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                              <td className="py-3 px-4">
                                {(() => {
                                  const roleDisplay = getRoleDisplay(user.role || 'operateur');
                                  const Icon = roleDisplay.icon;
                                  return (
                                    <Badge
                                      variant={user.role === 'super_admin' || user.role === 'admin' ? 'default' : 'secondary'}
                                      className={roleDisplay.color}
                                    >
                                      <Icon className="mr-1 h-3 w-3" />
                                      {roleDisplay.text}
                                    </Badge>
                                  );
                                })()}
                              </td>
                              <td className="py-3 px-4">
                                <Badge
                                  variant={user.is_active ? 'default' : 'secondary'}
                                  className={user.is_active ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400'}
                                >
                                  {user.is_active ? 'Actif' : 'Inactif'}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-500">
                                {user.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                }) : '-'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="hover:bg-green-50 hover:text-green-600"
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-48">
                                    <DropdownMenuItem
                                      onClick={() => handleManagePermissions(user)}
                                      className="cursor-pointer"
                                    >
                                      <Key className="mr-2 h-4 w-4 text-green-600" />
                                      Gérer les permissions
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleToggleUserStatus(user)}
                                      className="cursor-pointer"
                                    >
                                      {user.is_active ? (
                                        <><UserX className="mr-2 h-4 w-4 text-orange-600" />Désactiver</>
                                      ) : (
                                        <><UserCheck className="mr-2 h-4 w-4 text-green-600" />Activer</>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleResetPasswordClick(user)}
                                      className="cursor-pointer"
                                    >
                                      <KeyRound className="mr-2 h-4 w-4 text-orange-600" />
                                      Réinitialiser mot de passe
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleEditUser(user)}
                                      className="cursor-pointer"
                                    >
                                      <Edit className="mr-2 h-4 w-4 text-blue-600" />
                                      Modifier
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => handleDeleteUser(user)}
                                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" />
                                      Supprimer
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
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

            {/* Company Tab */}
            {activeTab === 'company' && <CompanySettings />}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <SettingsTabsLayout
                tabs={[
                  { id: 'photo', label: 'Photo de profil', icon: <Camera className="h-4 w-4" />, color: 'text-pink-500' },
                  { id: 'info', label: 'Informations personnelles', icon: <UserIcon className="h-4 w-4" />, color: 'text-blue-500' },
                  { id: 'security', label: 'Sécurité et mot de passe', icon: <Lock className="h-4 w-4" />, color: 'text-orange-500' }
                ]}
                activeTab={profileActiveTab}
                onTabChange={setProfileActiveTab}
              >
                {/* Photo de profil */}
                {profileActiveTab === 'photo' && (
                  <Card>
                    <CardContent className="p-6">
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
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarUpload}
                          />
                          <button
                            className="absolute bottom-0 right-0 bg-green-500 hover:bg-green-600 text-white rounded-full p-2 shadow-lg transition-colors"
                            title="Changer la photo"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                          </button>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{profileForm.first_name} {profileForm.last_name}</h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {currentUserRole === 'super_admin' ? '👑 Super Administrateur' :
                              currentUserRole === 'admin' ? '👑 Administrateur' : '👤 Opérateur'}
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Membre depuis {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' }) : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Informations personnelles */}
                {profileActiveTab === 'info' && (
                  <Card>
                    <CardContent className="p-6 space-y-4">
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
                )}

                {/* Sécurité et mot de passe */}
                {profileActiveTab === 'security' && (
                  <Card>
                    <CardContent className="p-6 space-y-4">
                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                        <div className="flex items-start">
                          <Shield className="h-5 w-5 text-orange-500 mt-0.5 mr-3 flex-shrink-0" />
                          <div>
                            <h4 className="font-medium text-orange-900">Modifier votre mot de passe</h4>
                            <p className="text-sm text-orange-700 mt-1">
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
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="new_password">Nouveau mot de passe</Label>
                          <Input
                            id="new_password"
                            type="password"
                            placeholder="Minimum 6 caractères"
                            value={passwordForm.newPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="confirm_password">Confirmer le mot de passe</Label>
                          <Input
                            id="confirm_password"
                            type="password"
                            placeholder="Confirmez le nouveau mot de passe"
                            value={passwordForm.confirmPassword}
                            onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          />
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="border-green-500 text-green-600 hover:bg-green-50"
                        onClick={handleChangeOwnPassword}
                        disabled={isChangingPassword}
                      >
                        {isChangingPassword ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Modification en cours...
                          </>
                        ) : (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Changer le mot de passe
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </SettingsTabsLayout>
            )}

            {/* Payment Methods Tab */}
            {activeTab === 'payment-methods' && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center">
                      <CreditCard className="mr-2 h-5 w-5" />
                      Moyens de paiement ({paymentMethods.length})
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
                  {paymentMethods.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>Aucun moyen de paiement configuré</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">ID</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Nom</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Description</th>
                            <th className="text-left py-3 px-4 font-semibold text-sm text-gray-700">Statut</th>
                            <th className="text-center py-3 px-4 font-semibold text-sm text-gray-700">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {paymentMethods.map((method, index) => (
                            <tr key={method.id} className="border-b hover:bg-gray-50 transition-colors">
                              <td className="py-3 px-4">
                                <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600 font-mono">
                                  {String(index + 1).padStart(4, '0')}
                                </code>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                    <CreditCard className="h-4 w-4 text-green-500" />
                                  </div>
                                  <span className="font-medium text-sm">{method.name}</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-sm text-gray-600">
                                {method.description || '-'}
                              </td>
                              <td className="py-3 px-4">
                                <Badge
                                  variant={method.is_active ? 'default' : 'secondary'}
                                  className={method.is_active ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400'}
                                >
                                  {method.is_active ? 'Actif' : 'Inactif'}
                                </Badge>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-2">
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

            {/* Finances Tab */}
            {activeTab === 'finances' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ArrowLeftRight className="mr-2 h-5 w-5" />
                    Finances
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <SettingsTabsLayout
                    tabs={[
                      { id: 'taux', label: 'Taux de change', icon: <DollarSign className="h-4 w-4" />, color: 'text-cyan-500' },
                      { id: 'frais', label: 'Frais de transaction', icon: <SettingsIcon className="h-4 w-4" />, color: 'text-amber-500' }
                    ]}
                    activeTab={financesSubTab}
                    onTabChange={setFinancesSubTab}
                  >
                    {financesSubTab === 'taux' && (
                      <div className="space-y-4 pt-4">
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
                        <ExchangeRateHistory limit={10} className="mt-4" />
                      </div>
                    )}

                    {financesSubTab === 'frais' && (
                      <div className="space-y-4 pt-4">
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
                      </div>
                    )}
                  </SettingsTabsLayout>
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

            {/* API & Webhooks Tab */}
            {activeTab === 'api-webhooks' && <SettingsApiWebhooks />}

          </div>
          )}
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
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm(prev => ({ ...prev, email: e.target.value }))}
                disabled={!!selectedUser}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="user-first_name">Prénom</Label>
                <Input
                  id="user-first_name"
                  value={userForm.first_name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, first_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="user-last_name">Nom</Label>
                <Input
                  id="user-last_name"
                  value={userForm.last_name}
                  onChange={(e) => setUserForm(prev => ({ ...prev, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="user-role">Rôle</Label>
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
              <Label htmlFor="user-phone">Téléphone</Label>
              <Input
                id="user-phone"
                value={userForm.phone}
                onChange={(e) => setUserForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            {!selectedUser && (
              <div>
                <Label htmlFor="user-password">Mot de passe</Label>
                <Input
                  id="user-password"
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
      {
        selectedUserForPermissions && (
          <PermissionsManager
            user={selectedUserForPermissions}
            isOpen={permissionsManagerOpen}
            onClose={() => {
              setPermissionsManagerOpen(false);
              setSelectedUserForPermissions(null);
            }}
            onSuccess={handlePermissionsApplied}
          />
        )
      }

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

      {/* Reset Password Dialog */}
      <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <KeyRound className="mr-2 h-5 w-5 text-orange-500" />
              Réinitialiser le mot de passe
            </DialogTitle>
          </DialogHeader>

          {userToResetPassword && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Utilisateur :</p>
                <p className="font-medium">{userToResetPassword.first_name} {userToResetPassword.last_name}</p>
                <p className="text-sm text-gray-500">{userToResetPassword.email}</p>
              </div>

              <div className="space-y-3">
                <Label>Méthode de réinitialisation</Label>
                <div className="space-y-2">
                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="resetMethod"
                      value="email"
                      checked={resetPasswordMethod === 'email'}
                      onChange={() => setResetPasswordMethod('email')}
                      className="text-green-500 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <Send className="h-4 w-4 mr-2 text-blue-500" />
                        <span className="font-medium">Envoyer un lien par email</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        L'utilisateur recevra un email avec un lien sécurisé pour définir son nouveau mot de passe
                      </p>
                    </div>
                  </label>

                  <label className="flex items-center space-x-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="radio"
                      name="resetMethod"
                      value="manual"
                      checked={resetPasswordMethod === 'manual'}
                      onChange={() => setResetPasswordMethod('manual')}
                      className="text-green-500 focus:ring-green-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center">
                        <Lock className="h-4 w-4 mr-2 text-orange-500" />
                        <span className="font-medium">Définir manuellement</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Définir un mot de passe temporaire pour l'utilisateur
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {resetPasswordMethod === 'manual' && (
                <div className="space-y-2">
                  <Label htmlFor="manualPassword">Nouveau mot de passe</Label>
                  <Input
                    id="manualPassword"
                    type="password"
                    value={manualPassword}
                    onChange={(e) => setManualPassword(e.target.value)}
                    placeholder="Minimum 6 caractères"
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500">
                    Communiquez ce mot de passe à l'utilisateur de manière sécurisée. Il devra le changer après sa première connexion.
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setResetPasswordDialogOpen(false)}
                  disabled={isResettingPassword}
                >
                  Annuler
                </Button>
                <Button
                  onClick={resetPasswordMethod === 'email' ? handleSendResetPasswordEmail : handleSetManualPassword}
                  disabled={isResettingPassword || (resetPasswordMethod === 'manual' && manualPassword.length < 6)}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {isResettingPassword ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {resetPasswordMethod === 'email' ? 'Envoi en cours...' : 'Mise à jour...'}
                    </>
                  ) : resetPasswordMethod === 'email' ? (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Envoyer le lien
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Définir le mot de passe
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout >
  );
};

export default SettingsWithPermissions;