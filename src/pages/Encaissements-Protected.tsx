import React from 'react';
import Layout from '../components/layout/Layout';
import { usePageSetup } from '../hooks/use-page-setup';
import Encaissements from './Encaissements';

const EncaissementsProtected: React.FC = () => {
  usePageSetup({
    title: 'Encaissements',
    subtitle: 'Enregistrez les paiements des factures et colis'
  });

  return (
    <Layout>
      <Encaissements />
    </Layout>
  );
};

export default EncaissementsProtected;
