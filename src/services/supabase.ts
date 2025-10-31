import { supabase } from '@/integrations/supabase/client';
import { fieldLevelSecurityService } from '@/lib/security/field-level-security';
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
      // SECURITY: Use field-level security to prevent sensitive data exposure
      const secureSelect = await fieldLevelSecurityService.buildSecureSelect('clients');
      
      let query = supabase
        .from('clients')
        .select(secureSelect, { count: 'exact' })
        .range((page - 1) * pageSize, page * pageSize - 1)
        .order('created_at', { ascending: false });

      if (filters.search) {
        // SECURITY: Only search in allowed fields
        const allowedFields = await fieldLevelSecurityService.getFilteredFields('clients');
        const searchFields = allowedFields.filter(field => ['nom', 'telephone'].includes(field));
        
        if (searchFields.length > 0) {
          const searchConditions = searchFields.map(field => `${field}.ilike.%${filters.search}%`).join(',');
          query = query.or(searchConditions);
        }
      }

      if (filters.ville) {
        query = query.eq('ville', filters.ville);
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // SECURITY: Filter response data to ensure no sensitive information leaks
      const filteredClients = await fieldLevelSecurityService.filterResponseData('clients', data || []);

      // Compute total_paye per client from transactions (USD only, exclude canceled)
      // SECURITY: Only add financial data if user has permission
      const canSeeFinancialData = await fieldLevelSecurityService.isFieldAllowed('clients', 'total_paye');
      
      if (filteredClients.length > 0 && canSeeFinancialData) {
        const clientIds = filteredClients.map(c => c.id);
        const { data: txData, error: txError } = await supabase
          .from('transactions')
          .select('client_id, montant, devise, statut')
          .in('client_id', clientIds);

        if (!txError && txData) {
          const totalsMap = new Map<string, number>();
          txData.forEach(t => {
            if (t.devise === 'USD' && t.statut !== 'Annulé') {
              totalsMap.set(t.client_id, (totalsMap.get(t.client_id) || 0) + (t.montant || 0));
            }
          });
          filteredClients.forEach(c => {
            (c as any).total_paye = totalsMap.get(c.id) || 0;
          });
        }
      }

      const result: PaginatedResponse<Client> = {
        data: filteredClients,
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
      // Traduire les erreurs Postgres en messages conviviaux
      if (error.message?.includes('clients_telephone_organization_unique') || 
          error.code === '23505') {
        return { error: 'Un client avec ce numéro de téléphone existe déjà' };
      }
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
      // Supprimer d'abord toutes les transactions du client
      const { error: txDeleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('client_id', id);

      if (txDeleteError) {
        console.warn('Erreur lors de la suppression des transactions:', txDeleteError);
        // Continuer quand même pour supprimer le client
      }

      // Ensuite supprimer le client
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
      // SECURITY: Use field-level security for both transactions and client data
      const secureTransactionSelect = await fieldLevelSecurityService.buildSecureSelect('transactions');
      const secureClientSelect = await fieldLevelSecurityService.buildSecureSelect('clients');
      
      let query = supabase
        .from('transactions')
        .select(`
          ${secureTransactionSelect},
          client:clients(${secureClientSelect})
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

      // SECURITY: Only allow amount filtering if user can see sensitive financial data
      const canSeeFinancialData = await fieldLevelSecurityService.isFieldAllowed('transactions', 'montant');
      
      if (filters.minAmount && canSeeFinancialData) {
        query = query.gte('montant', parseFloat(filters.minAmount));
      }

      if (filters.maxAmount && canSeeFinancialData) {
        query = query.lte('montant', parseFloat(filters.maxAmount));
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // SECURITY: Additional filtering to ensure no sensitive data leaks
      const filteredData = await fieldLevelSecurityService.filterResponseData('transactions', data || []);

      const result: PaginatedResponse<Transaction & { client: Client }> = {
        data: filteredData,
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
      const montantNet = transactionData.montant - fraisUSD; // Montant après déduction des frais
      const montantCNY = transactionData.devise === 'USD' 
        ? montantNet * rates.data!.usdToCny 
        : (montantNet / tauxUSD) * rates.data!.usdToCny;
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

      await this.logActivity('Création transaction', 'transactions', data.id, {
        transaction_id: `TXN-${data.id.substring(0, 8)}`,
        montant: data.montant,
        devise: data.devise
      });

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

      await this.logActivity('Modification transaction', 'transactions', id, {
        transaction_id: `TXN-${id.substring(0, 8)}`,
        montant: data.montant,
        devise: data.devise
      });

      return { data, message: 'Transaction mise à jour avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async deleteTransaction(id: string): Promise<ApiResponse<void>> {
    try {
      console.log('Tentative de suppression de la transaction:', id);
      
      // Suppression directe sans vérifications complexes
      const { error, count } = await supabase
        .from('transactions')
        .delete({ count: 'exact' })
        .eq('id', id);

      if (error) {
        console.error('Erreur Supabase lors de la suppression:', error);
        
        // Si c'est une erreur RLS, essayer avec une approche différente
        if (error.code === 'PGRST301' || error.message.includes('policy')) {
          console.log('Erreur de politique détectée, tentative alternative...');
          
          // Essayer de marquer comme supprimé au lieu de supprimer réellement
          const { error: updateError } = await supabase
            .from('transactions')
            .update({ 
              statut: 'Annulé',
              updated_at: new Date().toISOString()
            })
            .eq('id', id);
            
          if (updateError) {
            throw updateError;
          }
          
          await this.logActivity('Annulation transaction (RLS)', 'Transaction', id);
          return { message: 'Transaction annulée avec succès (restriction RLS)' };
        }
        
        throw error;
      }

      console.log('Suppression réussie, count:', count);
      
      if (count === 0) {
        return { error: 'Transaction non trouvée ou déjà supprimée' };
      }

      await this.logActivity('Suppression transaction', 'Transaction', id);
      return { message: 'Transaction supprimée avec succès' };
    } catch (error: any) {
      console.error('Erreur complète lors de la suppression:', error);
      return { error: error.message || 'Erreur lors de la suppression de la transaction' };
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
        commande: 15,
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
      // SECURITY: Use field-level security to prevent sensitive data exposure
      const secureSelect = await fieldLevelSecurityService.buildSecureSelect('profiles');
      
      const { data, error } = await supabase
        .from('profiles')
        .select(secureSelect)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const profiles = data || [];
      
      // SECURITY: Filter response data to ensure no sensitive information leaks
      const filteredProfiles = await fieldLevelSecurityService.filterResponseData('profiles', profiles);
      
      // Pour la table profiles, l'email est directement dans la table
      // SECURITY: Only include email if user has permission
      const canSeeEmail = await fieldLevelSecurityService.isFieldAllowed('profiles', 'email');
      
      const profilesWithEmail = filteredProfiles.map(profile => ({
        ...profile,
        user: { 
          email: canSeeEmail && profile.email ? profile.email : '[MASQUÉ]'
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
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existingProfile) {
        return { data: existingProfile };
      }

      const profileData = {
        id: user.id,
        email: user.email || '',
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        role: user.user_metadata?.role || 'admin',
        phone: user.user_metadata?.phone || '',
        is_active: true
      };

      const { data, error } = await supabase
        .from('profiles')
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
        .from('profiles')
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
        .from('profiles')
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
        .from('profiles')
        .update({ is_active: isActive })
        .eq('id', id);

      if (error) throw error;

      await this.logActivity(`${isActive ? 'Activation' : 'Désactivation'} profil utilisateur`, 'UserProfile', id);

      return { message: `Profil utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès` };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Activity Logs - SECURE VERSION
  async getActivityLogs(page: number = 1, pageSize: number = 10): Promise<ApiResponse<PaginatedResponse<ActivityLog & { user: { email: string; first_name: string; last_name: string } }>>> {
    try {
      // Use secure RPC function instead of direct table access
      const { data, error } = await supabase.rpc('get_activity_logs_secure', {
        page_num: page,
        page_size: pageSize
      });

      if (error) throw error;

      // Get total count for pagination
      const { data: countData, error: countError } = await supabase.rpc('count_activity_logs_secure');

      if (countError) {
        console.warn('Failed to get log count:', countError);
      }

      const result: PaginatedResponse<ActivityLog & { user: { email: string; first_name: string; last_name: string } }> = {
        data: data || [],
        count: countData || 0,
        page,
        pageSize,
        totalPages: Math.ceil((countData || 0) / pageSize)
      };

      return { data: result };
    } catch (error: any) {
      // Handle permission errors specifically
      if (error.message.includes('Access denied')) {
        return { error: 'Accès refusé: Permissions administrateur requises pour consulter les logs d\'activité' };
      }
      return { error: error.message };
    }
  }

  async logActivity(action: string, entityType?: string, entityId?: string, additionalDetails?: any): Promise<void> {
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
            userAgent: navigator.userAgent,
            ...additionalDetails
          }
        }]);
    } catch (error) {
      console.error('Erreur lors de la journalisation de l\'activité:', error);
    }
  }

  // Dashboard Stats
  async getDashboardStats(): Promise<ApiResponse<any>> {
    try {
      const [clientsResult, transactionsResult, facturesResult] = await Promise.all([
        supabase.from('clients').select('id', { count: 'exact', head: true }),
        supabase.from('transactions').select('montant, devise, benefice, montant_cny, frais, created_at', { count: 'exact' }),
        supabase.from('factures').select('id, type, statut, total_general, devise, created_at', { count: 'exact' })
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (transactionsResult.error) throw transactionsResult.error;
      if (facturesResult.error) throw facturesResult.error;

      const transactions = transactionsResult.data || [];
      const factures = facturesResult.data || [];
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

      const totalFrais = transactions
        .reduce((sum, t) => sum + (t.frais || 0), 0);

      const todayTransactions = transactions
        .filter(t => t.created_at?.startsWith(today))
        .length;

      // Statistiques des factures
      const facturesValidees = factures.filter(f => f.statut === 'validee');
      
      const facturesAmountUSD = facturesValidees
        .filter(f => f.devise === 'USD')
        .reduce((sum, f) => sum + (f.total_general || 0), 0);
      
      const facturesAmountCDF = facturesValidees
        .filter(f => f.devise === 'CDF')
        .reduce((sum, f) => sum + (f.total_general || 0), 0);

      const stats = {
        totalUSD,
        totalCDF,
        totalCNY,
        beneficeNet,
        totalFrais,
        clientsCount: clientsResult.count || 0,
        transactionsCount: transactions.length,
        todayTransactions,
        monthlyRevenue: totalUSD * 0.05,
        // Nouvelles stats factures
        facturesCount: factures.length,
        facturesValidees: facturesValidees.length,
        facturesAmountUSD,
        facturesAmountCDF
      };

      return { data: stats };
    } catch (error: any) {
      return { error: error.message };
    }
  }
}

export const supabaseService = new SupabaseService();