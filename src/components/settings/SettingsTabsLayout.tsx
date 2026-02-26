import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

interface SettingsTabsLayoutProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  children: React.ReactNode;
  showBackButton?: boolean;
  onBack?: () => void;
  backLabel?: string;
}

export const SettingsTabsLayout: React.FC<SettingsTabsLayoutProps> = ({
  tabs,
  activeTab,
  onTabChange,
  children,
  showBackButton = false,
  onBack,
  backLabel = 'Retour'
}) => {
  return (
    <div className="space-y-4">
      {/* Back Button */}
      {showBackButton && onBack && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="flex items-center gap-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 -ml-2"
        >
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Button>
      )}

      {/* Horizontal Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-1 overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap
                border-b-2 transition-all duration-200
                ${activeTab === tab.id
                  ? `border-emerald-500 text-emerald-600 bg-emerald-50/50`
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }
              `}
            >
              {tab.icon && (
                <span className={activeTab === tab.id ? tab.color || 'text-emerald-600' : 'text-gray-400'}>
                  {tab.icon}
                </span>
              )}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="pt-2">
        {children}
      </div>
    </div>
  );
};

export default SettingsTabsLayout;
