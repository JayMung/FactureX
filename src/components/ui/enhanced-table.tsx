"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { MoreVertical } from 'lucide-react';

interface Column<T> {
  key: keyof T | string;
  title: string;
  sortable?: boolean;
  className?: string;
  cellClassName?: string;
  hidden?: boolean;
  hiddenOn?: 'md' | 'lg';
  align?: 'left' | 'center' | 'right';
  render?: (value: any, item: T, index: number) => React.ReactNode;
}

interface EnhancedTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  emptyMessage?: string;
  emptySubMessage?: string;
  onSort?: (key: string) => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  rowClassName?: (item: T, index: number) => string;
  actionsColumn?: {
    render: (item: T, index: number) => React.ReactNode;
    header?: string;
  };
  bulkSelect?: {
    selected: string[];
    onSelectAll: (checked: boolean) => void;
    onSelectItem: (id: string, checked: boolean) => void;
    getId: (item: T) => string;
    isAllSelected?: boolean;
    isPartiallySelected?: boolean;
  };
  className?: string;
}

export function EnhancedTable<T>({
  data,
  columns,
  loading = false,
  emptyMessage = "Aucune donnée trouvée",
  emptySubMessage = "Commencez par ajouter un nouvel élément",
  onSort,
  sortKey,
  sortDirection = 'asc',
  rowClassName,
  actionsColumn,
  bulkSelect,
  className
}: EnhancedTableProps<T>) {
  const handleSort = (column: Column<T>) => {
    if (column.sortable && onSort) {
      onSort(column.key as string);
    }
  };

  const getSortIcon = (column: Column<T>) => {
    if (!column.sortable || !onSort) return null;
    if (sortKey !== column.key) {
      return <span className="ml-2 opacity-50">↕️</span>;
    }
    return (
      <span className="ml-2">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="overflow-x-auto rounded-xl shadow-card border border-border">
        <table className="w-full min-w-[900px]">
          <thead className="table-header-gradient">
            <tr>
              {bulkSelect && (
                <th className="text-left py-4 px-3 md:px-4 font-semibold text-foreground text-sm w-12">
                  <Skeleton className="h-4 w-4" />
                </th>
              )}
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={cn(
                    "text-left py-4 px-3 md:px-4 font-semibold text-foreground text-sm",
                    column.hidden && "hidden",
                    column.hiddenOn === 'md' && "hidden md:table-cell",
                    column.hiddenOn === 'lg' && "hidden lg:table-cell",
                    column.align === 'center' && "text-center",
                    column.align === 'right' && "text-right",
                    column.className
                  )}
                >
                  <Skeleton className="h-4 w-20" />
                </th>
              ))}
              {actionsColumn && (
                <th className="text-center py-4 px-3 md:px-4 font-semibold text-foreground text-sm w-16">
                  <Skeleton className="h-4 w-4" />
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index} className="table-row-hover border-b border-border/50">
                {bulkSelect && (
                  <td className="py-3 px-3 md:px-4">
                    <Skeleton className="h-4 w-4" />
                  </td>
                )}
                {columns.map((column, colIndex) => (
                  <td
                    key={colIndex}
                    className={cn(
                      "py-3 px-3 md:px-4",
                      column.hidden && "hidden",
                      column.hiddenOn === 'md' && "hidden md:table-cell",
                      column.hiddenOn === 'lg' && "hidden lg:table-cell",
                      column.align === 'center' && "text-center",
                      column.align === 'right' && "text-right",
                      column.cellClassName
                    )}
                  >
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
                {actionsColumn && (
                  <td className="py-3 px-3 md:px-4">
                    <Skeleton className="h-4 w-4" />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
          <MoreVertical className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-lg">{emptyMessage}</p>
        <p className="text-muted-foreground/70 text-sm mt-2">{emptySubMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl shadow-card border border-border">
      <table className={cn("w-full min-w-[900px]", className)}>
        <thead className="table-header-gradient">
          <tr>
            {bulkSelect && (
              <th className="text-left py-4 px-3 md:px-4 font-semibold text-foreground text-sm w-12">
                <input
                  type="checkbox"
                  checked={bulkSelect.isAllSelected}
                  ref={(el) => {
                    if (el && bulkSelect.isPartiallySelected) {
                      el.indeterminate = bulkSelect.isPartiallySelected;
                    }
                  }}
                  onChange={(e) => bulkSelect.onSelectAll(e.target.checked)}
                  className="rounded border-input"
                  aria-label="Select all"
                />
              </th>
            )}
            {columns.map((column, index) => (
              <th
                key={index}
                className={cn(
                  "text-left py-4 px-3 md:px-4 font-semibold text-foreground text-sm",
                  column.hidden && "hidden",
                  column.hiddenOn === 'md' && "hidden md:table-cell",
                  column.hiddenOn === 'lg' && "hidden lg:table-cell",
                  column.align === 'center' && "text-center",
                  column.align === 'right' && "text-right",
                  column.sortable && "cursor-pointer hover:bg-accent/50 transition-colors duration-100",
                  column.className
                )}
                onClick={() => handleSort(column)}
                aria-sort={sortKey === column.key ? (sortDirection === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                <div className="inline-flex items-center gap-2 whitespace-nowrap text-sm">
                  {column.title}
                  {getSortIcon(column)}
                </div>
              </th>
            ))}
            {actionsColumn && (
              <th className="text-center py-4 px-3 md:px-4 font-semibold text-foreground text-sm w-16">
                <span className="flex items-center justify-center whitespace-nowrap">
                  {actionsColumn.header || <MoreVertical className="h-4 w-4" />}
                </span>
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {data.map((item, index) => (
            <tr
              key={bulkSelect?.getId(item) || index}
              className={cn(
                "table-row-hover border-b border-border/50",
                bulkSelect?.selected.includes(bulkSelect?.getId(item)) && "bg-primary/5",
                rowClassName?.(item, index)
              )}
            >
              {bulkSelect && (
                <td className="py-3 px-3 md:px-4">
                  <input
                    type="checkbox"
                    checked={bulkSelect.selected.includes(bulkSelect.getId(item))}
                    onChange={(e) => bulkSelect.onSelectItem(bulkSelect.getId(item), e.target.checked)}
                    className="rounded border-input"
                    aria-label="Select row"
                  />
                </td>
              )}
              {columns.map((column, colIndex) => {
                const value = column.key ? item[column.key as keyof T] : null;
                return (
                  <td
                    key={colIndex}
                    className={cn(
                      "py-3 px-3 md:px-4 text-sm",
                      column.hidden && "hidden",
                      column.hiddenOn === 'md' && "hidden md:table-cell",
                      column.hiddenOn === 'lg' && "hidden lg:table-cell",
                      column.align === 'center' && "text-center",
                      column.align === 'right' && "text-right",
                      column.cellClassName
                    )}
                  >
                    {column.render ? column.render(value, item, index) : value as React.ReactNode}
                  </td>
                );
              })}
              {actionsColumn && (
                <td className="py-3 px-3 md:px-4">
                  {actionsColumn.render(item, index)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default EnhancedTable;
