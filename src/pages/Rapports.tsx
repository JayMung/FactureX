import { useState, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { usePageSetup } from '@/hooks/use-page-setup';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
    FileText,
    Download,
    Eye,
    TrendingUp,
    TrendingDown,
    DollarSign,
    PieChart,
    Loader2
} from 'lucide-react';
import { ReportService, ReportData } from '@/services/reportService';
import { format, startOfMonth } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { UnifiedDataTable } from '@/components/ui/unified-data-table';
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
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [generatingPreview, setGeneratingPreview] = useState(false);


    const fetchReport = async () => {
        if (startDate > endDate) {
            toast.error('La date de début doit être antérieure à la date de fin');
            return;
        }
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

    const handlePreviewPDF = async () => {
        if (!data) return;
        setGeneratingPreview(true);
        const toastId = toast.loading('Préparation de la prévisualisation...');
        try {
            const blob = await ReportService.generatePDFBlob(
                new Date(startDate),
                new Date(endDate),
                data.period,
                data.summary
            );
            if (pdfUrl) URL.revokeObjectURL(pdfUrl);
            const url = URL.createObjectURL(blob);
            setPdfUrl(url);
            setPreviewOpen(true);
            toast.success('Prévisualisation prête', { id: toastId });
        } catch (error) {
            console.error('Preview error:', error);
            toast.error('Prévisualisation non disponible — téléchargez le PDF', { id: toastId });
        } finally {
            setGeneratingPreview(false);
        }
    };

    const handleClosePreview = () => {
        setPreviewOpen(false);
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
                                min={startDate}
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

                    <Card className="border-purple-100 dark:border-purple-900 bg-purple-50/30 dark:bg-purple-950/20">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-300">Solde Net (USD)</CardTitle>
                                <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-full">
                                    <DollarSign className="h-4 w-4 text-purple-600" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? <Skeleton className="h-8 w-24" /> : (
                                <div className={`text-2xl font-bold ${
                                    (data?.summary.netProfit ?? 0) >= 0
                                        ? 'text-emerald-700 dark:text-emerald-300'
                                        : 'text-red-700 dark:text-red-300'
                                }`}>
                                    {data?.summary.netProfit.toFixed(2)} $
                                </div>
                            )}
                            <p className="mt-2 text-xs text-purple-600 dark:text-purple-400">Recettes − Dépenses (USD)</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-3 flex-wrap">
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
                        variant="outline"
                        onClick={handlePreviewPDF}
                        disabled={!data || loading || generatingPreview}
                        className="flex items-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                    >
                        {generatingPreview ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Eye className="h-4 w-4" />
                        )}
                        {generatingPreview ? 'Chargement...' : 'Prévisualiser'}
                    </Button>
                    <Button
                        onClick={handleExportPDF}
                        disabled={!data || loading || exporting}
                        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        <FileText className="h-4 w-4" />
                        {exporting ? 'Génération...' : 'Télécharger PDF'}
                    </Button>
                </div>

                {/* PDF Preview Dialog */}
                <Dialog open={previewOpen} onOpenChange={(open) => { if (!open) handleClosePreview(); }}>
                    <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0 gap-0">
                        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
                            <div className="flex items-center justify-between">
                                <DialogTitle className="flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-emerald-600" />
                                    Rapport Financier — {startDate} au {endDate}
                                </DialogTitle>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        onClick={handleExportPDF}
                                        disabled={exporting}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                                    >
                                        <Download className="h-3.5 w-3.5 mr-1" />
                                        Télécharger
                                    </Button>
                                </div>
                            </div>
                        </DialogHeader>
                        <div className="flex-1 overflow-hidden">
                            {pdfUrl ? (
                                <iframe
                                    src={pdfUrl}
                                    className="w-full h-full border-0"
                                    title="Prévisualisation du rapport PDF"
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-gray-400">
                                    Chargement de la prévisualisation...
                                </div>
                            )}
                        </div>
                    </DialogContent>
                </Dialog>

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
                                    render: (val) => {
                                        const label = val === 'revenue' ? 'RECETTE'
                                            : (val === 'depense' || val === 'expense') ? 'DÉPENSE'
                                            : (val === 'transfert' || val === 'swap') ? 'TRANSFERT'
                                            : val?.toUpperCase();
                                        const cls = val === 'revenue'
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : (val === 'depense' || val === 'expense')
                                            ? 'bg-red-100 text-red-700'
                                            : 'bg-blue-100 text-blue-700';
                                        return (
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${cls}`}>
                                                {label}
                                            </span>
                                        );
                                    }
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
