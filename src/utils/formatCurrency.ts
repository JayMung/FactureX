export const formatCurrency = (amount: number, currency: string, isHidden?: boolean): string => {
  let formatted: string;
  if (currency === 'USD') {
    formatted = `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else if (currency === 'CDF') {
    formatted = `${amount.toLocaleString('fr-FR')} CDF`;
  } else if (currency === 'CNY') {
    formatted = `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  } else {
    formatted = amount.toString();
  }
  
  if (isHidden) {
    // Replace digits with • but preserve currency symbols and formatting
    return formatted.replace(/[0-9]/g, '•');
  }
  
  return formatted;
};

export const maskCurrencyValue = (value: string): string => {
  return value.replace(/[0-9]/g, '•');
};

export const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};
