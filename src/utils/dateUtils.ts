import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears, format } from 'date-fns';

export type PeriodFilter = 'day' | 'week' | 'month' | 'year' | 'all';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export const getDateRange = (period: PeriodFilter): { current: DateRange; previous: DateRange } => {
  const now = new Date();

  if (period === 'all') {
    return {
      current: { start: null, end: null },
      previous: { start: null, end: null }
    };
  }

  switch (period) {
    case 'day':
      return {
        current: { start: startOfDay(now), end: endOfDay(now) },
        previous: { start: startOfDay(subDays(now, 1)), end: endOfDay(subDays(now, 1)) }
      };
    case 'week':
      return {
        current: { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) },
        previous: { start: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }), end: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }) }
      };
    case 'month':
      return {
        current: { start: startOfMonth(now), end: endOfMonth(now) },
        previous: { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) }
      };
    case 'year':
      return {
        current: { start: startOfYear(now), end: endOfYear(now) },
        previous: { start: startOfYear(subYears(now, 1)), end: endOfYear(subYears(now, 1)) }
      };
    default:
      return {
        current: { start: startOfMonth(now), end: endOfMonth(now) },
        previous: { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) }
      };
  }
};

export const getPeriodLabel = (period: PeriodFilter): string => {
  if (period === 'all') return 'Tout le temps';

  const now = new Date();
  const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short', year: 'numeric' };

  switch (period) {
    case 'day':
      return now.toLocaleDateString('fr-FR', options);
    case 'week':
      const weekStart = startOfWeek(now, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
      return `${weekStart.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - ${weekEnd.toLocaleDateString('fr-FR', options)}`;
    case 'month':
      return now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    case 'year':
      return now.getFullYear().toString();
    default:
      return '';
  }
};

export const formatDateForInput = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

export const getTodayDateString = (): string => {
  return formatDateForInput(new Date());
};
