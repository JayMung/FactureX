import React, { useState, useEffect, useMemo } from 'react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import {
  Wallet, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle,
  Clock, AlertTriangle, ChevronRight, DollarSign, Receipt, BarChart3,
  RefreshCw, ArrowRightLeft, Tag, FileText,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useComptesFinanciers } from '@/hooks/useComptesFinanciers';
import { useFinanceStatsByPeriod } from '@/hooks/useFinanceStatsByPeriod';
import { useExchangeRates } from '@/hooks/useSettings';
import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

const fmt = (v: number, d = 'USD') =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: d, minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v);

const compact = (v: number) =>
  v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `$${(v / 1000).toFixed(1)}k` : `$${v.toFixed(0)}`;

interface DailyFlow { date: string; revenus: number; depenses: number; }
interface UnpaidFacture {
  id: string; facture_number: string; client_nom: string;
  solde_restant: number; date_echeance?: string; est_en_retard?: boolean;
}

const COLORS = { mobile_money: '#10b981', banque: '#3b82f6', cash: '#f59e0b' };
const TYPE_LABELS: Record<string, string> = { mobile_money: 'Mobile Money', banque: 'Banque', cash: 'Cash' };

const FinancesDashboard: React.FC = () => {
  const [dailyFlow, setDailyFlow] = useState<DailyFlow[]>([]);
  const [unpaidFactures, setUnpaidFactures] = useState<UnpaidFacture[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [totalUnpaid, setTotalUnpaid] = useState(0);
  const [loadingExtra, setLoadingExtra] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const { comptes, loading: cLoading } = useComptesFinanciers();
  const { stats: ms, isLoading: sLoading } = useFinanceStatsByPeriod('month');
  const { rates } = useExchangeRates();

  const toUSD = (amount: number, devise: string) => {
    if (devise === 'CDF' && rates?.usdToCdf) return amount / rates.usdToCdf;
    if (devise === 'CNY' && rates?.usdToCny) return amount / rates.usdToCny;
    return amount;
  };

  const activeComptes = useMemo(() => comptes?.filter(c => c.is_active) || [], [comptes]);
  const totalBalanceUSD = useMemo(() => activeComptes.reduce((s, c) => s + toUSD(parseFloat(c.solde_actuel?.toString() || '0'), c.devise), 0), [activeComptes, rates]);

  const balanceByType = useMemo(() => {
    const map: Record<string, number> = {};
    activeComptes.forEach(c => { map[c.type_compte] = (map[c.type_compte] || 0) + toUSD(parseFloat(c.solde_actuel?.toString() || '0'), c.devise); });
    return Object.entries(map).filter(([, v]) => v > 0).map(([type, total]) => ({ type, label: TYPE_LABELS[type] || type, total, color: COLORS[type as keyof typeof COLORS] || '#64748b' }));
  }, [activeComptes, rates]);

  const balanceByDevise = useMemo(() => {
    const map: Record<string, { total: number; count: number }> = {};
    activeComptes.forEach(c => {
      if (!map[c.devise]) map[c.devise] = { total: 0, count: 0 };
      map[c.devise].total += parseFloat(c.solde_actuel?.toString() || '0');
      map[c.devise].count += 1;
    });
    return Object.entries(map).map(([devise, v]) => ({ devise, ...v }));
  }, [activeComptes]);

  useEffect(() => {
    const fetch = async () => {
      setLoadingExtra(true);
      try {
        const now = new Date();
        const { data: txs } = await supabase.from('transactions')
          .select('montant, type_transaction, date_paiement')
          .gte('date_paiement', format(subDays(now, 29), 'yyyy-MM-dd'))
          .in('type_transaction', ['depense', 'revenue']);

        const flow: DailyFlow[] = [];
        for (let i = 29; i >= 0; i -= 3) {
          const day = subDays(now, i);
          const ds = format(day, 'yyyy-MM-dd');
          const dl = format(day, 'dd/MM', { locale: fr });
          const day_txs = (txs || []).filter(t => t.date_paiement?.startsWith(ds));
          let revenus = 0, depenses = 0;
          day_txs.forEach(t => {
            const m = parseFloat(t.montant?.toString() || '0');
            if (t.type_transaction === 'revenue') revenus += m;
            else depenses += m;
          });
          flow.push({ date: dl, revenus, depenses });
        }
        setDailyFlow(flow);

        const { data: factures } = await supabase.from('factures')
          .select('id, facture_number, total_general, date_echeance, est_en_retard, clients:client_id(nom)')
          .not('statut', 'in', '("payee","annulee")')
          .order('date_echeance', { ascending: true }).limit(6);

        if (factures) {
          const ids = factures.map(f => f.id);
          const { data: pays } = await supabase.from('paiements').select('facture_id, montant_paye').in('facture_id', ids);
          const payMap: Record<string, number> = {};
          (pays || []).forEach((p: any) => { payMap[p.facture_id] = (payMap[p.facture_id] || 0) + p.montant_paye; });
          const unpaid = factures.map(f => ({
            id: f.id, facture_number: f.facture_number,
            client_nom: (f.clients as any)?.nom || '—',
            solde_restant: f.total_general - (payMap[f.id] || 0),
            date_echeance: f.date_echeance, est_en_retard: f.est_en_retard,
          })).filter(f => f.solde_restant > 0.01);
          setUnpaidFactures(unpaid);
          setTotalUnpaid(unpaid.reduce((s, f) => s + f.solde_restant, 0));
        }

        const { count } = await supabase.from('transactions').select('id', { count: 'exact', head: true }).eq('statut', 'en_attente');
        setPendingCount(count || 0);
      } catch (err) { console.error(err); }
      finally { setLoadingExtra(false); }
    };
    fetch();
  }, [refreshKey]);

  const loading = cLoading || sLoading || loadingExtra;

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Trésorerie</h1>
            <p className="text-gray-500 text-sm mt-1">Vue d'ensemble financière en temps réel</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRefreshKey(k => k + 1)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="col-span-2 lg:col-span-1 border-0 shadow-sm bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-emerald-100 text-sm">Solde Total</span>
                <div className="p-2 bg-white/20 rounded-lg"><Wallet className="h-4 w-4" /></div>
              </div>
              {cLoading ? <div className="h-8 bg-white/20 rounded animate-pulse" /> : <div className="text-2xl font-bold">{compact(totalBalanceUSD)}</div>}
              <p className="text-emerald-100 text-xs mt-1">{activeComptes.length} comptes actifs</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-sm">Revenus / mois</span>
                <div className="p-2 bg-emerald-50 rounded-lg"><TrendingUp className="h-4 w-4 text-emerald-600" /></div>
              </div>
              {sLoading ? <div className="h-8 bg-gray-100 rounded animate-pulse" /> : <div className="text-2xl font-bold text-emerald-600">{compact(ms?.totalRevenue || 0)}</div>}
              {!!ms?.revenueChange && <p className={`text-xs mt-1 ${ms.revenueChange >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{ms.revenueChange >= 0 ? '+' : ''}{ms.revenueChange}% vs mois dernier</p>}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-sm">Dépenses / mois</span>
                <div className="p-2 bg-red-50 rounded-lg"><TrendingDown className="h-4 w-4 text-red-500" /></div>
              </div>
              {sLoading ? <div className="h-8 bg-gray-100 rounded animate-pulse" /> : <div className="text-2xl font-bold text-red-500">{compact(ms?.totalDepenses || 0)}</div>}
              {!!ms?.depensesChange && <p className={`text-xs mt-1 ${ms.depensesChange <= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{ms.depensesChange >= 0 ? '+' : ''}{ms.depensesChange}% vs mois dernier</p>}
            </CardContent>
          </Card>

          <Card className={`border-0 shadow-sm ${totalUnpaid > 0 ? 'border-l-4 border-l-amber-400' : ''}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-500 text-sm">À recouvrer</span>
                <div className="p-2 bg-amber-50 rounded-lg"><AlertTriangle className="h-4 w-4 text-amber-500" /></div>
              </div>
              {loadingExtra ? <div className="h-8 bg-gray-100 rounded animate-pulse" /> : <div className="text-2xl font-bold text-amber-600">{compact(totalUnpaid)}</div>}
              <p className="text-gray-400 text-xs mt-1">{unpaidFactures.length} facture(s)</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-2 border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
                Flux de trésorerie — 30 derniers jours
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingExtra ? (
                <div className="h-56 bg-gray-50 rounded-lg animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={dailyFlow} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="gR" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gD" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                    <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(2)}`, '']} />
                    <Area type="monotone" dataKey="revenus" stroke="#10b981" strokeWidth={2} fill="url(#gR)" name="Revenus" />
                    <Area type="monotone" dataKey="depenses" stroke="#ef4444" strokeWidth={2} fill="url(#gD)" name="Dépenses" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="h-4 w-4 text-emerald-600" />
                Soldes par type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cLoading ? <div className="h-48 bg-gray-50 rounded-lg animate-pulse" /> : (
                <>
                  {balanceByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={110}>
                      <BarChart data={balanceByType} layout="vertical" margin={{ left: 0, right: 8 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="label" tick={{ fontSize: 11 }} width={85} />
                        <Tooltip formatter={(v: any) => [`$${Number(v).toFixed(0)}`, '']} />
                        <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                          {balanceByType.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <p className="text-sm text-gray-400 text-center py-4">Aucun compte actif</p>}

                  <div className="space-y-1.5 pt-2 border-t">
                    {balanceByDevise.map(b => (
                      <div key={b.devise} className="flex justify-between text-sm">
                        <span className="text-gray-500">{b.devise} <span className="text-gray-400 text-xs">({b.count})</span></span>
                        <span className="font-medium">{fmt(b.total, b.devise)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 pt-2 border-t max-h-28 overflow-y-auto">
                    {activeComptes.map(c => (
                      <div key={c.id} className="flex justify-between text-xs">
                        <span className="text-gray-500 truncate max-w-[120px]">{c.nom}</span>
                        <span className={parseFloat(c.solde_actuel?.toString() || '0') < 0 ? 'text-red-500 font-medium' : 'text-gray-700'}>
                          {fmt(parseFloat(c.solde_actuel?.toString() || '0'), c.devise)}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottom */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Factures impayées */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Receipt className="h-4 w-4 text-amber-500" />
                  Factures à recouvrer
                  {unpaidFactures.length > 0 && <Badge className="bg-amber-100 text-amber-700 ml-1">{unpaidFactures.length}</Badge>}
                </CardTitle>
                <Link to="/factures"><Button variant="ghost" size="sm" className="text-xs text-gray-400">Voir tout <ChevronRight className="h-3 w-3 ml-1" /></Button></Link>
              </div>
            </CardHeader>
            <CardContent>
              {loadingExtra ? (
                <div className="space-y-2">{[1, 2, 3].map(i => <div key={i} className="h-12 bg-gray-50 rounded animate-pulse" />)}</div>
              ) : unpaidFactures.length === 0 ? (
                <div className="py-8 text-center text-gray-400 text-sm">✅ Toutes les factures sont à jour</div>
              ) : (
                <div className="space-y-2">
                  {unpaidFactures.map(f => (
                    <div key={f.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-2.5">
                        {f.est_en_retard ? <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" /> : <Clock className="h-4 w-4 text-amber-400 flex-shrink-0" />}
                        <div>
                          <p className="text-sm font-medium">{f.client_nom}</p>
                          <p className="text-xs text-gray-400">{f.facture_number}{f.date_echeance && ` · ${format(new Date(f.date_echeance), 'dd/MM/yy')}`}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-bold ${f.est_en_retard ? 'text-red-600' : 'text-amber-600'}`}>{compact(f.solde_restant)}</p>
                        {f.est_en_retard && <Badge variant="destructive" className="text-xs py-0">Retard</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Résumé + Alertes + Raccourcis */}
          <div className="space-y-4">
            {pendingCount > 0 && (
              <Card className="border-0 shadow-sm border-l-4 border-l-yellow-400 bg-yellow-50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="text-sm font-medium text-yellow-800">{pendingCount} transaction{pendingCount > 1 ? 's' : ''} en attente</p>
                      <p className="text-xs text-yellow-600">Validation requise</p>
                    </div>
                  </div>
                  <Link to="/transactions"><Button size="sm" variant="outline" className="border-yellow-400 text-yellow-700 text-xs">Voir <ChevronRight className="h-3 w-3 ml-1" /></Button></Link>
                </CardContent>
              </Card>
            )}

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Résumé du mois</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sLoading ? <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-8 bg-gray-50 rounded animate-pulse"/>)}</div> : (
                  <>
                    <div className="flex justify-between items-center p-2.5 rounded-lg bg-emerald-50">
                      <div className="flex items-center gap-2"><ArrowUpCircle className="h-4 w-4 text-emerald-600"/><span className="text-sm">Revenus</span></div>
                      <span className="font-bold text-emerald-700">{fmt(ms?.totalRevenue || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center p-2.5 rounded-lg bg-red-50">
                      <div className="flex items-center gap-2"><ArrowDownCircle className="h-4 w-4 text-red-500"/><span className="text-sm">Dépenses</span></div>
                      <span className="font-bold text-red-600">{fmt(ms?.totalDepenses || 0)}</span>
                    </div>
                    <div className={`flex justify-between items-center p-2.5 rounded-lg ${(ms?.soldeNet||0)>=0?'bg-blue-50':'bg-orange-50'}`}>
                      <div className="flex items-center gap-2"><DollarSign className={`h-4 w-4 ${(ms?.soldeNet||0)>=0?'text-blue-600':'text-orange-500'}`}/><span className="text-sm">Résultat net</span></div>
                      <span className={`font-bold ${(ms?.soldeNet||0)>=0?'text-blue-700':'text-orange-600'}`}>{fmt(ms?.soldeNet||0)}</span>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">Accès rapides</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { to: '/transactions', icon: ArrowRightLeft, label: 'Transactions', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100' },
                    { to: '/comptes', icon: Wallet, label: 'Comptes', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
                    { to: '/factures', icon: FileText, label: 'Factures', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
                    { to: '/finances/statistiques', icon: BarChart3, label: 'Statistiques', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
                  ].map(item => (
                    <Link key={item.to} to={item.to}>
                      <div className={`flex flex-col items-center gap-1.5 p-3 rounded-lg text-center transition-colors cursor-pointer ${item.color}`}>
                        <item.icon className="h-5 w-5" />
                        <span className="text-xs font-medium">{item.label}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default FinancesDashboard;
