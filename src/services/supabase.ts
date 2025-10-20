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

      // Appliquer les filtres
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

      // Logger l'activité
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

      // Logger l'activité
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

      // Logger l'activité
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

      // Appliquer les filtres
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
      // Récupérer les taux de change actuels
      const { data: settings } = await this.getExchangeRates();
      
      // Calculer les montants
      const tauxUsdCny = settings?.usdToCny || 7.25;
      const tauxUsdCdf = settings?.usdToCdf || 2850;
      
      let montantEnUSD = transactionData.montant;
      if (transactionData.devise === 'CDF') {
        montantEnUSD = transactionData.montant / tauxUsdCdf;
      }
      
      // Calculer les frais (5% pour transfert, 10% pour commande)
      const fraisPercentage = transactionData.motif === 'Commande' ? 0.10 : 0.05;
      const frais = montantEnUSD * fraisPercentage;
      
      // Calculer le montant en CNY
      const montantCny = (montantEnUSD - frais) * tauxUsdCny;
      
      // Calculer le bénéfice
      const benefice = frais * 0.6; // 60% pour l'entreprise, 40% pour le partenaire

      const { data, error } = await supabase
        .from('transactions')
        .insert({
          ...transactionData,
          frais,
          taux_usd_cny: tauxUsdCny,
          taux_usd_cdf: tauxUsdCdf,
          benefice,
          montant_cny: montantCny,
          statut: transactionData.statut || 'En attente',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          date_paiement: transactionData.date_paiement || new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Mettre à jour le total payé du client
      await this.updateClientTotal(transactionData.client_id, montantEnUSD);

      // Logger l'activité
      await this.logActivity('Création transaction', 'Transaction', data.id, { 
        reference: transactionData.reference,
        montant: transactionData.montant,
        devise: transactionData.devise
      });

      return { data, message: 'Transaction créée avec succès' };
    } catch (error: any) {
      return { error: error.message };
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

      // Logger l'activité
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

      // Logger l'activité
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
      console.log('Updating settings:', { categorie, settings });
      
      // Vérifier si l'utilisateur est authentifié
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('Auth error:', authError);
        return { error: 'Utilisateur non authentifié' };
      }

      console.log('User authenticated:', user.email);
      console.log('User metadata:', user.user_metadata);
      console.log('App metadata:', user.app_metadata);

      // Pour le développement, permettre à tous les utilisateurs authentifiés
      // Plus tard, vous pourrez décommenter la vérification du rôle admin
      /*
      const userRole = user.user_metadata?.role || user.app_metadata?.role;
      if (userRole !== 'admin') {
        return { error: 'Permissions insuffisantes. Seul un administrateur peut modifier les paramètres.' };
      }
      */

      const updates = Object.entries(settings).map(([cle, valeur]) => ({
        categorie,
        cle,
        valeur,
        updated_at: new Date().toISOString()
      }));

      console.log('Updates to apply:', updates);

      const { data, error } = await supabase
        .from('settings')
        .upsert(updates, { onConflict: 'categorie,cle' })
        .select();

      if (error) {
        console.error('Supabase upsert error:', error);
        throw error;
      }

      console.log('Settings updated successfully:', data);

      // Logger l'activité
      await this.logActivity('Modification paramètres', 'Settings', undefined, { categorie, settings });

      return { data: data || [], message: 'Paramètres mis à jour avec succès' };
    } catch (error: any) {
      console.error('Update setting error:', error);
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

      // Logger l'activité
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

      // Logger l'activité
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

      // Logger l'activité
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

      // Logger l'activité
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

      // Logger l'activité
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

      // Logger l'activité
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

      // Logger l'activité
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
      // Get transactions stats
      const { data: transactions, error: txError } = await supabase
        .from('transactions')
        .select('montant, devise, benefice, created_at');

      if (txError) throw txError;

      // Get clients count
      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Calculate stats
      const totalUSD = transactions?.filter(t => t.devise === 'USD').reduce((sum, t) => sum + t.montant, 0) || 0;
      const totalCDF = transactions?.filter(t => t.devise === 'CDF').reduce((sum, t) => sum + t.montant, 0) || 0;
      const beneficeNet = transactions?.reduce((sum, t) => sum + t.benefice, 0) || 0;
      
      // Get exchange rates for CNY conversion
      const { data: rates } = await this.getExchangeRates();
      const totalCNY = (totalUSD / rates?.usdToCny) || 0;

      // Today's transactions
      const today = new Date().toISOString().split('T')[0];
      const todayTransactions = transactions?.filter(t => 
        t.created_at.startsWith(today)
      ).length || 0;

      // Monthly revenue
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