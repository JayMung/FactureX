import React, { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
    BarChart3,
    TrendingUp,
    TrendingDown,
    DollarSign,
    ArrowRightLeft,
    Calendar,
    Download,
    FileText,
    Activity,
    CheckCircle,
    ExternalLink,
    Eye
} from 'lucide-react';
import { useFinanceStatsByPeriod, PeriodFilter } from '@/hooks/useFinanceStatsByPeriod';
import { generateFinanceReportPDF } from '@/utils/financeReportPdfGenerator';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

const periodOptions: { value: PeriodFilter; label: string }[] = [
    { value: 'day', label: 'Journalier' },
    { value: 'week', label: 'Hebdomadaire' },
    { value: 'month', label: 'Mensuel' },
    { value: 'year', label: 'Annuel' }
];

const getPeriodTitle = (period: PeriodFilter): string => {
    switch (period) {
        case 'day': return 'Journalier';
        case 'week': return 'Hebdomadaire';
        case 'month': return 'Mensuel';
        case 'year': return 'Annuel';
        default: return '';
    }
};

const FinanceStatisticsPage: React.FC = () => {
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('month');
    const { stats, transactions, isLoading, periodLabel, dateRange } = useFinanceStatsByPeriod(selectedPeriod);

    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    };

    const exportReport = async () => {
        if (!stats || !dateRange) {
            toast.error('Données non disponibles pour l\'export');
            return;
        }

        setGeneratingPDF(true);
        try {
            const pdfBlob = await generateFinanceReportPDF({
                period: selectedPeriod,
                periodLabel: periodLabel || '',
                dateStart: dateRange.start,
                dateEnd: dateRange.end,
                totalRevenue: stats.totalRevenue,
                totalDepenses: stats.totalDepenses,
                totalTransferts: stats.totalTransferts,
                soldeNet: stats.soldeNet,
                revenueChange: stats.revenueChange,
                depensesChange: stats.depensesChange,
                transactionsCount: stats.transactionsCount,
                transactions: transactions
            }, true);

            if (pdfBlob instanceof Blob) {
                const url = URL.createObjectURL(pdfBlob);
                setPdfUrl(url);
                setPdfDialogOpen(true);
                toast.success('PDF généré avec succès');
            }
        } catch (error) {
            toast.error('Erreur lors de la génération du PDF');
            console.error(error);
        } finally {
            setGeneratingPDF(false);
        }
    };

    const handleDownloadPDF = () => {
        if (!pdfUrl) return;

        const periodName = getPeriodTitle(selectedPeriod);
        const dateStr = format(new Date(), 'yyyy-MM-dd');
        const fileName = `Rapport_${periodName}_${dateStr}.pdf`;

        const link = document.createElement('a');
        link.href = pdfUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('PDF téléchargé');
    };

    const handleClosePdfDialog = () => {
        setPdfDialogOpen(false);
        if (pdfUrl) {
            URL.revokeObjectURL(pdfUrl);
            setPdfUrl(null);
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                            Statistiques Financières
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                            Vue d'ensemble des revenus, dépenses et transferts
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-sm">
                            <Calendar className="h-3 w-3 mr-1" />
                            {periodLabel}
                        </Badge>
                        <Button
                            onClick={exportReport}
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            disabled={generatingPDF || isLoading}
                        >
                            {generatingPDF ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-500"></div>
                                    Génération...
                                </>
                            ) : (
                                <>
                                    <Eye className="h-4 w-4" />
                                    Aperçu PDF
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                <Tabs
                    value={selectedPeriod}
                    onValueChange={(v) => setSelectedPeriod(v as PeriodFilter)}
                    className="space-y-6"
                >
                    <TabsList className="grid w-full max-w-md grid-cols-4 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                        {periodOptions.map((option) => (
                            <TabsTrigger
                                key={option.value}
                                value={option.value}
                                className="data-[state=active]:bg-green-500 data-[state=active]:text-white text-sm"
                            >
                                {option.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {periodOptions.map((option) => (
                        <TabsContent key={option.value} value={option.value} className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <Card className="border-l-4 border-l-green-500">
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenus</p>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                                    {isLoading ? '...' : formatCurrency(stats?.totalRevenue || 0)}
                                                </p>
                                                {stats?.revenueChange !== 0 && (
                                                    <div className="flex items-center gap-1 mt-2">
                                                        {stats?.revenueChange > 0 ? (
                                                            <TrendingUp className="h-3 w-3 text-green-500" />
                                                        ) : (
                                                            <TrendingDown className="h-3 w-3 text-red-500" />
                                                        )}
                                                        <span className={stats?.revenueChange > 0 ? 'text-green-500 text-xs' : 'text-red-500 text-xs'}>
                                                            {stats?.revenueChange > 0 ? '+' : ''}{stats?.revenueChange}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3 rounded-full bg-green-500 text-white">
                                                <TrendingUp className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-red-500">
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Dépenses</p>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                                    {isLoading ? '...' : formatCurrency(stats?.totalDepenses || 0)}
                                                </p>
                                                {stats?.depensesChange !== 0 && (
                                                    <div className="flex items-center gap-1 mt-2">
                                                        {stats?.depensesChange > 0 ? (
                                                            <TrendingUp className="h-3 w-3 text-red-500" />
                                                        ) : (
                                                            <TrendingDown className="h-3 w-3 text-green-500" />
                                                        )}
                                                        <span className={stats?.depensesChange > 0 ? 'text-red-500 text-xs' : 'text-green-500 text-xs'}>
                                                            {stats?.depensesChange > 0 ? '+' : ''}{stats?.depensesChange}%
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-3 rounded-full bg-red-500 text-white">
                                                <TrendingDown className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-blue-500">
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Transferts/Swap</p>
                                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                                    {isLoading ? '...' : formatCurrency(stats?.totalTransferts || 0)}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-2">{stats?.transactionsCount || 0} opérations</p>
                                            </div>
                                            <div className="p-3 rounded-full bg-blue-500 text-white">
                                                <ArrowRightLeft className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-l-4 border-l-purple-500">
                                    <CardContent className="p-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Solde Net</p>
                                                <p className={`text-2xl font-bold mt-1 ${(stats?.soldeNet || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {isLoading ? '...' : formatCurrency(stats?.soldeNet || 0)}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-2">Revenus - Dépenses</p>
                                            </div>
                                            <div className="p-3 rounded-full bg-purple-500 text-white">
                                                <DollarSign className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <BarChart3 className="h-5 w-5" />
                                        Résumé {option.label}
                                    </CardTitle>
                                    <CardDescription>
                                        Période: {dateRange ? `${format(dateRange.start, 'dd/MM/yyyy', { locale: fr })} - ${format(dateRange.end, 'dd/MM/yyyy', { locale: fr })}` : ''}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                <TrendingUp className="h-4 w-4 text-green-500" />
                                                Revenus
                                            </h4>
                                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${Math.min(100, ((stats?.totalRevenue || 0) / ((stats?.totalRevenue || 0) + (stats?.totalDepenses || 1))) * 100)}%`
                                                    }}
                                                />
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{formatCurrency(stats?.totalRevenue || 0)}</p>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                <TrendingDown className="h-4 w-4 text-red-500" />
                                                Dépenses
                                            </h4>
                                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-red-500 rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${Math.min(100, ((stats?.totalDepenses || 0) / ((stats?.totalRevenue || 1) + (stats?.totalDepenses || 0))) * 100)}%`
                                                    }}
                                                />
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{formatCurrency(stats?.totalDepenses || 0)}</p>
                                        </div>

                                        <div className="space-y-3">
                                            <h4 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                                <Activity className="h-4 w-4 text-purple-500" />
                                                Résultat Net
                                            </h4>
                                            <div className={`text-3xl font-bold ${(stats?.soldeNet || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                {formatCurrency(stats?.soldeNet || 0)}
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">
                                                {(stats?.soldeNet || 0) >= 0 ? 'Bénéfice' : 'Perte'}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>

            <Dialog open={pdfDialogOpen} onOpenChange={handleClosePdfDialog}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            Rapport PDF généré
                        </DialogTitle>
                        <DialogDescription>
                            Rapport {getPeriodTitle(selectedPeriod)} - {periodLabel}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-6">
                        <div className="text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <FileText className="h-8 w-8 text-green-500" />
                            </div>
                            <div>
                                <p className="text-sm text-gray-600 mb-2">Votre rapport financier est prêt</p>
                                <p className="text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded">
                                    Rapport_{getPeriodTitle(selectedPeriod)}_{format(new Date(), 'yyyy-MM-dd')}.pdf
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <Button onClick={handleDownloadPDF} className="w-full bg-green-500 hover:bg-green-600" size="lg">
                            <Download className="mr-2 h-5 w-5" />
                            Télécharger le PDF
                        </Button>
                        <Button variant="outline" onClick={() => pdfUrl && window.open(pdfUrl, '_blank')} className="w-full">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Ouvrir dans un nouvel onglet
                        </Button>
                        <Button variant="ghost" onClick={handleClosePdfDialog} className="w-full">
                            Fermer
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Layout>
    );
};

export default FinanceStatisticsPage;
