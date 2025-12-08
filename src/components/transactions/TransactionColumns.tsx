import React from 'react';
import { Badge } from '@/components/ui/badge';
import { ActionMenu } from './ActionMenu';
import { StatusBadge } from './StatusBadge';
import type { Transaction } from '@/types';
import { sanitizeUserContent, sanitizeTransactionMotif, sanitizePaymentMethod } from '@/lib/security/content-sanitization';

// Fonction utilitaire pour le formatage des montants
const formatCurrencyValue = (amount: number, currency: string) => {
  if (currency === 'USD') {
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'CDF') {
    return `${amount.toLocaleString('fr-FR')} CDF`;
  } else if (currency === 'CNY') {
    return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return amount.toString();
};

// Fonction utilitaire pour générer un ID lisible
const generateReadableId = (transaction: Transaction, index: number, activeTab?: string) => {
  const shortId = transaction.id.slice(-6).toUpperCase();
  const paddedNumber = (index + 1).toString().padStart(3, '0');

  let prefix = 'TX';

  if (activeTab === 'clients') prefix = 'TC';
  else if (activeTab === 'internes') prefix = 'OI';
  else if (activeTab === 'swaps') prefix = 'SW';
  else {
    // Fallback logic if activeTab is not provided (should depend on context)
    if (transaction.type_transaction === 'depense') prefix = 'OI'; // Dépense -> Interne
    else if (transaction.type_transaction === 'revenue' && !transaction.client_id) prefix = 'OI'; // Revenu interne -> Interne
    else if (transaction.type_transaction === 'transfert') prefix = 'SW'; // Transfert -> Swap
    else prefix = 'TC'; // Par défaut -> Client
  }

  return `${prefix}${paddedNumber}-${shortId}`;
};

interface GetTransactionColumnsProps {
  activeTab: 'clients' | 'internes' | 'swaps';
  onView: (t: Transaction) => void;
  onEdit: (t: Transaction) => void;
  onDuplicate: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
  onStatusChange: (t: Transaction, status: string) => void;
  canUpdate: boolean;
  canDelete: boolean;
}

export const getTransactionColumns = ({
  activeTab,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onStatusChange,
  canUpdate,
  canDelete
}: GetTransactionColumnsProps) => {

  const commonActionsColumn = {
    key: 'actions',
    title: '',
    sortable: false,
    className: 'w-10',
    render: (_: any, transaction: Transaction) => (
      <ActionMenu
        transaction={transaction}
        onView={onView}
        onEdit={onEdit}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        canUpdate={canUpdate}
        canDelete={canDelete}
      />
    )
  };

  if (activeTab === 'clients') {
    return [
      {
        key: 'id',
        title: 'ID',
        sortable: true,
        className: 'min-w-[120px]',
        render: (_: any, transaction: Transaction, index: number) => (
          <button
            onClick={() => onView(transaction)}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            {generateReadableId(transaction, index, activeTab)}
          </button>
        )
      },
      {
        key: 'client',
        title: 'Client',
        sortable: true,
        render: (value: any) => (
          <span>{sanitizeUserContent(value?.nom || 'Client inconnu', 'client-name')}</span>
        )
      },
      {
        key: 'date_paiement',
        title: 'Date',
        sortable: true,
        render: (value: any) => (
          <span className="text-sm text-gray-600">
            {new Date(value).toLocaleDateString('fr-FR')}
          </span>
        )
      },
      {
        key: 'montant',
        title: 'Montant',
        sortable: true,
        render: (value: any, transaction: Transaction) => (
          <span className="font-medium">
            {formatCurrencyValue(value, transaction.devise)}
          </span>
        )
      },
      {
        key: 'motif',
        title: 'Motif',
        sortable: true,
        render: (value: any) => (
          <Badge variant={(value === 'Commande' ? 'default' : 'secondary') as any}>
            {sanitizeTransactionMotif(value || '')}
          </Badge>
        )
      },
      {
        key: 'statut',
        title: 'Statut',
        sortable: true,
        render: (value: any, transaction: Transaction) => (
          <StatusBadge
            status={value}
            transaction={transaction}
            onStatusChange={onStatusChange}
            canUpdate={canUpdate}
          />
        )
      },
      {
        key: 'frais',
        title: 'Frais',
        sortable: true,
        render: (value: any) => (
          <span className="text-sm">
            {formatCurrencyValue(value, 'USD')}
          </span>
        )
      },
      {
        key: 'benefice',
        title: 'Bénéfice',
        sortable: true,
        render: (value: any) => (
          <span className="text-sm font-medium text-green-600">
            {formatCurrencyValue(value, 'USD')}
          </span>
        )
      },
      {
        key: 'montant_cny',
        title: 'CNY',
        sortable: true,
        render: (value: any) => (
          <span className="text-sm font-medium text-blue-600">
            {value ? formatCurrencyValue(value, 'CNY') : '-'}
          </span>
        )
      },
      {
        key: 'mode_paiement',
        title: 'Compte',
        sortable: true,
        render: (value: any) => (
          <span className="text-sm font-medium">
            {sanitizePaymentMethod(value || '-')}
          </span>
        )
      },
      commonActionsColumn
    ];
  }

  if (activeTab === 'internes') {
    return [
      {
        key: 'id',
        title: 'ID',
        sortable: true,
        className: 'min-w-[100px]',
        render: (_: any, transaction: Transaction, index: number) => (
          <button
            onClick={() => onView(transaction)}
            className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
          >
            {generateReadableId(transaction, index, activeTab)}
          </button>
        )
      },
      {
        key: 'date_paiement',
        title: 'Date',
        sortable: true,
        render: (value: any) => (
          <span className="text-sm text-gray-600">
            {new Date(value).toLocaleDateString('fr-FR')}
          </span>
        )
      },
      {
        key: 'type_transaction',
        title: 'Type',
        sortable: true,
        render: (value: any) => (
          <Badge variant={value === 'depense' ? 'destructive' : 'default'} className={value === 'depense' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}>
            {value === 'depense' ? '↓ Dépense' : '↑ Revenu'}
          </Badge>
        )
      },
      {
        key: 'montant',
        title: 'Montant',
        sortable: true,
        render: (value: any, transaction: Transaction) => (
          <span className={`font-bold ${transaction.type_transaction === 'depense' ? 'text-red-600' : 'text-green-600'}`}>
            {transaction.type_transaction === 'depense' ? '-' : '+'}{formatCurrencyValue(value, transaction.devise)}
          </span>
        )
      },
      {
        key: 'motif',
        title: 'Motif',
        sortable: true,
        render: (value: any) => (
          <span className="text-sm">{sanitizeTransactionMotif(value || '-')}</span>
        )
      },
      {
        key: 'categorie',
        title: 'Catégorie',
        sortable: true,
        render: (value: any) => (
          <Badge variant="outline" className="bg-gray-50">
            {value || '-'}
          </Badge>
        )
      },
      {
        key: 'compte_destination',
        title: 'Compte',
        sortable: false,
        render: (_: any, transaction: Transaction) => (
          <span className="text-sm font-medium">
            {transaction.compte_destination?.nom || transaction.compte_source?.nom || transaction.mode_paiement || '-'}
          </span>
        )
      },
      commonActionsColumn
    ];
  }

  // activeTab === 'swaps'
  return [
    {
      key: 'id',
      title: 'ID',
      sortable: true,
      className: 'min-w-[100px]',
      render: (_: any, transaction: Transaction, index: number) => (
        <button
          onClick={() => onView(transaction)}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
        >
          {generateReadableId(transaction, index, activeTab)}
        </button>
      )
    },
    {
      key: 'date_paiement',
      title: 'Date',
      sortable: true,
      render: (value: any) => (
        <span className="text-sm text-gray-600">
          {new Date(value).toLocaleDateString('fr-FR')}
        </span>
      )
    },
    {
      key: 'compte_source',
      title: 'Source',
      sortable: false,
      render: (_: any, transaction: Transaction) => (
        <span className="text-sm font-medium text-red-600">
          {transaction.compte_source?.nom || transaction.mode_paiement || '-'}
        </span>
      )
    },
    {
      key: 'compte_destination',
      title: 'Destination',
      sortable: false,
      render: (_: any, transaction: Transaction) => (
        <span className="text-sm font-medium text-green-600">
          {transaction.compte_destination?.nom || '-'}
        </span>
      )
    },
    {
      key: 'montant',
      title: 'Montant',
      sortable: true,
      render: (value: any, transaction: Transaction) => (
        <span className="font-bold text-blue-600">
          {formatCurrencyValue(value, transaction.devise)}
        </span>
      )
    },
    {
      key: 'notes',
      title: 'Notes',
      sortable: false,
      render: (value: any) => (
        <span className="text-sm text-gray-500 truncate max-w-[150px] block">
          {value || '-'}
        </span>
      )
    },
    commonActionsColumn
  ];
};
