import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Camera, Upload, Check } from 'lucide-react';

export const ScannerPage = ({ onBack }: { onBack: () => void }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      setScanResult({
        merchant: 'Amazon France',
        date: '10 Mars 2026',
        amount: 45.99,
        category: 'Fournitures'
      });
    }, 2500);
  };

  return (
    <div className="px-6 py-6 h-full flex flex-col">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-white shadow-soft text-slate-600 active:scale-90 transition-transform"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-2xl font-bold text-slate-900">Scanner</h2>
      </div>

      {!scanResult ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-8 min-h-[50vh]">
          <div className="relative">
            <div className="w-64 h-64 border-2 border-dashed border-primary/30 rounded-[3rem] flex items-center justify-center overflow-hidden">
              {isScanning ? (
                <motion.div 
                  animate={{ y: [-100, 100, -100] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="w-full h-1 bg-primary shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10"
                />
              ) : (
                <Camera size={48} className="text-slate-200" />
              )}
              <div className="absolute inset-0 bg-slate-50/50" />
            </div>
            <div className="absolute -top-4 -left-4 w-12 h-12 border-t-4 border-l-4 border-primary rounded-tl-2xl" />
            <div className="absolute -top-4 -right-4 w-12 h-12 border-t-4 border-r-4 border-primary rounded-tr-2xl" />
            <div className="absolute -bottom-4 -left-4 w-12 h-12 border-b-4 border-l-4 border-primary rounded-bl-2xl" />
            <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-4 border-r-4 border-primary rounded-br-2xl" />
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-lg font-bold text-slate-900">Numérisez vos reçus</h3>
            <p className="text-sm text-slate-500 max-w-[250px]">L'IA extrait automatiquement les données de vos documents.</p>
          </div>

          <div className="flex flex-col w-full gap-4">
            <button 
              onClick={handleScan}
              disabled={isScanning}
              className="w-full py-4 bg-primary text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
            >
              {isScanning ? 'Analyse en cours...' : 'Prendre une photo'}
            </button>
            <button className="w-full py-4 bg-white border border-slate-100 text-slate-700 font-bold rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all">
              <Upload size={18} />
              Importer un fichier
            </button>
          </div>
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mb-4">
              <Check size={32} />
            </div>
            <h3 className="text-lg font-bold text-emerald-900">Document analysé !</h3>
            <p className="text-sm text-emerald-600">Les données ont été extraites avec succès.</p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-slate-50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Marchand</span>
              <span className="text-sm font-bold text-slate-900">{scanResult.merchant}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Date</span>
              <span className="text-sm font-bold text-slate-900">{scanResult.date}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-slate-50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Montant</span>
              <span className="text-sm font-bold text-primary">${scanResult.amount}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Catégorie</span>
              <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full">{scanResult.category}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-auto">
            <button 
              onClick={() => setScanResult(null)}
              className="flex-1 py-4 bg-slate-100 text-slate-600 font-bold rounded-2xl active:scale-95 transition-all"
            >
              Recommencer
            </button>
            <button className="flex-[2] py-4 bg-primary text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all">
              Enregistrer la dépense
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
