import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  TransactionApproval,
  WorkflowRule,
  ApprovalNotification
} from '@/types';

// Hook principal pour le workflow d'approbation
export const useApprovalWorkflow = () => {
  const queryClient = useQueryClient();

  // Récupérer les approbations en attente
  const usePendingApprovals = () => {
    return useQuery({
      queryKey: ['pending-approvals'],
      queryFn: async () => {
        const { data, error } = await supabase.rpc('get_pending_approvals');

        if (error) throw error;
        return data as TransactionApproval[];
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
      refetchInterval: 5 * 60 * 1000, // Rafraîchir toutes les 5 minutes
    });
  };

  // Approuver une transaction
  const approveTransaction = useMutation({
    mutationFn: async ({
      transactionId,
      approvalLevel = 1,
      notes
    }: {
      transactionId: string;
      approvalLevel?: number;
      notes?: string;
    }) => {
      const { data, error } = await supabase.rpc('approve_transaction', {
        p_transaction_id: transactionId,
        p_approval_level: approvalLevel,
        p_notes: notes || null
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      toast.success('Transaction approuvée avec succès');
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      // Rafraîchir les détails de la transaction
      const transactionId = (result as any)?.transaction_id;
      if (transactionId) {
        queryClient.invalidateQueries({ queryKey: ['transactions', transactionId] });
      }
    },
    onError: (error: any) => {
      console.error('Erreur approbation transaction:', error);
      toast.error('Erreur lors de l\'approbation', {
        description: error.message || 'Veuillez réessayer'
      });
    }
  });

  // Rejeter une transaction
  const rejectTransaction = useMutation({
    mutationFn: async ({
      transactionId,
      approvalLevel = 1,
      rejectionReason
    }: {
      transactionId: string;
      approvalLevel?: number;
      rejectionReason: string;
    }) => {
      const { data, error } = await supabase.rpc('reject_transaction', {
        p_transaction_id: transactionId,
        p_approval_level: approvalLevel,
        p_rejection_reason: rejectionReason
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (result) => {
      toast.success('Transaction rejetée');
      queryClient.invalidateQueries({ queryKey: ['pending-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      const transactionId = (result as any)?.transaction_id;
      if (transactionId) {
        queryClient.invalidateQueries({ queryKey: ['transactions', transactionId] });
      }
    },
    onError: (error: any) => {
      console.error('Erreur rejet transaction:', error);
      toast.error('Erreur lors du rejet', {
        description: error.message || 'Veuillez réessayer'
      });
    }
  });

  // Configurer les règles de workflow
  const configureWorkflowRule = useMutation({
    mutationFn: async ({
      ruleName,
      minAmount,
      maxAmount,
      requiredLevels = 1,
      approversPerLevel = [1]
    }: {
      ruleName: string;
      minAmount?: number;
      maxAmount?: number;
      requiredLevels?: number;
      approversPerLevel?: number[];
    }) => {
      const { data, error } = await supabase.rpc('configure_workflow_rule', {
        p_rule_name: ruleName,
        p_min_amount: minAmount || null,
        p_max_amount: maxAmount || null,
        p_required_levels: requiredLevels,
        p_approvers_per_level: approversPerLevel
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Règle de workflow configurée avec succès');
      queryClient.invalidateQueries({ queryKey: ['workflow-rules'] });
    },
    onError: (error: any) => {
      console.error('Erreur configuration règle:', error);
      toast.error('Erreur lors de la configuration', {
        description: error.message || 'Veuillez réessayer'
      });
    }
  });

  // Récupérer les règles de workflow
  const useWorkflowRules = () => {
    return useQuery({
      queryKey: ['workflow-rules'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('workflow_rules')
          .select('*')
          .order('priority', { ascending: false });

        if (error) throw error;
        return data as WorkflowRule[];
      },
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  };

  // Récupérer les notifications d'approbation
  const useApprovalNotifications = () => {
    return useQuery({
      queryKey: ['approval-notifications'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('approval_notifications')
          .select('*')
          .eq('recipient_id', (await supabase.auth.getUser()).data.user?.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        return data as ApprovalNotification[];
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Marquer une notification comme lue
  const markNotificationAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { data, error } = await supabase
        .from('approval_notifications')
        .update({ 
          is_read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approval-notifications'] });
    },
    onError: (error: any) => {
      console.error('Erreur marquage notification:', error);
    }
  });

  // Statistiques du workflow
  const useWorkflowStats = () => {
    return useQuery({
      queryKey: ['workflow-stats'],
      queryFn: async () => {
        const { data: pending, error: pendingError } = await supabase.rpc('get_pending_approvals');
        const { data: rules, error: rulesError } = await supabase
          .from('workflow_rules')
          .select('required_levels, approvers_per_level');

        if (pendingError) throw pendingError;
        if (rulesError) throw rulesError;

        const stats = {
          pendingApprovals: pending?.length || 0,
          totalRules: rules?.length || 0,
          autoApprovalRules: rules?.filter(r => r.required_levels === 0).length || 0,
          singleApprovalRules: rules?.filter(r => r.required_levels === 1).length || 0,
          multiApprovalRules: rules?.filter(r => r.required_levels > 1).length || 0,
        };

        return stats;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Obtenir le workflow requis pour un montant
  const getRequiredWorkflow = async (amount: number) => {
    const { data: user } = await supabase.auth.getUser();
    if (!user.data.user?.id) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('organization_id')
      .eq('id', user.data.user.id)
      .single();

    if (!profile?.organization_id) return null;

    const { data, error } = await supabase.rpc('get_required_workflow', {
      p_transaction_amount: amount,
      p_organization_id: profile.organization_id
    });

    if (error) throw error;
    return data;
  };

  return {
    usePendingApprovals,
    approveTransaction,
    rejectTransaction,
    configureWorkflowRule,
    useWorkflowRules,
    useApprovalNotifications,
    markNotificationAsRead,
    useWorkflowStats,
    getRequiredWorkflow,
  };
};

// Hook pour les actions d'approbation individuelles
export const useTransactionApproval = (transactionId: string) => {
  const { approveTransaction, rejectTransaction } = useApprovalWorkflow();

  const approve = (notes?: string) => {
    return approveTransaction.mutateAsync({
      transactionId,
      notes
    });
  };

  const reject = (rejectionReason: string) => {
    return rejectTransaction.mutateAsync({
      transactionId,
      rejectionReason
    });
  };

  return {
    approve,
    reject,
    isApproving: approveTransaction.isPending,
    isRejecting: rejectTransaction.isPending,
  };
};
