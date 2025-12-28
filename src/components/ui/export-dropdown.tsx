"use client";

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Download, FileSpreadsheet, FileText, ChevronDown, Loader2 } from 'lucide-react';

type ExportFormat = 'csv' | 'excel' | 'pdf';

interface ExportDropdownProps {
    onExport: (format: ExportFormat) => void | Promise<void>;
    disabled?: boolean;
    className?: string;
    label?: string;
    selectedCount?: number;
}

/**
 * ExportDropdown - Enhanced export button with format options
 * Supports CSV, Excel, and PDF export
 */
export function ExportDropdown({
    onExport,
    disabled = false,
    className,
    label = "Exporter",
    selectedCount = 0
}: ExportDropdownProps) {
    const [isExporting, setIsExporting] = useState<ExportFormat | null>(null);

    const handleExport = async (format: ExportFormat) => {
        setIsExporting(format);
        try {
            await onExport(format);
        } finally {
            setIsExporting(null);
        }
    };

    const isLoading = isExporting !== null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="default"
                    className={cn(
                        "bg-emerald-500 hover:bg-emerald-600 text-white gap-2",
                        className
                    )}
                    disabled={disabled || isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="h-4 w-4" />
                    )}
                    <span>{label}</span>
                    {selectedCount > 0 && (
                        <span className="bg-white/20 px-1.5 py-0.5 rounded text-xs">
                            {selectedCount}
                        </span>
                    )}
                    <ChevronDown className="h-4 w-4 ml-1" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                    onClick={() => handleExport('csv')}
                    disabled={isLoading}
                    className="gap-3 cursor-pointer"
                >
                    <FileText className="h-4 w-4 text-green-600" />
                    <div className="flex flex-col">
                        <span>CSV</span>
                        <span className="text-xs text-gray-500">Tableur simple</span>
                    </div>
                    {isExporting === 'csv' && (
                        <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                    )}
                </DropdownMenuItem>

                <DropdownMenuItem
                    onClick={() => handleExport('excel')}
                    disabled={isLoading}
                    className="gap-3 cursor-pointer"
                >
                    <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
                    <div className="flex flex-col">
                        <span>Excel</span>
                        <span className="text-xs text-gray-500">Format .xlsx</span>
                    </div>
                    {isExporting === 'excel' && (
                        <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                    )}
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    onClick={() => handleExport('pdf')}
                    disabled={isLoading}
                    className="gap-3 cursor-pointer"
                >
                    <FileText className="h-4 w-4 text-red-600" />
                    <div className="flex flex-col">
                        <span>PDF</span>
                        <span className="text-xs text-gray-500">Document imprimable</span>
                    </div>
                    {isExporting === 'pdf' && (
                        <Loader2 className="h-4 w-4 animate-spin ml-auto" />
                    )}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default ExportDropdown;
