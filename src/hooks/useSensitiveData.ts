import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'sensitive_data_hidden';
const EVENT_NAME = 'sensitive-data-toggle';

export const useSensitiveData = () => {
  const [isHidden, setIsHidden] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    }
    return false;
  });

  // Listen for changes from other components
  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsHidden(customEvent.detail?.isHidden ?? false);
    };
    
    window.addEventListener(EVENT_NAME, handleToggle);
    return () => window.removeEventListener(EVENT_NAME, handleToggle);
  }, []);

  const toggle = useCallback(() => {
    setIsHidden(prev => {
      const newValue = !prev;
      localStorage.setItem(STORAGE_KEY, newValue.toString());
      // Broadcast to all components
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { isHidden: newValue } }));
      return newValue;
    });
  }, []);

  const show = useCallback(() => {
    setIsHidden(false);
    localStorage.setItem(STORAGE_KEY, 'false');
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { isHidden: false } }));
  }, []);

  const hide = useCallback(() => {
    setIsHidden(true);
    localStorage.setItem(STORAGE_KEY, 'true');
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { isHidden: true } }));
  }, []);

  return {
    isHidden,
    toggle,
    show,
    hide
  };
};

// Hook for components that only need to READ the state (no toggle)
export const useSensitiveDataValue = () => {
  const [isHidden, setIsHidden] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'true';
    }
    return false;
  });

  useEffect(() => {
    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent;
      setIsHidden(customEvent.detail?.isHidden ?? false);
    };
    
    window.addEventListener(EVENT_NAME, handleToggle);
    return () => window.removeEventListener(EVENT_NAME, handleToggle);
  }, []);

  return isHidden;
};

export const maskNumber = (value: number | string, isHidden: boolean): string => {
  if (!isHidden) return value.toString();
  
  const str = value.toString();
  // Replace digits with • but preserve formatting characters
  return str.replace(/[0-9]/g, '•');
};

export const maskCurrency = (value: number | string, isHidden: boolean): string => {
  if (!isHidden) return value.toString();
  
  // For currencies, mask the numbers but keep currency symbols
  const str = value.toString();
  return str.replace(/[0-9]/g, '•');
};
