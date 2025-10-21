"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PageInfo {
  title: string;
  subtitle?: string;
}

interface PageContextType {
  pageInfo: PageInfo;
  setPageInfo: (info: PageInfo) => void;
}

const PageContext = createContext<PageContextType | undefined>(undefined);

interface PageProviderProps {
  children: ReactNode;
}

export const PageProvider: React.FC<PageProviderProps> = ({ children }) => {
  const [pageInfo, setPageInfo] = useState<PageInfo>({
    title: 'Tableau de bord',
    subtitle: 'Vue d\'ensemble de votre activité'
  });

  return (
    <PageContext.Provider value={{ pageInfo, setPageInfo }}>
      {children}
    </PageContext.Provider>
  );
};

export const usePageInfo = () => {
  const context = useContext(PageContext);
  if (context === undefined) {
    throw new Error('usePageInfo must be used within a PageProvider');
  }
  return context;
};