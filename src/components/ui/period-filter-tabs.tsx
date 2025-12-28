import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodFilter } from '@/utils/dateUtils';

interface PeriodFilterTabsProps {
    period: PeriodFilter;
    onPeriodChange: (period: PeriodFilter) => void;
    showAllOption?: boolean;
    className?: string;
}

export const PeriodFilterTabs: React.FC<PeriodFilterTabsProps> = ({
    period,
    onPeriodChange,
    showAllOption = false,
    className
}) => {
    const triggerClasses = `text-[10px] sm:text-xs md:text-sm px-2 sm:px-3 py-1.5 rounded-lg font-medium transition-all
        text-gray-500 dark:text-gray-400
        hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-700/50
        data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-emerald-500/20`;

    return (
        <Tabs
            value={period}
            onValueChange={(v) => onPeriodChange(v as PeriodFilter)}
            className={className}
        >
            <TabsList className="bg-gray-100/80 dark:bg-gray-800/80 p-1 sm:p-1.5 rounded-xl gap-0.5 sm:gap-1 h-auto flex-wrap">
                <TabsTrigger value="day" className={triggerClasses}>
                    <span className="hidden sm:inline">Jour</span>
                    <span className="sm:hidden">J</span>
                </TabsTrigger>
                <TabsTrigger value="week" className={triggerClasses}>
                    <span className="hidden sm:inline">Semaine</span>
                    <span className="sm:hidden">S</span>
                </TabsTrigger>
                <TabsTrigger value="month" className={triggerClasses}>
                    <span className="hidden sm:inline">Mois</span>
                    <span className="sm:hidden">M</span>
                </TabsTrigger>
                <TabsTrigger value="year" className={triggerClasses}>
                    <span className="hidden sm:inline">Année</span>
                    <span className="sm:hidden">A</span>
                </TabsTrigger>
                {showAllOption && (
                    <TabsTrigger value="all" className={triggerClasses}>
                        Tout
                    </TabsTrigger>
                )}
            </TabsList>
        </Tabs>
    );
};
