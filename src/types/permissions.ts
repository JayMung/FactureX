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

export type ModuleType = 'clients' | 'transactions' | 'settings' | 'payment_methods' | 'activity_logs';

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
    name: 'admin',
    description: 'Administrateur - Accès complet à tout',
    permissions: {
      clients: { can_read: true, can_create: true, can_update: true, can_delete: true },
      transactions: { can_read: true, can_create: true, can_update: true, can_delete: true },
      settings: { can_read: true, can_create: true, can_update: true, can_delete: true },
      payment_methods: { can_read: true, can_create: true, can_update: true, can_delete: true },
      activity_logs: { can_read: true, can_create: false, can_update: false, can_delete: false }
    }
  },
  {
    name: 'operateur',
    description: 'Opérateur - Gestion quotidienne limitée',
    permissions: {
      clients: { can_read: true, can_create: true, can_update: true, can_delete: false },
      transactions: { can_read: true, can_create: true, can_update: true, can_delete: false },
      settings: { can_read: false, can_create: false, can_update: false, can_delete: false },
      payment_methods: { can_read: true, can_create: false, can_update: false, can_delete: false },
      activity_logs: { can_read: false, can_create: false, can_update: false, can_delete: false }
    }
  },
  {
    name: 'lecteur',
    description: 'Lecteur - Accès en lecture seule',
    permissions: {
      clients: { can_read: true, can_create: false, can_update: false, can_delete: false },
      transactions: { can_read: true, can_create: false, can_update: false, can_delete: false },
      settings: { can_read: false, can_create: false, can_update: false, can_delete: false },
      payment_methods: { can_read: true, can_create: false, can_update: false, can_delete: false },
      activity_logs: { can_read: true, can_create: false, can_update: false, can_delete: false }
    }
  }
];

// Informations sur les modules
export const MODULES_INFO: ModuleInfo[] = [
  { id: 'clients', name: 'Clients', description: 'Gestion des clients', icon: 'Users', adminOnly: false },
  { id: 'transactions', name: 'Transactions', description: 'Gestion des transactions', icon: 'Receipt', adminOnly: false },
  { id: 'settings', name: 'Paramètres', description: 'Configuration système', icon: 'Settings', adminOnly: true },
  { id: 'payment_methods', name: 'Moyens de paiement', description: 'Modes de paiement', icon: 'CreditCard', adminOnly: true },
  { id: 'activity_logs', name: 'Logs d\'activité', description: 'Historique des actions', icon: 'FileText', adminOnly: true }
];