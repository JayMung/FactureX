"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface FilterTab {
    id: string;
    label: string;
    count?: number;
    icon?: React.ReactNode;
}

interface FilterTabsProps {
    tabs: FilterTab[];
    activeTab: string;
    onTabChange: (tabId: string) => void;
    className?: string;
    variant?: 'default' | 'pills' | 'underline' | 'dropdown';
}

/**
 * FilterTabs - Quick filter tabs with counters
 * Used for filtering data tables by status, type, or category
 */
export function FilterTabs({
    tabs,
    activeTab,
    onTabChange,
    className,
    variant = 'dropdown'
}: FilterTabsProps) {
    const activeTabData = tabs.find(t => t.id === activeTab) || tabs[0];

    // Dropdown variant (default)
    if (variant === 'dropdown') {
        return (
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        className={cn(
                            "inline-flex items-center gap-2 px-4 py-2 h-10 rounded-xl border-gray-200 bg-white hover:bg-gray-50",
                            className
                        )}
                    >
                        {activeTabData.icon}
                        <span>{activeTabData.label}</span>
                        {activeTabData.count !== undefined && (
                            <Badge
                                variant="secondary"
                                className="ml-1 text-xs px-2 py-0.5 rounded-full bg-emerald-500 text-white"
                            >
                                {activeTabData.count}
                            </Badge>
                        )}
                        <ChevronDown className="h-4 w-4 ml-1 text-gray-400" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[160px]">
                    {tabs.map((tab) => (
                        <DropdownMenuItem
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "cursor-pointer flex items-center justify-between",
                                activeTab === tab.id && "bg-gray-50"
                            )}
                        >
                            <span className="flex items-center gap-2">
                                {tab.icon}
                                {tab.label}
                            </span>
                            {tab.count !== undefined && (
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        "text-xs px-2 py-0.5 rounded-full",
                                        activeTab === tab.id
                                            ? "bg-emerald-500 text-white"
                                            : "bg-gray-100 text-gray-600"
                                    )}
                                >
                                    {tab.count}
                                </Badge>
                            )}
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
        );
    }

    if (variant === 'underline') {
        return (
            <div className={cn("border-b border-gray-200", className)}>
                <nav className="flex -mb-px space-x-6 overflow-x-auto scrollbar-hide" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                "group inline-flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-all duration-200",
                                activeTab === tab.id
                                    ? "border-emerald-500 text-emerald-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            )}
                        >
                            {tab.icon}
                            <span>{tab.label}</span>
                            {tab.count !== undefined && (
                                <Badge
                                    variant="secondary"
                                    className={cn(
                                        "ml-1 text-xs px-2 py-0.5 rounded-full transition-colors",
                                        activeTab === tab.id
                                            ? "bg-emerald-100 text-emerald-700"
                                            : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                                    )}
                                >
                                    {tab.count}
                                </Badge>
                            )}
                        </button>
                    ))}
                </nav>
            </div>
        );
    }

    // Pills variant (default)
    return (
        <div className={cn(
            "flex flex-wrap gap-2 p-1 bg-gray-100/80 rounded-xl",
            className
        )}>
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={cn(
                        "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                        activeTab === tab.id
                            ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                            : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                    )}
                >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                        <Badge
                            variant="secondary"
                            className={cn(
                                "ml-1 text-xs px-2 py-0.5 rounded-full min-w-[24px] text-center",
                                activeTab === tab.id
                                    ? "bg-emerald-500 text-white"
                                    : "bg-gray-200 text-gray-600"
                            )}
                        >
                            {tab.count}
                        </Badge>
                    )}
                </button>
            ))}
        </div>
    );
}

export default FilterTabs;
