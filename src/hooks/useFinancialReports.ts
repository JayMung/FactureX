import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  FinancialReport,
  FinancialReportRequest,
  CashFlowReport,
  ProfitabilityReport,
  DiscrepanciesReport,
  ReportDownloadInfo
} from '@/types';

// Types de retour pour les rapports
type ReportData = CashFlowReport | ProfitabilityReport | DiscrepanciesReport;

// Hook principal pour les rapports financiers
export const useFinancialReports = () => {
  const queryClient = useQueryClient();

  // Récupérer tous les rapports de l'organisation
  const useReportsList = () => {
    return useQuery({
      queryKey: ['financial-reports'],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('financial_reports')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data as FinancialReport[];
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  // Récupérer un rapport par son ID
  const useReport = (reportId: string) => {
    return useQuery({
      queryKey: ['financial-reports', reportId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('financial_reports')
          .select('*')
          .eq('id', reportId)
          .single();

        if (error) throw error;
        return data as FinancialReport;
      },
      enabled: !!reportId,
      staleTime: 10 * 60 * 1000, // 10 minutes
    });
  };

  // Générer un rapport
  const generateReport = useMutation({
    mutationFn: async (request: FinancialReportRequest) => {
      const { data, error } = await supabase.rpc('generate_financial_report', {
        p_report_type: request.report_type,
        p_date_range_start: request.date_range_start,
        p_date_range_end: request.date_range_end,
        p_parameters: request.parameters || {}
      });

      if (error) throw error;
      return data as string; // UUID du rapport
    },
    onSuccess: (reportId) => {
      toast.success('Rapport généré avec succès');
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
      
      // Rafraîchir le statut du rapport après 2 secondes
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['financial-reports', reportId] });
      }, 2000);
    },
    onError: (error: any) => {
      console.error('Erreur génération rapport:', error);
      toast.error('Erreur lors de la génération du rapport', {
        description: error.message || 'Veuillez réessayer'
      });
    }
  });

  // Télécharger un rapport
  const downloadReport = useMutation({
    mutationFn: async (reportId: string) => {
      const { data, error } = await supabase.rpc('download_financial_report', {
        p_report_id: reportId
      });

      if (error) throw error;
      return data as ReportDownloadInfo;
    },
    onSuccess: (downloadInfo) => {
      toast.success('Téléchargement du rapport initié');
      
      // Simuler le téléchargement du fichier
      const link = document.createElement('a');
      link.href = downloadInfo.file_path;
      link.download = `${downloadInfo.title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Mettre à jour la liste des rapports
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
    },
    onError: (error: any) => {
      console.error('Erreur téléchargement rapport:', error);
      toast.error('Erreur lors du téléchargement', {
        description: error.message || 'Veuillez réessayer'
      });
    }
  });

  // Supprimer un rapport
  const deleteReport = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from('financial_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;
      return reportId;
    },
    onSuccess: () => {
      toast.success('Rapport supprimé avec succès');
      queryClient.invalidateQueries({ queryKey: ['financial-reports'] });
    },
    onError: (error: any) => {
      console.error('Erreur suppression rapport:', error);
      toast.error('Erreur lors de la suppression', {
        description: error.message || 'Veuillez réessayer'
      });
    }
  });

  // Obtenir les données d'un rapport spécifique
  const useReportData = (reportId: string) => {
    return useQuery({
      queryKey: ['financial-reports-data', reportId],
      queryFn: async () => {
        const { data: report, error: reportError } = await supabase
          .from('financial_reports')
          .select('*')
          .eq('id', reportId)
          .single();

        if (reportError) throw reportError;

        let reportData: ReportData;

        // Appeler la fonction RPC appropriée selon le type
        switch (report.report_type) {
          case 'cash_flow':
            const { data: cashFlowData, error: cashFlowError } = await supabase.rpc('generate_cash_flow_report', {
              p_org_id: report.organization_id,
              p_date_start: report.date_range_start,
              p_date_end: report.date_range_end
            });
            if (cashFlowError) throw cashFlowError;
            reportData = cashFlowData as CashFlowReport;
            break;

          case 'profitability':
            const { data: profitabilityData, error: profitabilityError } = await supabase.rpc('generate_profitability_report', {
              p_org_id: report.organization_id,
              p_date_start: report.date_range_start,
              p_date_end: report.date_range_end
            });
            if (profitabilityError) throw profitabilityError;
            reportData = profitabilityData as ProfitabilityReport;
            break;

          case 'discrepancies':
            const { data: discrepanciesData, error: discrepanciesError } = await supabase.rpc('generate_discrepancies_report', {
              p_org_id: report.organization_id,
              p_date_start: report.date_range_start,
              p_date_end: report.date_range_end
            });
            if (discrepanciesError) throw discrepanciesError;
            reportData = discrepanciesData as DiscrepanciesReport;
            break;

          default:
            throw new Error('Type de rapport non supporté');
        }

        return {
          report: report as FinancialReport,
          data: reportData
        };
      },
      enabled: !!reportId,
      staleTime: 15 * 60 * 1000, // 15 minutes
    });
  };

  // Statistiques des rapports
  const useReportsStats = () => {
    return useQuery({
      queryKey: ['financial-reports-stats'],
      queryFn: async () => {
        const { data: reports, error } = await supabase
          .from('financial_reports')
          .select('status, report_type, download_count, file_size');

        if (error) throw error;

        const stats = {
          total: reports?.length || 0,
          completed: reports?.filter(r => r.status === 'completed').length || 0,
          pending: reports?.filter(r => r.status === 'pending').length || 0,
          failed: reports?.filter(r => r.status === 'failed').length || 0,
          byType: {
            cash_flow: reports?.filter(r => r.report_type === 'cash_flow').length || 0,
            profitability: reports?.filter(r => r.report_type === 'profitability').length || 0,
            discrepancies: reports?.filter(r => r.report_type === 'discrepancies').length || 0,
          },
          totalDownloads: reports?.reduce((sum, r) => sum + (r.download_count || 0), 0) || 0,
          totalSize: reports?.reduce((sum, r) => sum + (r.file_size || 0), 0) || 0,
        };

        return stats;
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    });
  };

  return {
    useReportsList,
    useReport,
    useReportData,
    useReportsStats,
    generateReport,
    downloadReport,
    deleteReport,
  };
};

// Hook pour la génération de rapports (utilisé dans les formulaires)
export const useReportGeneration = () => {
  const { generateReport } = useFinancialReports();

  const generateCashFlowReport = (startDate: string, endDate: string) => {
    return generateReport.mutateAsync({
      report_type: 'cash_flow',
      date_range_start: startDate,
      date_range_end: endDate,
      parameters: {}
    });
  };

  const generateProfitabilityReport = (startDate: string, endDate: string) => {
    return generateReport.mutateAsync({
      report_type: 'profitability',
      date_range_start: startDate,
      date_range_end: endDate,
      parameters: {}
    });
  };

  const generateDiscrepanciesReport = (startDate: string, endDate: string) => {
    return generateReport.mutateAsync({
      report_type: 'discrepancies',
      date_range_start: startDate,
      date_range_end: endDate,
      parameters: {}
    });
  };

  return {
    generateCashFlowReport,
    generateProfitabilityReport,
    generateDiscrepanciesReport,
    isGenerating: generateReport.isPending,
  };
};
