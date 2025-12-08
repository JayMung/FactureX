import React from 'react';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import ComptesFinances from './Comptes-Finances';

const ComptesFinancesProtected: React.FC = () => {
  usePageSetup({
    title: 'Comptes Financiers',
    subtitle: 'Gérez vos comptes et consultez l\'historique des mouvements'
  });

  return (
    <Layout>
      <ComptesFinances />
    </Layout>
  );
};

export default ComptesFinancesProtected;
