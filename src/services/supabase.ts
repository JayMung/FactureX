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

  async getUserProfiles(): Promise<ApiResponse<(UserProfile & { user: { email: string } })[]>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          user:auth.users!user_profiles_user_id_fkey(email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  async getActivityLogs(page: number = 1, pageSize: number = 10): Promise<ApiResponse<PaginatedResponse<ActivityLog & { user: { email: string } }>>> {
    try {
      const { data, error, count } = await supabase
        .from('activity_logs')
        .select(`
          *,
          user:auth.users!activity_logs_user_id_fkey(email)
        `, { count: 'exact' })
        .range((page - 1) * pageSize, page * pageSize - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const result: PaginatedResponse<ActivityLog & { user: { email: string } }> = {
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
        monthlyRevenue: totalUSD * 0.05 // Estimation
      };

      return { data: stats };
    } catch (error: any) {
      return { error: error.message };
    }
  }