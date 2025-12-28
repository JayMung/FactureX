"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Columns3, RotateCcw } from 'lucide-react';

export interface ColumnConfig {
    key: string;
    label: string;
    visible: boolean;
    required?: boolean; // Cannot be hidden
}

interface ColumnSelectorProps {
    columns: ColumnConfig[];
    onColumnsChange: (columns: ColumnConfig[]) => void;
    className?: string;
}

/**
 * ColumnSelector - Dropdown to toggle column visibility
 * Allows users to show/hide table columns
 */
export function ColumnSelector({
    columns,
    onColumnsChange,
    className
}: ColumnSelectorProps) {
    const [open, setOpen] = useState(false);

    const handleToggle = (key: string) => {
        const updated = columns.map(col =>
            col.key === key && !col.required
                ? { ...col, visible: !col.visible }
                : col
        );
        onColumnsChange(updated);
    };

    const handleReset = () => {
        const reset = columns.map(col => ({ ...col, visible: true }));
        onColumnsChange(reset);
    };

    const visibleCount = columns.filter(c => c.visible).length;

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="sm"
                    className={cn("gap-2", className)}
                >
                    <Columns3 className="h-4 w-4" />
                    <span className="hidden sm:inline">Colonnes</span>
                    <span className="text-xs text-gray-500">
                        ({visibleCount}/{columns.length})
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="flex items-center justify-between">
                    <span>Colonnes visibles</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleReset}
                        className="h-6 px-2 text-xs text-gray-500 hover:text-gray-900"
                    >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Réinitialiser
                    </Button>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <div className="p-2 space-y-2 max-h-[300px] overflow-y-auto">
                    {columns.map((column) => (
                        <label
                            key={column.key}
                            className={cn(
                                "flex items-center gap-3 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                                column.required
                                    ? "opacity-50 cursor-not-allowed"
                                    : "hover:bg-gray-100"
                            )}
                        >
                            <Checkbox
                                checked={column.visible}
                                onCheckedChange={() => handleToggle(column.key)}
                                disabled={column.required}
                                className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                            />
                            <span className="text-sm flex-1">{column.label}</span>
                            {column.required && (
                                <span className="text-xs text-gray-400">Requis</span>
                            )}
                        </label>
                    ))}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default ColumnSelector;
