/**
 * Composant wrapper pour les onglets Settings avec lazy loading
 * Optimise les performances en chargeant les onglets à la demande
 */

import { lazy, Suspense, memo } from 'react';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { fadeVariants, transitions } from '@/lib/animations';

// Lazy loading des composants lourds
const CompanySettings = lazy(() => import('./CompanySettings').then(m => ({ default: m.CompanySettings })));
const SettingsFacture = lazy(() => import('../../pages/Settings-Facture').then(m => ({ default: m.SettingsFacture })));

interface SettingsTabContentProps {
  activeTab: string;
  children?: React.ReactNode;
}

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin text-green-500" />
  </div>
);

const SettingsTabContent: React.FC<SettingsTabContentProps> = memo(({ activeTab, children }) => {
  // Si children est fourni, on l'affiche directement (pour les onglets simples)
  if (children) {
    return (
      <motion.div
        key={activeTab}
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={transitions.fast}
      >
        {children}
      </motion.div>
    );
  }

  // Lazy loading pour les composants lourds
  return (
    <Suspense fallback={<LoadingFallback />}>
      <motion.div
        key={activeTab}
        variants={fadeVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        transition={transitions.fast}
      >
        {activeTab === 'company' && <CompanySettings />}
        {activeTab === 'factures' && <SettingsFacture />}
      </motion.div>
    </Suspense>
  );
});

SettingsTabContent.displayName = 'SettingsTabContent';

export default SettingsTabContent;
