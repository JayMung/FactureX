// User Profiles
  async getUserProfiles(): Promise<ApiResponse<(UserProfile & { user: { email: string } })[]>> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(`
          *,
          user:auth.users(email)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data: data || [] };
    } catch (error: any) {
      return { error: error.message };
    }
  }

  // Activity Logs
  async getActivityLogs(page: number = 1, pageSize: number = 10): Promise<ApiResponse<PaginatedResponse<ActivityLog & { user: { email: string } }>>> {
    try {
      const { data, error, count } = await supabase
        .from('activity_logs')
        .select(`
          *,
          user:auth.users(email)
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