import React, { useState, useMemo } from 'react';
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
    CheckCircle,
    ExternalLink,
    Eye,
    Loader2,
    PieChart as PieChartIcon
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import { useFinanceStatsByPeriod, PeriodFilter } from '@/hooks/useFinanceStatsByPeriod';
import { generateFinanceReportPDF } from '@/utils/financeReportPdfGenerator';
import { useSensitiveDataValue, maskCurrency } from '@/hooks/useSensitiveData';
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

const CHART_COLORS = ['#10b981', '#ef4444', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

const FinanceStatisticsPage: React.FC = () => {
    const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>('month');
    const { stats, transactions, isLoading, periodLabel, dateRange } = useFinanceStatsByPeriod(selectedPeriod);

    const depenseBreakdown = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];
        const counts: Record<string, { name: string; value: number }> = {};
        transactions.filter((t: any) => t.type_transaction === 'depense').forEach((t: any) => {
            const cat = t.categorie || t.motif || 'Autre';
            if (!counts[cat]) counts[cat] = { name: cat, value: 0 };
            counts[cat].value += Math.abs(t.montant || 0);
        });
        return Object.values(counts).sort((a, b) => b.value - a.value).slice(0, 7);
    }, [transactions]);

    const revenueBreakdown = useMemo(() => {
        if (!transactions || transactions.length === 0) return [];
        const counts: Record<string, { name: string; value: number }> = {};
        transactions.filter((t: any) => t.type_transaction === 'revenue').forEach((t: any) => {
            const cat = t.categorie || t.motif || 'Autre';
            if (!counts[cat]) counts[cat] = { name: cat, value: 0 };
            counts[cat].value += Math.abs(t.montant || 0);
        });
        return Object.values(counts).sort((a, b) => b.value - a.value).slice(0, 7);
    }, [transactions]);

    const transfertsCount = useMemo(() => {
        if (!transactions) return 0;
        return transactions.filter((t: any) =>
            t.type_transaction === 'transfert' || t.type_transaction === 'swap'
        ).length;
    }, [transactions]);

    const barData = useMemo(() => {
        if (!stats) return [];
        return [
            { name: 'Revenus', value: stats.totalRevenue, fill: '#10b981' },
            { name: 'Dépenses', value: stats.totalDepenses, fill: '#ef4444' },
            { name: 'Transferts', value: stats.totalTransferts, fill: '#3b82f6' },
            { name: 'Net', value: Math.max(0, stats.soldeNet), fill: '#8b5cf6' },
        ];
    }, [stats]);

    const [generatingPDF, setGeneratingPDF] = useState(false);
    const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    const isHidden = useSensitiveDataValue();

    const formatCurrency = (amount: number) => {
        const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
        return isHidden ? maskCurrency(formatted, true) : formatted;
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
                                    <Loader2 className="h-4 w-4 animate-spin" />
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
                                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-sm"
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
                                            <div className="p-3 rounded-full text-white" style={{ background: '#21ac74' }}>
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
                                                <p className="text-xs text-gray-500 mt-2">{transfertsCount} transfert{transfertsCount !== 1 ? 's' : ''}</p>
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
                                                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Solde Net Période</p>
                                                <p className={`text-2xl font-bold mt-1 ${(stats?.soldeNet || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                    {isLoading ? '...' : formatCurrency(stats?.soldeNet || 0)}
                                                </p>
                                                <p className="text-xs text-gray-500 mt-2">Revenus − Dépenses (période)</p>
                                            </div>
                                            <div className="p-3 rounded-full bg-purple-500 text-white">
                                                <DollarSign className="h-5 w-5" />
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                {/* Bar Chart */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="flex items-center gap-2">
                                            <BarChart3 className="h-5 w-5" />
                                            Vue d'ensemble {option.label}
                                        </CardTitle>
                                        <CardDescription>
                                            {dateRange ? `${format(dateRange.start, 'dd/MM/yyyy', { locale: fr })} — ${format(dateRange.end, 'dd/MM/yyyy', { locale: fr })}` : ''}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        {isLoading ? (
                                            <div className="h-64 flex items-center justify-center">
                                                <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                                            </div>
                                        ) : (
                                            <ResponsiveContainer width="100%" height={240}>
                                                <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}`} />
                                                    <Tooltip formatter={(value: any) => [`$${Number(value).toFixed(2)}`, '']} />
                                                    <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                        {barData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.fill} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                        <div className="mt-4 grid grid-cols-2 gap-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full" style={{ background: '#21ac74' }} />
                                                <span className="text-sm text-gray-600">Revenus: {formatCurrency(stats?.totalRevenue || 0)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-red-500" />
                                                <span className="text-sm text-gray-600">Dépenses: {formatCurrency(stats?.totalDepenses || 0)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                                                <span className="text-sm text-gray-600">Transferts: {formatCurrency(stats?.totalTransferts || 0)}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded-full bg-purple-500" />
                                                <span className={`text-sm font-medium ${(stats?.soldeNet || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    Net: {formatCurrency(stats?.soldeNet || 0)}
                                                </span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Pie Charts — Dépenses & Revenus */}
                                <div className="space-y-4">
                                    {/* Dépenses par catégorie */}
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <PieChartIcon className="h-4 w-4 text-red-500" />
                                                Dépenses par catégorie
                                            </CardTitle>
                                            <CardDescription>Top {depenseBreakdown.length} catégories</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {isLoading ? (
                                                <div className="h-48 flex items-center justify-center">
                                                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                                                </div>
                                            ) : depenseBreakdown.length === 0 ? (
                                                <div className="h-24 flex items-center justify-center text-gray-400 text-sm">Aucune dépense</div>
                                            ) : (
                                                <>
                                                    <ResponsiveContainer width="100%" height={160}>
                                                        <PieChart>
                                                            <Pie data={depenseBreakdown} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2} dataKey="value">
                                                                {depenseBreakdown.map((_, index) => (
                                                                    <Cell key={`dep-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip formatter={(value: any) => [`$${Number(value).toFixed(2)}`, '']} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                    <div className="mt-1 space-y-1">
                                                        {depenseBreakdown.map((cat, index) => (
                                                            <div key={cat.name} className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                                                                    <span className="text-xs text-gray-600 truncate max-w-[130px]">{cat.name}</span>
                                                                </div>
                                                                <span className="text-xs font-medium">{formatCurrency(cat.value)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>
                                    {/* Revenus par catégorie */}
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="flex items-center gap-2 text-base">
                                                <PieChartIcon className="h-4 w-4 text-emerald-500" />
                                                Revenus par catégorie
                                            </CardTitle>
                                            <CardDescription>Top {revenueBreakdown.length} catégories</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            {isLoading ? (
                                                <div className="h-48 flex items-center justify-center">
                                                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                                                </div>
                                            ) : revenueBreakdown.length === 0 ? (
                                                <div className="h-24 flex items-center justify-center text-gray-400 text-sm">Aucun revenu</div>
                                            ) : (
                                                <>
                                                    <ResponsiveContainer width="100%" height={160}>
                                                        <PieChart>
                                                            <Pie data={revenueBreakdown} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2} dataKey="value">
                                                                {revenueBreakdown.map((_, index) => (
                                                                    <Cell key={`rev-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip formatter={(value: any) => [`$${Number(value).toFixed(2)}`, '']} />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                    <div className="mt-1 space-y-1">
                                                        {revenueBreakdown.map((cat, index) => (
                                                            <div key={cat.name} className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                                                                    <span className="text-xs text-gray-600 truncate max-w-[130px]">{cat.name}</span>
                                                                </div>
                                                                <span className="text-xs font-medium">{formatCurrency(cat.value)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>
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
                        <Button onClick={handleDownloadPDF} className="w-full" size="lg">
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
