import { supabase } from '@/integrations/supabase/client';
import type { 
  Client, 
  Transaction, 
  Setting, 
  ActivityLog,
  PaymentMethod,
  UserProfile,
  PaginatedResponse,
  TransactionFilters,
  ClientFilters,
  DashboardStats,
  ExchangeRates,
  Fees,
  CreateClientData,
  CreateTransactionData,
  UpdateTransactionData,
  ApiResponse 
} from '@/types';

class SupabaseService {
  // ===== CLIENTS =====
  
  async getClients(
    page: number = 1, 
    pageSize: number = 10, 
    filters: ClientFilters = {}
  ): Promise<ApiResponse<PaginatedResponse<Client>>> {
    try {
      let query = supabase
        .from('clients')
        .select('*', { count: 'exact' });

      if (filters.search) {
        query = query.or(`nom.ilike.%${filters.search}%,telephone.ilike.%${filters.search}%,ville.ilike.%${filters.search}%`);
      }
      
      if (filters.ville) {
        query = query.eq('ville', filters.ville);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      const totalPages = count ? Math.ceil(count / pageSize) : 0;

      return {
        data: {
          data: data || [],
          count: count || 0,
          page,
          pageSize,
          totalPages
        }
      };
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
        .insert({
          ...clientData,
          total_paye: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('Création client', 'Client', data.id, { nom: clientData.nom });

      return { data, message: 'Client créé avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async updateClient(id: string, clientData: Partial<Client>): Promise<ApiResponse<Client>> {
    try {
      const { data, error } = await supabase
        .from('clients')
        .update({
          ...clientData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('Modification client', 'Client', id, clientData);

      return { data, message: 'Client mis à jour avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async deleteClient(id: string): Promise<ApiResponse<void>> {
    try {
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

  // ===== TRANSACTIONS =====
  
  async getTransactions(
    page: number = 1,
    pageSize: number = 10,
    filters: TransactionFilters = {}
  ): Promise<ApiResponse<PaginatedResponse<Transaction & { client: Client }>>> {
    try {
      let query = supabase
        .from('transactions')
        .select(`
          *,
          client:clients(id, nom, telephone, ville)
        `, { count: 'exact' });

      if (filters.status && filters.status !== 'all') {
        query = query.eq('statut', filters.status);
      }
      
      if (filters.currency && filters.currency !== 'all') {
        query = query.eq('devise', filters.currency);
      }
      
      if (filters.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      
      if (filters.modePaiement) {
        query = query.eq('mode_paiement', filters.modePaiement);
      }
      
      if (filters.dateFrom) {
        query = query.gte('date_paiement', filters.dateFrom);
      }
      
      if (filters.dateTo) {
        query = query.lte('date_paiement', filters.dateTo);
      }

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      const totalPages = count ? Math.ceil(count / pageSize) : 0;

      return {
        data: {
          data: (data as any) || [],
          count: count || 0,
          page,
          pageSize,
          totalPages
        }
      };
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
          client:clients(id, nom, telephone, ville)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      return { data: data as any };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async createTransaction(transactionData: CreateTransactionData): Promise<ApiResponse<Transaction>> {
    try {
      console.log('Création de transaction avec données:', transactionData);

      const [ratesResponse, feesResponse] = await Promise.all([
        this.getExchangeRates(),
        this.getFees()
      ]);
      
      const tauxUsdCny = ratesResponse.data?.usdToCny || 7.25;
      const tauxUsdCdf = ratesResponse.data?.usdToCdf || 2850;
      
      const fraisConfig = feesResponse.data || { transfert: 5, commande: 10, partenaire: 3 };
      
      let montantEnUSD = transactionData.montant;
      if (transactionData.devise === 'CDF') {
        montantEnUSD = transactionData.montant / tauxUsdCdf;
      } else if (transactionData.devise === 'CNY') {
        montantEnUSD = transactionData.montant / tauxUsdCny;
      }
      
      const fraisPercentage = transactionData.motif === 'Commande' 
        ? (fraisConfig.commande / 100) 
        : (fraisConfig.transfert / 100);
      const frais = montantEnUSD * fraisPercentage;
      
      const montantCny = (montantEnUSD - frais) * tauxUsdCny;
      
      const beneficePercentage = (fraisConfig.partenaire / 100);
      const benefice = frais * (1 - beneficePercentage);

      const insertData = {
        reference: transactionData.reference || `TRX-${Date.now()}`,
        client_id: transactionData.client_id,
        montant: transactionData.montant,
        devise: transactionData.devise,
        motif: transactionData.motif,
        mode_paiement: transactionData.mode_paiement,
        statut: transactionData.statut || 'En attente',
        date_paiement: transactionData.date_paiement || new Date().toISOString().split('T')[0],
        frais,
        taux_usd_cny: tauxUsdCny,
        taux_usd_cdf: tauxUsdCdf,
        benefice,
        montant_cny: montantCny,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('Données à insérer:', insertData);

      const { data, error } = await supabase
        .from('transactions')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('Erreur Supabase:', error);
        throw error;
      }

      console.log('Transaction créée:', data);

      await this.updateClientTotal(transactionData.client_id, montantEnUSD);

      if (data?.id) {
        await this.logActivity('Création transaction', 'Transaction', data.id, { 
          reference: transactionData.reference,
          montant: transactionData.montant,
          devise: transactionData.devise
        });
      }

      return { data, message: 'Transaction créée avec succès' };
    } catch (error: any) {
      console.error('Erreur détaillée lors de la création de transaction:', error);
      return { error: error.message || 'Erreur lors de la création de la transaction' };
    }
  }

  async updateTransaction(id: string, updateData: UpdateTransactionData): Promise<ApiResponse<Transaction>> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          ...updateData,
          date_validation: updateData.statut === 'Servi' ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('Modification transaction', 'Transaction', id, updateData);

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

  private async updateClientTotal(clientId: string, amount: number): Promise<void> {
    try {
      const { data: client } = await this.getClientById(clientId);
      if (client) {
        await supabase
          .from('clients')
          .update({
            total_paye: client.total_paye + amount,
            updated_at: new Date().toISOString()
          })
          .eq('id', clientId);
      }
    } catch (error) {
      console.error('Error updating client total:', error);
    }
  }

  // ===== SETTINGS =====
  
  async getSettings(categorie?: string): Promise<ApiResponse<Setting[]>> {
    try {
      let query = supabase
        .from('settings')
        .select('*')
        .order('cle');

      if (categorie) {
        query = query.eq('categorie', categorie);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching settings:', error);
        throw error;
      }

      return { data: data || [] };
    } catch (error: any) {
      console.error('Settings fetch error:', error);
      return { error: error.message };
    }
  }

  async getExchangeRates(): Promise<ApiResponse<ExchangeRates>> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('cle, valeur')
        .eq('categorie', 'taux_change');

      if (error) {
        console.error('Error fetching exchange rates:', error);
        throw error;
      }

      const rates = data?.reduce((acc, setting) => {
        acc[setting.cle as keyof Omit<ExchangeRates, 'lastUpdated'>] = parseFloat(setting.valeur);
        return acc;
      }, {} as any);

      return {
        data: {
          usdToCny: rates?.usdToCny || 7.25,
          usdToCdf: rates?.usdToCdf || 2850,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error: any) {
      console.error('Exchange rates error:', error);
      return { error: error.message };
    }
  }

  async getFees(): Promise<ApiResponse<Fees>> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('cle, valeur')
        .eq('categorie', 'frais');

      if (error) {
        console.error('Error fetching fees:', error);
        throw error;
      }

      const fees = data?.reduce((acc, setting) => {
        acc[setting.cle as keyof Fees] = parseFloat(setting.valeur);
        return acc;
      }, {} as any);

      return {
        data: {
          transfert: fees?.transfert || 5,
          commande: fees?.commande || 10,
          partenaire: fees?.partenaire || 3
        }
      };
    } catch (error: any) {
      console.error('Fees error:', error);
      return { error: error.message };
    }
  }

  async updateSetting(categorie: string, settings: Record<string, string>): Promise<ApiResponse<Setting[]>> {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return { error: 'Utilisateur non authentifié' };
      }

      const updates = Object.entries(settings).map(([cle, valeur]) => ({
        categorie,
        cle,
        valeur,
        updated_at: new Date().toISOString()
      }));

      const { data, error } = await supabase
        .from('settings')
        .upsert(updates, { onConflict: 'categorie,cle' })
        .select();

      if (error) throw error;

      await this.logActivity('Modification paramètres', 'Settings', undefined, { categorie, settings });

      return { data: data || [], message: 'Paramètres mis à jour avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // ===== PAYMENT METHODS =====
  
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
        .insert(methodData)
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('Création mode de paiement', 'PaymentMethod', data.id, { name: methodData.name });

      return { data, message: 'Mode de paiement créé avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async updatePaymentMethod(id: string, methodData: Partial<PaymentMethod>): Promise<ApiResponse<PaymentMethod>> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .update({
          ...methodData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('Modification mode de paiement', 'PaymentMethod', id, methodData);

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

  async togglePaymentMethod(id: string, isActive: boolean): Promise<ApiResponse<PaymentMethod>> {
    try {
      const { data, error } = await supabase
        .from('payment_methods')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await this.logActivity(
        isActive ? 'Activation mode de paiement' : 'Désactivation mode de paiement', 
        'PaymentMethod', 
        id
      );

      return { data, message: `Mode de paiement ${isActive ? 'activé' : 'désactivé'} avec succès` };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // ===== USER PROFILES =====
  
  async getUserProfiles(): Promise<ApiResponse<UserProfile[]>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          user:auth.users(email, created_at)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data: (data as any) || [] };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async createUserProfile(profileData: Omit<UserProfile, 'id' | 'created_at' | 'updated_at'>): Promise<ApiResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('Création profil utilisateur', 'UserProfile', data.id, { 
        full_name: profileData.full_name,
        role: profileData.role
      });

      return { data, message: 'Profil utilisateur créé avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async updateUserProfile(id: string, profileData: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await this.logActivity('Modification profil utilisateur', 'UserProfile', id, profileData);

      return { data, message: 'Profil utilisateur mis à jour avec succès' };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async toggleUserProfile(id: string, isActive: boolean): Promise<ApiResponse<UserProfile>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      await this.logActivity(
        isActive ? 'Activation utilisateur' : 'Désactivation utilisateur', 
        'UserProfile', 
        id
      );

      return { data, message: `Utilisateur ${isActive ? 'activé' : 'désactivé'} avec succès` };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // ===== ACTIVITY LOGS =====
  
  async getActivityLogs(page: number = 1, pageSize: number = 10): Promise<ApiResponse<PaginatedResponse<ActivityLog & { user: { email: string } }>>> {
    try {
      const { data, error, count } = await supabase
        .from('activity_logs')
        .select(`
          *,
          user:auth.users(email)
        `, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (error) throw error;

      const totalPages = count ? Math.ceil(count / pageSize) : 0;

      return {
        data: {
          data: (data as any) || [],
          count: count || 0,
          page,
          pageSize,
          totalPages
        }
      };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async logActivity(action: string, entityType?: string, entityId?: string, details?: Record<string, any>): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      await supabase
        .from('activity_logs')
        .insert({
          user_id: user.id,
          action,
          entity_type: entityType,
          entity_id: entityId,
          details,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  }

  // ===== DASHBOARD STATS =====
  
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    try {
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('montant, devise, benefice, created_at');

      if (txError) throw txError;

      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      const totalUSD = transactions?.filter(t => t.devise === 'USD').reduce((sum, t) => sum + t.montant, 0) || 0;
      const totalCDF = transactions?.filter(t => t.devise === 'CDF').reduce((sum, t) => sum + t.montant, 0) || 0;
      const beneficeNet = transactions?.reduce((sum, t) => sum + t.benefice, 0) || 0;
      
      const { data: rates } = await this.getExchangeRates();
      const totalCNY = (totalUSD / rates?.usdToCny) || 0;

      const today = new Date().toISOString().split('T')[0];
      const todayTransactions = transactions?.filter(t => 
        t.created_at.startsWith(today)
      ).length || 0;

      const thisMonth = new Date().toISOString().slice(0, 7);
      const monthlyRevenue = transactions?.filter(t => 
        t.created_at.startsWith(thisMonth) && t.devise === 'USD'
      ).reduce((sum, t) => sum + t.montant, 0) || 0;

      return {
        data: {
          totalUSD,
          totalCDF,
          totalCNY,
          beneficeNet,
          transactionsCount: transactions?.length || 0,
          clientsCount: clientsCount || 0,
          todayTransactions,
          monthlyRevenue
        }
      };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async getRecentTransactions(limit: number = 5): Promise<ApiResponse<(Transaction & { client: Client })[]>> {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          client:clients(id, nom, telephone, ville)
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return { data: (data as any) || [] };
    } catch (error: any) {
      return { error: error.message };
    }
  }
}

export const supabaseService = new SupabaseService();