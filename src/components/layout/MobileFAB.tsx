import React, { useState } from 'react';
import { Plus, ReceiptText, ArrowRightLeft, Package, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export const MobileFAB = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    navigate(path);
  };

  return (
    <div className="lg:hidden">
      {/* Floating Action Button */}
      <div className="fixed bottom-[96px] right-6 z-40">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(true)}
          className="w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center border border-white/20"
        >
          <Plus size={28} />
        </motion.button>
      </div>

      {/* Options Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed bottom-0 left-0 w-full bg-white rounded-t-[2.5rem] p-8 pt-10 z-[60] shadow-2xl"
            >
              <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-8 cursor-grab active:cursor-grabbing" onClick={() => setIsOpen(false)} />
              
              <h3 className="text-xl font-bold text-slate-900 mb-6 px-2">Créer Nouveau</h3>
              
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: ReceiptText, label: 'Facture', color: 'bg-blue-50 text-blue-600', path: '/factures/new' },
                  { icon: ReceiptText, label: 'Devis', color: 'bg-rose-50 text-rose-600', path: '/factures/new?type=devis' },
                  { icon: ArrowRightLeft, label: 'Transaction', color: 'bg-indigo-50 text-indigo-600', path: '/transactions?new=true' },
                  { icon: Package, label: 'Colis Aérien', color: 'bg-amber-50 text-amber-600', path: '/colis/aeriens/nouveau' },
                  { icon: Package, label: 'Colis Maritime', color: 'bg-cyan-50 text-cyan-600', path: '/colis/maritime?new=true' },
                  { icon: Users, label: 'Client', color: 'bg-purple-50 text-purple-600', path: '/clients?new=true' },
                ].map((item) => (
                  <button
                    key={item.label}
                    onClick={() => handleNavigate(item.path)}
                    className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-slate-50 hover:bg-slate-100 transition-colors group border border-slate-100/50"
                  >
                    <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <item.icon size={24} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{item.label}</span>
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setIsOpen(false)}
                className="w-full mt-8 py-4 text-slate-500 font-bold text-sm bg-slate-100 rounded-2xl hover:bg-slate-200 transition-colors"
              >
                Annuler
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
