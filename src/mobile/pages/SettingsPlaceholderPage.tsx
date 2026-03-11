import React from 'react';
import { ArrowLeft, Settings2 } from 'lucide-react';

export const SettingsPlaceholderPage = ({ title, onBack }: { title: string, onBack: () => void }) => {
  return (
    <div className="px-6 py-6 h-full flex flex-col">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-soft text-slate-600 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center -mt-20">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6 text-slate-400">
          <Settings2 size={40} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">Module en cours...</h3>
        <p className="text-sm text-slate-500 text-center max-w-[280px]">
          L'interface détaillée pour <strong>{title}</strong> sera connectée au backend FactureX très bientôt.
        </p>
      </div>
    </div>
  );
};
