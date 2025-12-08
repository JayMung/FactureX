export interface UserPermission {
  id: string;
  user_id: string;
  module: ModuleType;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
  created_at: string;
  updated_at: string;
}

export type ModuleType = 'clients' | 'finances' | 'settings' | 'payment_methods' | 'activity_logs' | 'factures' | 'exchange_rates' | 'transaction_fees' | 'colis' | 'reports' | 'users' | 'profile' | 'security_logs';

export interface ModuleInfo {
  id: ModuleType;
  name: string;
  description: string;
  icon: string;
  adminOnly: boolean;
}

export interface UserPermissionsMap {
  [module: string]: {
    can_read: boolean;
    can_create: boolean;
    can_update: boolean;
    can_delete: boolean;
  };
}

export interface PermissionRole {
  name: string;
  description: string;
  permissions: {
    [module: string]: {
      can_read: boolean;
      can_create: boolean;
      can_update: boolean;
      can_delete: boolean;
    };
  };
}

// Rôles prédéfinis
export const PREDEFINED_ROLES: PermissionRole[] = [
  {
    name: 'super_admin',
    description: 'Administrateur - Accès complet à tout',
    permissions: {
      clients: { can_read: true, can_create: true, can_update: true, can_delete: true },
      finances: { can_read: true, can_create: true, can_update: true, can_delete: true },
      factures: { can_read: true, can_create: true, can_update: true, can_delete: true },
      colis: { can_read: true, can_create: true, can_update: true, can_delete: true },
      settings: { can_read: true, can_create: true, can_update: true, can_delete: true },
      payment_methods: { can_read: true, can_create: true, can_update: true, can_delete: true },
      exchange_rates: { can_read: true, can_create: true, can_update: true, can_delete: true },
      transaction_fees: { can_read: true, can_create: true, can_update: true, can_delete: true },
      activity_logs: { can_read: true, can_create: false, can_update: false, can_delete: false },
      users: { can_read: true, can_create: true, can_update: true, can_delete: true },
      profile: { can_read: true, can_create: true, can_update: true, can_delete: true },
      reports: { can_read: true, can_create: true, can_update: true, can_delete: true },
      security_logs: { can_read: true, can_create: false, can_update: false, can_delete: false }
    }
  },
  {
    name: 'admin',
    description: 'Administrateur - Gestion complète limitée',
    permissions: {
      clients: { can_read: true, can_create: true, can_update: true, can_delete: true },
      finances: { can_read: true, can_create: true, can_update: true, can_delete: true },
      factures: { can_read: true, can_create: true, can_update: true, can_delete: true },
      colis: { can_read: true, can_create: true, can_update: true, can_delete: false },
      settings: { can_read: true, can_create: true, can_update: true, can_delete: false },
      payment_methods: { can_read: true, can_create: true, can_update: true, can_delete: false },
      exchange_rates: { can_read: true, can_create: true, can_update: true, can_delete: false },
      transaction_fees: { can_read: true, can_create: true, can_update: true, can_delete: false },
      activity_logs: { can_read: true, can_create: false, can_update: false, can_delete: false },
      users: { can_read: true, can_create: true, can_update: true, can_delete: false },
      profile: { can_read: true, can_create: true, can_update: true, can_delete: false },
      reports: { can_read: true, can_create: true, can_update: false, can_delete: false },
      security_logs: { can_read: false, can_create: false, can_update: false, can_delete: false }
    }
  },
  {
    name: 'operateur',
    description: 'Opérateur - Gestion quotidienne limitée',
    permissions: {
      clients: { can_read: true, can_create: true, can_update: true, can_delete: false },
      finances: { can_read: false, can_create: false, can_update: false, can_delete: false },
      factures: { can_read: true, can_create: true, can_update: true, can_delete: false },
      colis: { can_read: true, can_create: true, can_update: false, can_delete: false },
      settings: { can_read: false, can_create: false, can_update: false, can_delete: false },
      payment_methods: { can_read: true, can_create: false, can_update: false, can_delete: false },
      exchange_rates: { can_read: true, can_create: false, can_update: false, can_delete: false },
      transaction_fees: { can_read: true, can_create: false, can_update: false, can_delete: false },
      activity_logs: { can_read: false, can_create: false, can_update: false, can_delete: false },
      users: { can_read: false, can_create: false, can_update: false, can_delete: false },
      profile: { can_read: true, can_create: false, can_update: true, can_delete: false },
      reports: { can_read: true, can_create: false, can_update: false, can_delete: false },
      security_logs: { can_read: false, can_create: false, can_update: false, can_delete: false }
    }
  }
];

// Informations sur les modules
export const MODULES_INFO: ModuleInfo[] = [
  { id: 'clients', name: 'Clients', description: 'Gestion des clients et contacts', icon: 'Users', adminOnly: false },
  { id: 'finances', name: 'Finances', description: 'Gestion des transactions, comptes et rapports financiers', icon: 'DollarSign', adminOnly: false },
  { id: 'factures', name: 'Factures', description: 'Gestion des factures et devis', icon: 'FileText', adminOnly: false },
  { id: 'colis', name: 'Colis', description: 'Suivi des expéditions et livraisons', icon: 'Package', adminOnly: false },
  { id: 'settings', name: 'Paramètres', description: 'Configuration générale de l\'application', icon: 'Settings', adminOnly: false },
  { id: 'payment_methods', name: 'Moyens de paiement', description: 'Configuration des modes de paiement', icon: 'CreditCard', adminOnly: false },
  { id: 'exchange_rates', name: 'Taux de change', description: 'Gestion des taux de change USD/CNY/CDF', icon: 'TrendingUp', adminOnly: false },
  { id: 'transaction_fees', name: 'Frais de transaction', description: 'Configuration des frais par type de transaction', icon: 'Percent', adminOnly: false },
  { id: 'activity_logs', name: 'Journal d\'activité', description: 'Historique des actions dans l\'application', icon: 'Activity', adminOnly: false },
  { id: 'reports', name: 'Rapports', description: 'Rapports financiers et analyses', icon: 'BarChart3', adminOnly: false },
  { id: 'users', name: 'Utilisateurs', description: 'Gestion des comptes utilisateurs', icon: 'UserCheck', adminOnly: true },
  { id: 'profile', name: 'Profil', description: 'Informations personnelles et préférences', icon: 'User', adminOnly: false },
  { id: 'security_logs', name: 'Logs de sécurité', description: 'Journal des événements de sécurité', icon: 'Shield', adminOnly: true }
];