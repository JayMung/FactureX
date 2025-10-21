import { useEffect } from 'react';
import { usePageInfo } from '@/contexts/PageContext';

interface PageSetupOptions {
  title: string;
  subtitle?: string;
}

export const usePageSetup = (options: PageSetupOptions) => {
  const { setPageInfo } = usePageInfo();

  useEffect(() => {
    setPageInfo({
      title: options.title,
      subtitle: options.subtitle
    });
  }, [options.title, options.subtitle, setPageInfo]);
};