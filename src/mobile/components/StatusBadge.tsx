import React from 'react';
import { ActivityItem } from '../types';

export const StatusBadge = ({ status }: { status: ActivityItem['status'] | string }) => {
  const styles: Record<string, string> = {
    'Payé': 'bg-emerald-50 text-emerald-600',
    'En attente': 'bg-amber-50 text-amber-600',
    'Retard': 'bg-red-50 text-red-600',
    'Brouillon': 'bg-slate-100 text-slate-600',
    'En cours': 'bg-blue-50 text-blue-600',
    'Livré': 'bg-emerald-50 text-emerald-600',
    'Servi': 'bg-emerald-50 text-emerald-600',
  };

  const badgeStyle = styles[status] || 'bg-slate-100 text-slate-600';

  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeStyle}`}>
      {status}
    </span>
  );
};
