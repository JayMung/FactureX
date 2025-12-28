"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LayoutGrid, List, MoreVertical, ChevronRight } from 'lucide-react';

// Hook to detect mobile breakpoint
function useIsMobile(breakpoint: number = 768) {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < breakpoint);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, [breakpoint]);

    return isMobile;
}

export interface TableColumn<T> {
    key: keyof T | string;
    title: string;
    sortable?: boolean;
    className?: string;
    cellClassName?: string;
    visible?: boolean;
    hiddenOn?: 'sm' | 'md' | 'lg';
    align?: 'left' | 'center' | 'right';
    // Render for table mode
    render?: (value: any, item: T, index: number) => React.ReactNode;
    // Render for card mode (optional, uses render if not provided)
    renderCard?: (value: any, item: T) => React.ReactNode;
    // Show in card header
    isCardTitle?: boolean;
    // Show in card badge
    isCardBadge?: boolean;
}

export interface CardConfig<T> {
    // Primary title field
    titleKey: keyof T | string;
    titleRender?: (item: T, index: number) => React.ReactNode;
    // Subtitle field
    subtitleKey?: keyof T | string;
    subtitleRender?: (item: T, index: number) => React.ReactNode;
    // Badge/status field
    badgeKey?: keyof T | string;
    badgeRender?: (item: T, index: number) => React.ReactNode;
    // Additional info fields to show in card
    infoFields?: Array<{
        key: keyof T | string;
        label: string;
        render?: (value: any, item: T) => React.ReactNode;
    }>;
}

interface UnifiedDataTableProps<T> {
    data: T[];
    columns: TableColumn<T>[];
    cardConfig?: CardConfig<T>;
    loading?: boolean;
    emptyMessage?: string;
    emptySubMessage?: string;
    emptyIcon?: React.ReactNode;
    onSort?: (key: string) => void;
    sortKey?: string;
    sortDirection?: 'asc' | 'desc';
    rowClassName?: (item: T, index: number) => string;
    onRowClick?: (item: T, index: number) => void;
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
    // View mode control
    viewMode?: 'table' | 'cards' | 'auto';
    onViewModeChange?: (mode: 'table' | 'cards') => void;
    showViewToggle?: boolean;
}

/**
 * UnifiedDataTable - A responsive data table with table and card view modes
 * Automatically switches to card view on mobile when viewMode is 'auto'
 */
