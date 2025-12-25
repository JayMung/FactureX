import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PeriodFilter } from '@/utils/dateUtils';
import { Activity } from 'lucide-react';

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
    return (
        <Tabs
            value={period}
            onValueChange={(v) => onPeriodChange(v as PeriodFilter)}
            className={className}
        >
            <TabsList className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                <TabsTrigger value="day" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Jour
                </TabsTrigger>
                <TabsTrigger value="week" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Semaine
                </TabsTrigger>
                <TabsTrigger value="month" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Mois
                </TabsTrigger>
                <TabsTrigger value="year" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                    Année
                </TabsTrigger>
                {showAllOption && (
                    <TabsTrigger value="all" className="text-xs sm:text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        Tout
                    </TabsTrigger>
                )}
            </TabsList>
        </Tabs>
    );
};
