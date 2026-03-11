import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, Settings, Plus, ReceiptText, BadgeCheck, Menu, FileText, BarChart3, ArrowRightLeft, Package, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

import { ActivityItem, Client } from './types';
import { useFactures } from '@/hooks/useFactures';
import { useClients } from '@/hooks/useClients';
import { format } from 'date-fns';

import { HomePage } from './pages/HomePage';
import { InvoicesPage } from './pages/InvoicesPage';
import { InvoiceDetailsPage } from './pages/InvoiceDetailsPage';
import { CreateInvoicePage } from './pages/CreateInvoicePage';
import { ClientsPage } from './pages/ClientsPage';
import { ClientDetailsPage } from './pages/ClientDetailsPage';
import { ReportsPage } from './pages/ReportsPage';
import { ScannerPage } from './pages/ScannerPage';
import { CreateClientPage } from './pages/CreateClientPage';
import { SettingsPage } from './pages/SettingsPage';
import { CompanySettingsPage } from './pages/CompanySettingsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { ColisPage } from './pages/ColisPage';
import { FinancesPage } from './pages/FinancesPage';
import { SettingsPlaceholderPage } from './pages/SettingsPlaceholderPage';
import { MobileLoginPage } from './pages/MobileLoginPage';

export default function MobileApp() {
  // ── All hooks MUST be at the top — React Rules of Hooks ──
  const [activeTab, setActiveTab] = useState('accueil');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<ActivityItem | null>(null);
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // Local state only for optimistically-added items (form submissions)
  const [localNewInvoices, setLocalNewInvoices] = useState<ActivityItem[]>([]);

  // Auth state listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Always fetch data (hooks must be unconditional) — data will be empty when not authed
  const { factures } = useFactures(1, undefined, { pageSize: 100 });
  const { clients: supClients, createClient } = useClients(1, { pageSize: 200 });

  // Also fetch all clients directly for the name map (bypasses pagination limit)
  const [allClientsForMap, setAllClientsForMap] = React.useState<Record<string, string>>({});
  useEffect(() => {
    supabase
      .from('clients')
      .select('id, nom')
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          data.forEach((c: any) => { if (c.id && c.nom) map[c.id] = c.nom; });
          setAllClientsForMap(map);
        }
      });
  }, []);

  // Build a lookup map — uses the full client list fetched directly from Supabase
  const clientMap = React.useMemo(() => {
    // Start with full direct-fetch map (has all 125+ clients)
    const map: Record<string, string> = { ...allClientsForMap };
    // Supplement with paginated supClients in case of fresh updates
    supClients.forEach((c: any) => {
      if (c.id && c.nom) map[c.id] = c.nom;
    });
    return map;
  }, [allClientsForMap, supClients]);

  // Memoize real invoices — always derived fresh from factures + clientMap
  const realInvoices: ActivityItem[] = React.useMemo(() =>
    factures.map((f: any) => {
      const clientName = clientMap[f.client_id] || 'Client Inconnu';
      const initColors = ['bg-blue-100 text-blue-600', 'bg-amber-100 text-amber-600', 'bg-emerald-100 text-emerald-600', 'bg-purple-100 text-purple-600'];
      const randomColor = initColors[f.client_id ? (f.client_id.length % initColors.length) : 0];

      let statusMapped = 'Brouillon';
      if (f.statut === 'payee' || f.statut === 'validee') statusMapped = 'Payé';
      if (f.statut === 'en_attente') statusMapped = 'En attente';
      if (f.statut === 'retard') statusMapped = 'Retard';

      return {
        id: f.id,
        client: clientName,
        initials: clientName.substring(0, 2).toUpperCase(),
        type: f.type === 'devis' ? 'Devis' : 'Facture',
        number: f.facture_number,
        date: f.date_emission ? format(new Date(f.date_emission), 'dd MMM yyyy') : 'N/A',
        amount: f.total_general || 0,
        status: statusMapped as 'Payé' | 'En attente' | 'Retard' | 'Brouillon',
        color: randomColor
      };
    })
  , [factures, clientMap]);

  // Memoize real clients — always derived fresh from supClients
  const realClients: Client[] = React.useMemo(() =>
    supClients.map((c: any) => {
      const initColors = ['bg-blue-100 text-blue-600', 'bg-amber-100 text-amber-600', 'bg-emerald-100 text-emerald-600', 'bg-purple-100 text-purple-600'];
      const randomColor = initColors[c.id ? (c.id.length % initColors.length) : 0];
      const nameStr = c.nom || 'Client Inconnu';
      return {
        id: c.id,
        name: nameStr,
        initials: nameStr.substring(0, 2).toUpperCase(),
        business: c.entreprise || (c.type === 'entreprise' ? 'Entreprise' : 'Particulier'),
        email: c.email || '',
        phone: c.telephone,
        address: c.adresse,
        color: randomColor
      };
    })
  , [supClients]);

  // ── CONDITIONAL RENDERING (after all hooks) ──

  // Still loading auth state
  if (session === undefined) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl"
            style={{ background: 'linear-gradient(135deg, #21ac74 0%, #178a5c 100%)' }}
          >
            <LayoutDashboard size={30} className="text-white" />
          </div>
          <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-emerald-500 animate-spin" />
        </div>
      </div>
    );
  }

  // Not authenticated — show mobile login
  if (!session) {
    return <MobileLoginPage onLoginSuccess={() => { /* session listener updates state automatically */ }} />;
  }

  // ── Handlers ──

  const handleAddInvoice = (newInvoiceData: any) => {
    const newInvoice: ActivityItem = {
      id: Math.random().toString(36).substr(2, 9),
      client: newInvoiceData.client,
      initials: newInvoiceData.initials,
      type: 'Facture',
      number: newInvoiceData.number,
      date: newInvoiceData.date,
      amount: newInvoiceData.amount,
      status: 'En attente',
      color: newInvoiceData.color
    };
    setLocalNewInvoices(prev => [newInvoice, ...prev]);
    setActiveTab('factures');
  };

  const handleAddClient = async (newClientData: Omit<Client, 'id' | 'business' | 'initials' | 'color'>) => {
    try {
      await createClient({
        nom: newClientData.name,
        telephone: newClientData.phone || '',
        ville: newClientData.address || ''
      });
      setActiveTab('clients');
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    setActiveTab('client-details');
  };

  const handleSelectInvoice = (invoice: ActivityItem) => {
    setSelectedInvoice(invoice);
    setActiveTab('invoice-details');
  };

  const handleUpdateClient = (id: string, updatedData: Partial<Client>) => {
    // realClients is derived from Supabase; update selectedClient optimistically
    if (selectedClient?.id === id) {
      setSelectedClient(prev => prev ? { ...prev, ...updatedData } : null);
    }
  };

  const handleUpdateInvoiceStatus = (id: string, status: ActivityItem['status']) => {
    // Update selectedInvoice optimistically
    if (selectedInvoice?.id === id) {
      setSelectedInvoice(prev => prev ? { ...prev, status } : null);
    }
  };

  const renderContent = () => {
    const nextInvoiceNumber = `#${(realInvoices.filter(inv => inv.type === 'Facture').length + 1).toString().padStart(3, '0')}`;
    // Merge real invoices with any locally-added ones (optimistic updates)
    const displayInvoices = [...localNewInvoices, ...realInvoices];

    switch (activeTab) {
      case 'accueil': return <HomePage onNavigate={setActiveTab} recentActivity={displayInvoices.slice(0, 4)} />;
      case 'factures': return <InvoicesPage invoices={displayInvoices} onNavigate={setActiveTab} onSelectInvoice={handleSelectInvoice} />;
      case 'invoice-details': return selectedInvoice ? <InvoiceDetailsPage invoice={selectedInvoice} onBack={() => setActiveTab('factures')} onUpdateStatus={handleUpdateInvoiceStatus} /> : null;
      case 'create-invoice': return <CreateInvoicePage clients={realClients} nextNumber={nextInvoiceNumber} onBack={() => setActiveTab('factures')} onSave={handleAddInvoice} />;
      case 'clients': return <ClientsPage clients={realClients} onNavigate={setActiveTab} onSelectClient={handleSelectClient} />;
      case 'client-details': return selectedClient ? <ClientDetailsPage client={selectedClient} invoices={displayInvoices} onBack={() => setActiveTab('clients')} onUpdateClient={handleUpdateClient} /> : null;
      case 'reports': return <ReportsPage invoices={displayInvoices} onBack={() => setActiveTab('accueil')} />;
      case 'scanner': return <ScannerPage onBack={() => setActiveTab('accueil')} />;
      case 'create-client': return <CreateClientPage onBack={() => setActiveTab('clients')} onSave={handleAddClient} />;
      case 'reglages': return <SettingsPage onNavigate={setActiveTab} onLogout={() => supabase.auth.signOut()} />;
      case 'settings-company': return <CompanySettingsPage onBack={() => setActiveTab('reglages')} />;
      case 'transactions': return <TransactionsPage onNavigate={setActiveTab} />;
      case 'colis': return <ColisPage onNavigate={setActiveTab} />;
      case 'finances': return <FinancesPage onNavigate={setActiveTab} />;
      case 'settings-facture': return <SettingsPlaceholderPage title="Paramètres Factures" onBack={() => setActiveTab('reglages')} />;
      case 'comptes': return <SettingsPlaceholderPage title="Comptes Bancaires" onBack={() => setActiveTab('reglages')} />;
      case 'categories': return <SettingsPlaceholderPage title="Catégories" onBack={() => setActiveTab('reglages')} />;
      case 'permissions': return <SettingsPlaceholderPage title="Rôles & Permissions" onBack={() => setActiveTab('reglages')} />;
      case 'security': return <SettingsPlaceholderPage title="Sécurité" onBack={() => setActiveTab('reglages')} />;
      case 'api': return <SettingsPlaceholderPage title="API & Webhooks" onBack={() => setActiveTab('reglages')} />;
      case 'notifications': return <SettingsPlaceholderPage title="Notifications" onBack={() => setActiveTab('reglages')} />;
      default: return <HomePage onNavigate={setActiveTab} recentActivity={displayInvoices.slice(0, 4)} />;
    }
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-[#f5f8f7] w-full relative overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-safe top-0 z-10 bg-white shadow-sm pb-4">
        <div className="flex items-center gap-2 text-slate-900 mt-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <BadgeCheck size={20} fill="currentColor" fillOpacity={0.2} />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">FactureX</h1>
        </div>
        <button
          onClick={() => setActiveTab('reglages')}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-[#f5f8f7] hover:bg-slate-100 transition-colors text-slate-900 active:scale-90 mt-2"
        >
          <Menu size={20} />
        </button>
      </header>

      {/* Main Content (Scrollable) */}
      <main className="flex-1 overflow-y-auto hide-scrollbar pb-24 relative z-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            className="min-h-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Floating Action Button (FAB) */}
      <div className="fixed bottom-24 right-6 z-30">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsModalOpen(true)}
          className="w-14 h-14 rounded-full bg-primary text-white shadow-fab flex items-center justify-center"
        >
          <Plus size={28} />
        </motion.button>
      </div>

      {/* New Item Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 w-full bg-white rounded-t-[2.5rem] z-50 p-8 pt-10"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8" />
              <h3 className="text-xl font-bold text-slate-900 mb-6">Créer Nouveau</h3>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: ReceiptText, label: 'Facture', color: 'bg-blue-50 text-blue-600', tab: 'create-invoice' },
                  { icon: Wallet, label: 'Finances', color: 'bg-emerald-50 text-emerald-600', tab: 'finances' },
                  { icon: ArrowRightLeft, label: 'Transaction', color: 'bg-indigo-50 text-indigo-600', tab: 'transactions' },
                  { icon: Package, label: 'Colis', color: 'bg-amber-50 text-amber-600', tab: 'colis' },
                  { icon: Users, label: 'Client', color: 'bg-purple-50 text-purple-600', tab: 'create-client' },
                  { icon: FileText, label: 'Devis', color: 'bg-rose-50 text-rose-600', tab: 'create-invoice' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => {
                      setIsModalOpen(false);
                      setActiveTab(item.tab);
                    }}
                    className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-slate-50 hover:bg-slate-100 transition-colors group"
                  >
                    <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <item.icon size={24} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{item.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full mt-8 py-4 text-slate-500 font-bold text-sm bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Navigation Bar */}
      <div className="fixed bottom-0 left-0 w-full h-20 bg-white border-t border-slate-100 flex justify-around items-center px-4 pb-safe pt-2 z-20 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        {[
          { id: 'accueil', icon: LayoutDashboard, label: 'Accueil' },
          { id: 'factures', icon: ReceiptText, label: 'Factures' },
          { id: 'finances', icon: Wallet, label: 'Trésorerie' },
          { id: 'transactions', icon: ArrowRightLeft, label: 'Transac.' },
          { id: 'colis', icon: Package, label: 'Colis' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 transition-colors ${
              activeTab === tab.id ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={24} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
            <span className={`text-[10px] ${activeTab === tab.id ? 'font-bold' : 'font-medium'}`}>
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