export function UnifiedDataTable<T>({
    data,
    columns,
    cardConfig,
    loading = false,
    emptyMessage = "Aucune donnée trouvée",
    emptySubMessage = "Commencez par ajouter un nouvel élément",
    emptyIcon,
    onSort,
    sortKey,
    sortDirection = 'asc',
    rowClassName,
    onRowClick,
    actionsColumn,
    bulkSelect,
    className,
    viewMode = 'auto',
    onViewModeChange,
    showViewToggle = true
}: UnifiedDataTableProps<T>) {
    const isMobile = useIsMobile();
    const [localViewMode, setLocalViewMode] = useState<'table' | 'cards'>(
        viewMode === 'auto' ? (isMobile ? 'cards' : 'table') : viewMode
    );

    // Update view mode when auto and screen size changes
    useEffect(() => {
        if (viewMode === 'auto') {
            setLocalViewMode(isMobile ? 'cards' : 'table');
        } else {
            setLocalViewMode(viewMode);
        }
    }, [isMobile, viewMode]);

    const handleViewModeToggle = () => {
        const newMode = localViewMode === 'table' ? 'cards' : 'table';
        setLocalViewMode(newMode);
        onViewModeChange?.(newMode);
    };

    // Filter visible columns
    const visibleColumns = useMemo(() =>
        columns.filter(col => col.visible !== false),
        [columns]
    );

    const handleSort = (column: TableColumn<T>) => {
        if (column.sortable && onSort) {
            onSort(column.key as string);
        }
    };

    const getSortIcon = (column: TableColumn<T>) => {
        if (!column.sortable || !onSort) return null;
        if (sortKey !== column.key) {
            return <span className="ml-2 opacity-40 text-xs">↕</span>;
        }
        return (
            <span className="ml-2 text-emerald-600">
                {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
        );
    };

    // Render loading state
    if (loading) {
        return (
            <div className="space-y-4">
                {showViewToggle && (
                    <div className="flex justify-end">
                        <Skeleton className="h-9 w-24" />
                    </div>
                )}
                {localViewMode === 'table' ? (
                    <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-100">
                        <table className="w-full min-w-[900px]">
                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                                <tr>
                                    {bulkSelect && <th className="py-4 px-4 w-12"><Skeleton className="h-4 w-4" /></th>}
                                    {visibleColumns.map((col, i) => (
                                        <th key={i} className="py-4 px-4"><Skeleton className="h-4 w-20" /></th>
                                    ))}
                                    {actionsColumn && <th className="py-4 px-4 w-16"><Skeleton className="h-4 w-8" /></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="border-b border-gray-50">
                                        {bulkSelect && <td className="py-4 px-4"><Skeleton className="h-4 w-4" /></td>}
                                        {visibleColumns.map((col, j) => (
                                            <td key={j} className="py-4 px-4"><Skeleton className="h-4 w-full" /></td>
                                        ))}
                                        {actionsColumn && <td className="py-4 px-4"><Skeleton className="h-4 w-8" /></td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-5 w-3/4" />
                                        <Skeleton className="h-4 w-1/2" />
                                    </div>
                                    <Skeleton className="h-6 w-16 rounded-full" />
                                </div>
                                <div className="space-y-2">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Render empty state
    if (data.length === 0) {
        return (
            <div className="text-center py-16 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                <div className="h-16 w-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    {emptyIcon || <MoreVertical className="h-8 w-8 text-gray-400" />}
                </div>
                <p className="text-gray-600 text-lg font-medium">{emptyMessage}</p>
                <p className="text-gray-400 text-sm mt-1">{emptySubMessage}</p>
            </div>
        );
    }

    // View toggle button
    const viewToggle = showViewToggle && (
        <div className="flex justify-end mb-4">
            <div className="inline-flex bg-gray-100 rounded-lg p-1">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setLocalViewMode('table'); onViewModeChange?.('table'); }}
                    className={cn(
                        "gap-2 px-3",
                        localViewMode === 'table' && "bg-white shadow-sm"
                    )}
                >
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">Table</span>
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setLocalViewMode('cards'); onViewModeChange?.('cards'); }}
                    className={cn(
                        "gap-2 px-3",
                        localViewMode === 'cards' && "bg-white shadow-sm"
                    )}
                >
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline">Cartes</span>
                </Button>
            </div>
        </div>
    );

    // Render table view
    if (localViewMode === 'table') {
        return (
            <div className={className}>
                {viewToggle}
                <div className="overflow-x-auto rounded-xl shadow-sm border border-gray-100">
                    <table className="w-full min-w-[900px]">
                        <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
                            <tr>
                                {bulkSelect && (
                                    <th className="text-left py-4 px-4 font-semibold text-gray-800 text-sm w-12">
                                        <input
                                            type="checkbox"
                                            checked={bulkSelect.isAllSelected}
                                            ref={(el) => {
                                                if (el && bulkSelect.isPartiallySelected) {
                                                    el.indeterminate = bulkSelect.isPartiallySelected;
                                                }
                                            }}
                                            onChange={(e) => bulkSelect.onSelectAll(e.target.checked)}
                                            className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                                        />
                                    </th>
                                )}
                                {visibleColumns.map((column, index) => (
                                    <th
                                        key={index}
                                        className={cn(
                                            "text-left py-4 px-4 font-semibold text-gray-800 text-sm",
                                            column.hiddenOn === 'sm' && "hidden sm:table-cell",
                                            column.hiddenOn === 'md' && "hidden md:table-cell",
                                            column.hiddenOn === 'lg' && "hidden lg:table-cell",
                                            column.align === 'center' && "text-center",
                                            column.align === 'right' && "text-right",
                                            column.sortable && "cursor-pointer hover:bg-blue-100/50 transition-colors",
                                            column.className
                                        )}
                                        onClick={() => handleSort(column)}
                                    >
                                        <div className="inline-flex items-center gap-1 whitespace-nowrap">
                                            {column.title}
                                            {getSortIcon(column)}
                                        </div>
                                    </th>
                                ))}
                                {actionsColumn && (
                                    <th className="text-center py-4 px-4 font-semibold text-gray-800 text-sm w-16">
                                        <span className="flex items-center justify-center">
                                            {actionsColumn.header || <MoreVertical className="h-4 w-4" />}
                                        </span>
                                    </th>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {data.map((item, index) => (
                                <tr
                                    key={bulkSelect?.getId(item) || index}
                                    onClick={() => onRowClick?.(item, index)}
                                    className={cn(
                                        "hover:bg-gradient-to-r hover:from-blue-50/30 hover:to-indigo-50/30 transition-all duration-200",
                                        bulkSelect?.selected.includes(bulkSelect?.getId(item)) && "bg-blue-50/50",
                                        onRowClick && "cursor-pointer",
                                        rowClassName?.(item, index)
                                    )}
                                >
                                    {bulkSelect && (
                                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={bulkSelect.selected.includes(bulkSelect.getId(item))}
                                                onChange={(e) => bulkSelect.onSelectItem(bulkSelect.getId(item), e.target.checked)}
                                                className="rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                                            />
                                        </td>
                                    )}
                                    {visibleColumns.map((column, colIndex) => {
                                        const value = column.key ? (item as any)[column.key as string] : null;
                                        return (
                                            <td
                                                key={colIndex}
                                                className={cn(
                                                    "py-4 px-4",
                                                    column.hiddenOn === 'sm' && "hidden sm:table-cell",
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
                                        <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
                                            {actionsColumn.render(item, index)}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    // Render cards view
    return (
        <div className={className}>
            {viewToggle}
            <div className="grid gap-4 sm:grid-cols-2">
                {data.map((item, index) => {
                    const id = bulkSelect?.getId(item);
                    const isSelected = id && bulkSelect?.selected.includes(id);

                    // Get card display values
                    const titleValue = cardConfig?.titleKey
                        ? (item as any)[cardConfig.titleKey as string]
                        : (item as any)[visibleColumns[0]?.key as string];

                    const subtitleValue = cardConfig?.subtitleKey
                        ? (item as any)[cardConfig.subtitleKey as string]
                        : null;

                    return (
                        <div
                            key={id || index}
                            onClick={() => onRowClick?.(item, index)}
                            className={cn(
                                "bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-200",
                                isSelected ? "border-emerald-300 ring-2 ring-emerald-100" : "border-gray-100",
                                onRowClick && "cursor-pointer hover:shadow-md hover:border-gray-200",
                                rowClassName?.(item, index)
                            )}
                        >
                            {/* Card Header */}
                            <div className="p-4 border-b border-gray-50">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        {bulkSelect && (
                                            <input
                                                type="checkbox"
                                                checked={isSelected || false}
                                                onChange={(e) => {
                                                    e.stopPropagation();
                                                    if (id) bulkSelect.onSelectItem(id, e.target.checked);
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                className="mt-1 rounded border-gray-300 text-emerald-500 focus:ring-emerald-500"
                                            />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-gray-900 truncate">
                                                {cardConfig?.titleRender
                                                    ? cardConfig.titleRender(item, index)
                                                    : titleValue}
                                            </h3>
                                            {subtitleValue && (
                                                <p className="text-sm text-gray-500 mt-0.5 truncate">
                                                    {cardConfig?.subtitleRender
                                                        ? cardConfig.subtitleRender(item, index)
                                                        : subtitleValue}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    {cardConfig?.badgeRender && (
                                        <div className="shrink-0">
                                            {cardConfig.badgeRender(item, index)}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card Body - Info Fields */}
                            {cardConfig?.infoFields && cardConfig.infoFields.length > 0 && (
                                <div className="p-4 space-y-2">
                                    {cardConfig.infoFields.map((field, i) => {
                                        const fieldValue = (item as any)[field.key as string];
                                        return (
                                            <div key={i} className="flex items-center justify-between text-sm">
                                                <span className="text-gray-500">{field.label}</span>
                                                <span className="font-medium text-gray-900">
                                                    {field.render
                                                        ? field.render(fieldValue, item)
                                                        : fieldValue}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Card Actions */}
                            {actionsColumn && (
                                <div
                                    className="px-4 py-3 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex-1">
                                        {actionsColumn.render(item, index)}
                                    </div>
                                    {onRowClick && (
                                        <ChevronRight className="h-5 w-5 text-gray-400" />
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default UnifiedDataTable;
