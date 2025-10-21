import { supabase } from '@/integrations/supabase/client';
import type { 
  Client, 
  Transaction, 
  Setting, 
  ActivityLog, 
  PaymentMethod, 
  UserProfile,
  PaginatedResponse,
  ApiResponse,
  ClientFilters,
  TransactionFilters,
  CreateClientData,
  CreateTransactionData,
  UpdateTransactionData,
  ExchangeRates,
  Fees
} from '@/types';

export class SupabaseService {
  // Clients
  async getClients(page: number = 1, pageSize: number = 10, filters: ClientFilters = {}): Promise<ApiResponse<PaginatedResponse<Client>>> {
    try {
      let query = supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .range((page - 1) * pageSize, page * pageSize - 1)
        .order('created_at', { ascending: false });

      if (filters.search) {
        query = query.or(`nom.ilike.%${filters.search}%,telephone.ilike.%${filters.search}%`);
      }

      if (filters.ville) {
        query = query.eq('ville', filters.ville);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const result: PaginatedResponse<Client> = {
        data: data || [],
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };

      return { data: result };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async getClientById(id: string): Promise<ApiResponse<Client>> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async createClient(clientData: CreateClientData): Promise<ApiResponse<Client>> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('Création client', 'Client', data.id);

      return { data, message: 'Client créé avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async updateClient(id: string, clientData: Partial<Client>): Promise<ApiResponse<Client>> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('Modification client', 'Client', id);

      return { data, message: 'Client mis à jour avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async deleteClient(id: string): Promise<ApiResponse<void>> {
    try {
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('id')
        .eq('client_id', id)
        .limit(1);

      if (txError) throw txError;

      if (transactions && transactions.length > 0) {
        return { 
          error: 'Impossible de supprimer ce client car il a des transactions associées. Supprimez d\'abord les transactions.' 
        };
      }

      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await this.logActivity('Suppression client', 'Client', id);

      return { message: 'Client supprimé avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Transactions
  async getTransactions(page: number = 1, pageSize: number = 10, filters: TransactionFilters = {}): Promise<ApiResponse<PaginatedResponse<Transaction & { client: Client }>>> {
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          client:clients(*)
        `, { count: 'exact' })
        .range((page - 1) * pageSize, page * pageSize - 1)
        .order('created_at', { ascending: false });

      if (filters.status) {
        query = query.eq('statut', filters.status);
      }

      if (filters.currency) {
        query = query.eq('devise', filters.currency);
      }

      if (filters.clientId) {
        query = query.eq('client_id', filters.clientId);
      }

      if (filters.modePaiement) {
        query = query.eq('mode_paiement', filters.modePaiement);
      }

      if (filters.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte('created_at', filters.dateTo);
      }

      if (filters.minAmount) {
        query = query.gte('montant', parseFloat(filters.minAmount));
      }

      if (filters.maxAmount) {
        query = query.lte('montant', parseFloat(filters.maxAmount));
      }

      const { data, error, count } = await query;

      if (error) throw error;

      const result: PaginatedResponse<Transaction & { client: Client }> = {
        data: data || [],
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };

      return { data: result };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async getTransactionById(id: string): Promise<ApiResponse<Transaction & { client: Client }>> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          client:clients(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return { data };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async createTransaction(transactionData: CreateTransactionData): Promise<ApiResponse<Transaction>> {
    try {
      const rates = await this.getExchangeRates();
      const fees = await this.getFees();
      
      if (rates.error || fees.error) {
        throw new Error('Impossible de récupérer les taux ou frais');
      }

      const tauxUSD = transactionData.devise === 'USD' ? 1 : rates.data!.usdToCdf;
      const fraisUSD = transactionData.montant * (fees.data![transactionData.motif.toLowerCase() as keyof Fees] / 100);
      const montantCNY = transactionData.devise === 'USD' 
        ? transactionData.montant * rates.data!.usdToCny 
        : (transactionData.montant / tauxUSD) * rates.data!.usdToCny;
      const benefice = fraisUSD;

      const fullTransactionData = {
        ...transactionData,
        taux_usd_cny: rates.data!.usdToCny,
        taux_usd_cdf: rates.data!.usdToCdf,
        montant_cny: montantCNY,
        frais: fraisUSD,
        benefice: benefice,
        date_paiement: transactionData.date_paiement || new Date().toISOString(),
        statut: transactionData.statut || 'En attente'
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert([fullTransactionData])
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('Création transaction', 'Transaction', data.id);

      return { data, message: 'Transaction créée avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async updateTransaction(id: string, transactionData: UpdateTransactionData): Promise<ApiResponse<Transaction>> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update(transactionData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('Modification transaction', 'Transaction', id);

      return { data, message: 'Transaction mise à jour avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async deleteTransaction(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await this.logActivity('Suppression transaction', 'Transaction', id);

      return { message: 'Transaction supprimée avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Settings
  async getSettings(categorie?: string): Promise<ApiResponse<Setting[]>> {
    try {
      let query = supabase.from('settings').select('*').order('cle');
      
      if (categorie) {
        query = query.eq('categorie', categorie);
      }

      const { data, error } = await query;

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async updateSetting(categorie: string, settings: Record<string, string>): Promise<ApiResponse<Setting[]>> {
    try {
      const updates = Object.entries(settings).map(([cle, valeur]) => ({
        categorie,
        cle,
        valeur
      }));

      const { data, error } = await supabase
        .from('settings')
        .upsert(updates, { onConflict: 'categorie,cle' })
        .select();

      if (error) throw error;

      await this.logActivity('Modification paramètres', 'Settings');

      return { data: data || [], message: 'Paramètres mis à jour avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async getExchangeRates(): Promise<ApiResponse<ExchangeRates>> {
    try {
      const { data: settings, error } = await supabase
        .from('settings')
        .select('cle, valeur')
        .eq('categorie', 'taux_change')
        .in('cle', ['usdToCny', 'usdToCdf']);

      if (error) throw error;

      const rates: ExchangeRates = {
        usdToCny: 7.25,
        usdToCdf: 2850,
        lastUpdated: new Date().toISOString()
      };

      settings?.forEach(setting => {
        if (setting.cle === 'usdToCny') {
          rates.usdToCny = parseFloat(setting.valeur);
        } else if (setting.cle === 'usdToCdf') {
          rates.usdToCdf = parseFloat(setting.valeur);
        }
      });

      return { data: rates };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async getFees(): Promise<ApiResponse<Fees>> {
    try {
      const { data: settings, error } = await supabase
        .from('settings')
        .select('cle, valeur')
        .eq('categorie', 'frais')
        .in('cle', ['transfert', 'commande', 'partenaire']);

      if (error) throw error;

      const fees: Fees = {
        transfert: 5,
        commande: 10,
        partenaire: 3
      };

      settings?.forEach(setting => {
        if (setting.cle in fees) {
          fees[setting.cle as keyof Fees] = parseFloat(setting.valeur);
        }
      });

      return { data: fees };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Payment Methods
  async getPaymentMethods(): Promise<ApiResponse<PaymentMethod[]>> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .select('*')
        .order('name');

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async createPaymentMethod(methodData: Omit<PaymentMethod, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<PaymentMethod>> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .insert([methodData])
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('Création mode de paiement', 'PaymentMethod', data.id);

      return { data, message: 'Mode de paiement créé avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async updatePaymentMethod(id: string, methodData: Partial<PaymentMethod>): Promise<ApiResponse<PaymentMethod>> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .update(methodData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('Modification mode de paiement', 'PaymentMethod', id);

      return { data, message: 'Mode de paiement mis à jour avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async deletePaymentMethod(id: string): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await this.logActivity('Suppression mode de paiement', 'PaymentMethod', id);

      return { message: 'Mode de paiement supprimé avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async togglePaymentMethod(id: string, isActive: boolean): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('payment_methods')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      await this.logActivity(`${isActive ? 'Activation' : 'Désactivation'} mode de paiement`, 'PaymentMethod', id);

      return { message: `Mode de paiement ${isActive ? 'activé' : 'désactivé'} avec succès` };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // User Profiles
  async getUserProfiles(): Promise<ApiResponse<(UserProfile & { user: { email: string } })[]>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const profiles = data || [];
      const userIds = profiles.map(p => p.user_id).filter(Boolean);
      
      if (userIds.length === 0) {
        return { data: profiles.map(p => ({ ...p, user: { email: '' } })) };
      }

      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      const profilesWithEmail = profiles.map(profile => ({
        ...profile,
        user: { 
          email: (authUsers.users as any[]).find((u: any) => u.id === profile.user_id)?.email || ''
        }
      }));

      return { data: profilesWithEmail };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async ensureCurrentUserProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: 'Utilisateur non connecté' };
      }

      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (existingProfile) {
        return { data: existingProfile };
      }

      const profileData = {
        user_id: user.id,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin',
        role: user.user_metadata?.role || 'admin',
        phone: user.user_metadata?.phone || '',
        is_active: true
      };

      const { data, error } = await supabase
        .from('user_profiles')
        .insert([profileData])
        .select()
        .single();

      if (error) throw error;

      return { data, message: 'Profil utilisateur créé avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async createUserProfile(profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert([profileData])
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('Création profil utilisateur', 'UserProfile', data.id);

      return { data, message: 'Profil utilisateur créé avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async updateUserProfile(id: string, profileData: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('Modification profil utilisateur', 'UserProfile', id);

      return { data, message: 'Profil utilisateur mis à jour avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async toggleUserProfile(id: string, isActive: boolean): Promise<ApiResponse<void>> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      await this.logActivity(`${isActive ? 'Activation' : 'Désactivation'} profil utilisateur`, 'UserProfile', id);

      return { message: `Profil utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès` };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Activity Logs
  async getActivityLogs(page: number = 1, pageSize: number = 10): Promise<ApiResponse<PaginatedResponse<ActivityLog & { user: { email: string } }>>> {
    try {
      const { data, error, count } = await supabase
        .from('activity_logs')
        .select('*')
        .range((page - 1) * pageSize, page * pageSize - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const logs = data || [];
      const userIds = logs.map(l => l.user_id).filter(Boolean);
      
      if (userIds.length === 0) {
        const result: PaginatedResponse<ActivityLog & { user: { email: string } }> = {
          data: logs.map(l => ({ ...l, user: { email: '' } })),
          count: count || 0,
          page,
          pageSize,
          totalPages: Math.ceil((count || 0) / pageSize)
        };
        return { data: result };
      }

      const { data: authUsersData, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      const logsWithEmail = logs.map(log => ({
        ...log,
        user: { 
          email: (authUsersData.users as any[]).find((u: any) => u.id === log.user_id)?.email || ''
        }
      }));

      const result: PaginatedResponse<ActivityLog & { user: { email: string } }> = {
        data: logsWithEmail,
        count: count || 0,
        page,
        pageSize,
        totalPages: Math.ceil((count || 0) / pageSize)
      };

      return { data: result };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async logActivity(action: string, entityType?: string, entityId?: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      await supabase
        .from('activity_logs')
        .insert([{
          user_id: user.id,
          action,
          cible: entityType,
          cible_id: entityId,
          details: {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        }]);
    } catch (error) {
      console.error('Erreur lors de la journalisation de l\'activité:', error);
    }
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<ApiResponse<any>> {
    try {
      const [clientsResult, transactionsResult] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('transactions').select('montant, devise, benefice, montant_cny, created_at', { count: 'exact' })
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (transactionsResult.error) throw transactionsResult.error;

      const transactions = transactionsResult.data || [];
      const today = new Date().toISOString().split('T')[0];
      
      const totalUSD = transactions
        .filter(t => t.devise === 'USD')
        .reduce((sum, t) => sum + (t.montant || 0), 0);
      
      const totalCDF = transactions
        .filter(t => t.devise === 'CDF')
        .reduce((sum, t) => sum + (t.montant || 0), 0);

      const totalCNY = transactions
        .reduce((sum, t) => sum + (t.montant_cny || 0), 0);

      const beneficeNet = transactions
        .reduce((sum, t) => sum + (t.benefice || 0), 0);

      const todayTransactions = transactions
        .filter(t => t.created_at?.startsWith(today))
        .length;

      const stats = {
        totalUSD,
        totalCDF,
        totalCNY,
        beneficeNet,
        clientsCount: clientsResult.count || 0,
        transactionsCount: transactions.length,
        todayTransactions,
        monthlyRevenue: totalUSD * 0.05
      };

      return { data: stats };
    } catch (error: any) {
      return { error: error.message };
    }
  }
}

export const supabaseService = new SupabaseService();