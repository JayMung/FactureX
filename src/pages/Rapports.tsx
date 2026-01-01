import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { usePageSetup } from '@/hooks/use-page-setup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    FileText,
    Download,
    Calendar as CalendarIcon,
    TrendingUp,
    TrendingDown,
    DollarSign,
    PieChart
} from 'lucide-react';
import { ReportService, ReportData } from '@/services/reportService';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { UnifiedDataTable, type TableColumn } from '@/components/ui/unified-data-table';
import Pagination from '@/components/ui/pagination-custom';

const Rapports = () => {
    usePageSetup({
        title: 'Rapports Financiers',
        subtitle: 'Générez des bilans et exportez vos données'
    });

    const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;


    const fetchReport = async () => {
        setLoading(true);
        try {
            const report = await ReportService.getFinancialReport(
                new Date(startDate),
                new Date(endDate),
                currentPage,
                pageSize
            );
            setData(report);
        } catch (error) {
            console.error('Error fetching report:', error);
            toast.error('Erreur lors de la génération du rapport');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReport();
    }, [startDate, endDate, currentPage]);

    const handleRefresh = () => {
        setCurrentPage(1);
        fetchReport();
    };


    const handleExportPDF = async () => {
        if (!data) return;
        setExporting(true);
        const toastId = toast.loading('Génération du PDF en cours...');
        try {
            await ReportService.exportToPDF(
                new Date(startDate),
                new Date(endDate),
                data.period,
                data.summary,
                `Rapport_Financier_${startDate}_${endDate}`
            );
            toast.success('Rapport PDF généré', { id: toastId });
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Erreur lors de la génération du PDF', { id: toastId });
        } finally {
            setExporting(false);
        }
    };

    const handleExportExcel = () => {
        if (!data) return;
        ReportService.exportToExcel(data, `Rapport_Financier_${startDate}_${endDate}`);
        toast.success('Rapport Excel généré');
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="hidden">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Rapports Financiers</h1>
                        <p className="text-gray-500 dark:text-gray-400">Générez des bilans et exportez vos données</p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500">Du</span>
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-40"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-500">Au</span>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-40"
                            />
                        </div>
                        <Button onClick={handleRefresh} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                            Rafraîchir
                        </Button>
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <Card className="border-emerald-100 dark:border-emerald-900 bg-emerald-50/30 dark:bg-emerald-950/20">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-sm font-medium text-emerald-800 dark:text-emerald-300">Recettes Totales (USD)</CardTitle>
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-full">
                                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? <Skeleton className="h-8 w-24" /> : (
                                <div className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                                    {data?.summary.totalRevenue.usd.toFixed(2)} $
                                </div>
                            )}
                            <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 flex flex-col gap-1">
                                <span>{data?.summary.totalRevenue.cdf.toLocaleString()} CDF</span>
                                <span>{data?.summary.totalRevenue.cny.toFixed(2)} CNY</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-red-100 dark:border-red-900 bg-red-50/30 dark:bg-red-950/20">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-sm font-medium text-red-800 dark:text-red-300">Dépenses Totales (USD)</CardTitle>
                                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-full">
                                    <TrendingDown className="h-4 w-4 text-red-600" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? <Skeleton className="h-8 w-24" /> : (
                                <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                                    {data?.summary.totalExpense.usd.toFixed(2)} $
                                </div>
                            )}
                            <div className="mt-2 text-xs text-red-600 dark:text-red-400 flex flex-col gap-1">
                                <span>{data?.summary.totalExpense.cdf.toLocaleString()} CDF</span>
                                <span>{data?.summary.totalExpense.cny.toFixed(2)} CNY</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-blue-100 dark:border-blue-900 bg-blue-50/30 dark:bg-blue-950/20">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-300">Volume d'activité</CardTitle>
                                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-full">
                                    <PieChart className="h-4 w-4 text-blue-600" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? <Skeleton className="h-8 w-24" /> : (
                                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                                    {data?.summary.transactionCount}
                                </div>
                            )}
                            <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">Transactions enregistrées</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={handleExportExcel}
                        disabled={!data || loading}
                        className="flex items-center gap-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                    >
                        <Download className="h-4 w-4" />
                        Exporter Excel
                    </Button>
                    <Button
                        onClick={handleExportPDF}
                        disabled={!data || loading || exporting}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        <FileText className="h-4 w-4" />
                        {exporting ? 'Génération...' : 'Générer PDF'}
                    </Button>
                </div>

                {/* Details Table with Pagination */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Détails des transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <UnifiedDataTable
                            data={data?.details || []}
                            loading={loading}
                            columns={[
                                {
                                    key: 'created_at',
                                    title: 'Date',
                                    render: (val) => format(new Date(val), 'dd/MM/yyyy')
                                },
                                {
                                    key: 'type_transaction',
                                    title: 'Type',
                                    render: (val) => (
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${val === 'revenue'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-red-100 text-red-700'
                                            }`}>
                                            {val}
                                        </span>
                                    )
                                },
                                {
                                    key: 'client',
                                    title: 'Client',
                                    render: (_, item) => item.client?.nom || '-'
                                },
                                {
                                    key: 'motif',
                                    title: 'Motif',
                                    className: 'max-w-[200px] truncate'
                                },
                                {
                                    key: 'montant',
                                    title: 'Montant',
                                    align: 'right',
                                    render: (val, item) => (
                                        <span className="font-bold">
                                            {val} {item.devise}
                                        </span>
                                    )
                                }
                            ]}
                        />

                        {data && data.summary.transactionCount > pageSize && (
                            <div className="mt-4 flex justify-end">
                                <Pagination
                                    currentPage={currentPage}
                                    totalPages={Math.ceil(data.summary.transactionCount / pageSize)}
                                    onPageChange={setCurrentPage}
                                />
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
};

export default Rapports;
