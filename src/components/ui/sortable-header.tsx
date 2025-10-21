"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SortableHeaderProps {
  title: string;
  sortKey: string;
  currentSort: { key: string; direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
  className?: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  title,
  sortKey,
  currentSort,
  onSort,
  className
}) => {
  const isActive = currentSort?.key === sortKey;
  const direction = isActive ? currentSort.direction : null;

  const getSortIcon = () => {
    if (!isActive) return <ArrowUpDown className="h-4 w-4" />;
    return direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />;
  };

  const handleClick = () => {
    if (!isActive) {
      onSort(sortKey);
    } else if (direction === 'asc') {
      onSort(sortKey); // Will toggle to desc
    } else {
      onSort(sortKey); // Will toggle back to no sort
    }
  };

  return (
    <th className={cn("text-left py-3 px-4 font-medium text-gray-700", className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className="h-auto p-0 font-medium hover:bg-transparent justify-start"
      >
        {title}
        <span className="ml-2">{getSortIcon()}</span>
      </Button>
    </th>
  );
};

export default SortableHeader;