import React from 'react';
import type { Transaction } from '@/types';

interface TransactionFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  transaction?: Transaction | undefined;
}

const TransactionForm: React.FC<TransactionFormProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess,
  transaction 
}) => {
  return (
    <div>
      {/* TODO: Implémenter le formulaire de transaction */}
      <p>Formulaire de transaction - {transaction ? 'Édition' : 'Création'}</p>
    </div>
  );
};

export default TransactionForm;