/**
 * API Types for FactureX External API
 * Shared types for all API endpoints
 */

// ============================================================================
// API Key Types
// ============================================================================

export type ApiKeyType = 'public' | 'secret' | 'admin' | 'ai_agent';

export interface ApiKey {
  id: string;
  organization_id: string;
  name: string;
  key_hash: string;
  key_prefix: string; // pk_live_, sk_live_, ak_live_, ai_live_
  type: ApiKeyType;
  permissions: string[];
  is_active: boolean;
  is_machine: boolean; // true for ai_agent keys
  last_used_at?: string;
  expires_at?: string;
  created_at: string;
  created_by: string;
}

export interface ApiKeyPermissions {
  public: string[];     // ['read:stats', 'read:public_data']
  secret: string[];     // ['read:*', 'write:webhooks']
  admin: string[];      // ['*']
  ai_agent: string[];   // ['read:transactions', 'read:clients', ... 'write:pending_transactions']
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ApiRequest {
  apiKey: string;
  organizationId: string;
  endpoint: string;
  method: string;
  ip?: string;
  userAgent?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    generated_at: string;
    organization_id: string;
    request_id?: string;
    api_version?: string;
    deprecated?: boolean;
    sunset?: string;
    migration_url?: string;
  };
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

// ============================================================================
// Query Filter Types
// ============================================================================

export interface TransactionFilters {
  status?: string;
  currency?: 'USD' | 'CDF';
  client_id?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
  motif?: string;
  type_transaction?: 'revenue' | 'depense' | 'transfert';
  limit?: number;
  offset?: number;
}

export interface ClientFilters {
  search?: string;
  ville?: string;
  has_transactions?: boolean;
  min_total?: number;
  limit?: number;
  offset?: number;
}

export interface FactureFilters {
  type?: 'facture' | 'devis';
  statut?: string;
  client_id?: string;
  date_from?: string;
  date_to?: string;
  include_items?: boolean;
  limit?: number;
  offset?: number;
}

export interface StatsFilters {
  period?: '24h' | '7d' | '30d' | '90d' | 'custom';
  date_from?: string;
  date_to?: string;
  group_by?: 'day' | 'week' | 'month';
  currency?: 'USD' | 'CDF' | 'both';
}

export interface ColisFilters {
  statut?: string;
  statut_paiement?: string;
  type_livraison?: 'aerien' | 'maritime';
  client_id?: string;
  date_from?: string;
  date_to?: string;
  min_poids?: number;
  tracking?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// Webhook Types
// ============================================================================

export type WebhookEvent = 
  | 'transaction.created'
  | 'transaction.validated'
  | 'transaction.deleted'
  | 'facture.created'
  | 'facture.validated'
  | 'facture.paid'
  | 'client.created'
  | 'client.updated'
  | 'colis.created'
  | 'colis.delivered'
  | 'colis.status_changed';

export type WebhookFormat = 'json' | 'discord' | 'slack' | 'n8n';

export interface Webhook {
  id: string;
  organization_id: string;
  name: string;
  url: string;
  events: WebhookEvent[];
  format: WebhookFormat;
  is_active: boolean;
  secret?: string; // For signature verification
  filters?: Record<string, any>;
  created_at: string;
  created_by: string;
  last_triggered_at?: string;
  failure_count: number;
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  organization_id: string;
  data: any;
  signature?: string; // HMAC signature
}

// ============================================================================
// Discord-specific Types
// ============================================================================

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
  };
  timestamp?: string;
}

export interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

// ============================================================================
// API Audit Log Types
// ============================================================================

export interface ApiAuditLog {
  id: string;
  organization_id: string;
  api_key_id: string;
  endpoint: string;
  method: string;
  status_code: number;
  response_time_ms: number;
  ip_address?: string;
  user_agent?: string;
  error_message?: string;
  created_at: string;
}

// ============================================================================
// Rate Limit Types
// ============================================================================

export interface RateLimitConfig {
  public: {
    requests: number;
    window: string; // '1h'
  };
  secret: {
    requests: number;
    window: string; // '1h'
  };
  admin: {
    requests: number;
    window: string; // '1h'
  };
  ai_agent: {
    requests: number;
    window: string; // '1h'
  };
}

export const RATE_LIMITS: RateLimitConfig = {
  public: {
    requests: 100,
    window: '1h'
  },
  secret: {
    requests: 1000,
    window: '1h'
  },
  admin: {
    requests: 5000,
    window: '1h'
  },
  ai_agent: {
    requests: 200,
    window: '1h'
  }
};

// ============================================================================
// Permission Constants
// ============================================================================

export const API_PERMISSIONS = {
  // Read permissions
  'read:stats': 'Read aggregated statistics',
  'read:transactions': 'Read transaction data',
  'read:clients': 'Read client data',
  'read:factures': 'Read facture/devis data',
  'read:comptes': 'Read financial accounts',
  'read:mouvements': 'Read account movements',
  
  // Write permissions
  'write:webhooks': 'Create and manage webhooks',
  'write:transactions': 'Create transactions',
  'write:pending_transactions': 'Create pending transactions (requires approval)',
  
  // Colis permissions
  'read:colis': 'Read colis (parcels) data',
  
  // Admin permissions
  'admin:keys': 'Manage API keys',
  'admin:webhooks': 'Manage all webhooks',
  '*': 'Full access'
} as const;

export const DEFAULT_PERMISSIONS: Record<ApiKeyType, string[]> = {
  public: ['read:stats'],
  secret: ['read:*', 'write:webhooks'],
  admin: ['*'],
  ai_agent: [
    'read:transactions',
    'read:clients',
    'read:factures',
    'read:colis',
    'read:stats',
    'write:pending_transactions'
  ]
};

// ============================================================================
// AI Agent Restrictions
// ============================================================================

/**
 * Hard restrictions for ai_agent keys that cannot be overridden by permissions.
 * These are enforced at the middleware level regardless of granted permissions.
 */
export const AI_AGENT_RESTRICTIONS = {
  /** ai_agent keys cannot delete any entity */
  canDelete: false,
  /** ai_agent keys cannot update validated transactions */
  canUpdateValidated: false,
  /** ai_agent keys cannot bypass the approval workflow */
  canBypassApproval: false,
} as const;
