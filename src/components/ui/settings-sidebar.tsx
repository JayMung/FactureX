import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  TrendingUp,
  Percent,
  CreditCard,
  Activity,
  Users,
  Menu,
  X
} from 'lucide-react';

interface SettingsTab {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}

interface SettingsSidebarProps {
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

const settingsTabs: SettingsTab[] = [
  {
    id: 'rates',
    label: 'Taux de change',
    description: 'Configuration des taux de conversion',
    icon: <TrendingUp className="h-5 w-5" />
  },
  {
    id: 'fees',
    label: 'Frais',
    description: 'Frais de transaction et commissions',
    icon: <Percent className="h-5 w-5" />
  },
  {
    id: 'payment',
    label: 'Modes de paiement',
    description: 'Gestion des méthodes de paiement',
    icon: <CreditCard className="h-5 w-5" />
  },
  {
    id: 'status',
    label: 'Statuts',
    description: 'Statuts des transactions',
    icon: <Activity className="h-5 w-5" />
  },
  {
    id: 'users',
    label: 'Utilisateurs',
    description: 'Gestion des utilisateurs et permissions',
    icon: <Users className="h-5 w-5" />
  },
  {
    id: 'logs',
    label: "Logs d'activité",
    description: 'Historique des actions système',
    icon: <Activity className="h-5 w-5" />
  }
];

const SidebarContent: React.FC<{
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onClose?: () => void;
}> = ({ activeTab, onTabChange, onClose }) => {
  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    if (onClose) onClose();
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-6 py-4">
        <h2 className="text-lg font-semibold text-gray-900">Paramètres</h2>
        <p className="text-sm text-gray-500">
          Configurez les paramètres de l'application FactureX
        </p>
      </div>
      
      <nav className="flex-1 space-y-1 px-3 py-4">
        {settingsTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "flex w-full items-center rounded-lg px-3 py-3 text-left transition-colors",
              "hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2",
              activeTab === tab.id
                ? "bg-emerald-50 border border-emerald-200 text-emerald-700"
                : "text-gray-700 hover:text-gray-900"
            )}
          >
            <div className={cn(
              "mr-3 flex h-10 w-10 items-center justify-center rounded-md",
              activeTab === tab.id
                ? "bg-emerald-100 text-emerald-600"
                : "bg-gray-100 text-gray-600"
            )}>
              {tab.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm">
                {tab.label}
              </div>
              <div className="text-xs text-gray-500 mt-0.5 truncate">
                {tab.description}
              </div>
            </div>
          </button>
        ))}
      </nav>
    </div>
  );
};

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  activeTab,
  onTabChange
}) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-80 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r shadow-sm z-30">
        <SidebarContent activeTab={activeTab} onTabChange={onTabChange} />
      </aside>
      
      {/* Mobile Navigation */}
      <div className="lg:hidden">
        {/* Mobile top navigation with menu button */}
        <div className="bg-white border-b relative sticky top-0 z-40">
          {/* Hamburger Menu Button */}
          <div className="absolute top-2 left-4 z-10">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SidebarContent
                  activeTab={activeTab}
                  onTabChange={onTabChange}
                  onClose={() => setMobileOpen(false)}
                />
              </SheetContent>
            </Sheet>
          </div>
          
          {/* Scrollable tabs */}
          <div className="overflow-x-auto pl-16 pr-4">
            <div className="flex space-x-1 py-3 min-w-max">
              {settingsTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "flex flex-col items-center rounded-lg px-3 py-2 min-w-[70px] transition-colors whitespace-nowrap",
                    activeTab === tab.id
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <div className={cn(
                    "mb-1 flex h-7 w-7 items-center justify-center rounded-md",
                    activeTab === tab.id
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-gray-100 text-gray-500"
                  )}>
                    {React.cloneElement(tab.icon as React.ReactElement, { className: "h-4 w-4" })}
                  </div>
                  <span className="text-xs font-medium text-center leading-tight">
                    {tab.label.split(' ')[0]} {/* Show only first word on mobile */}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsSidebar;