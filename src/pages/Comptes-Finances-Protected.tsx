import { withProtection } from '../components/auth/withProtection';
import ComptesFinances from './Comptes-Finances';

export default withProtection(ComptesFinances, {
  title: 'Comptes Financiers',
  subtitle: 'Gérez vos comptes et consultez l\'historique des mouvements',
  requiredModule: 'finances',
});
