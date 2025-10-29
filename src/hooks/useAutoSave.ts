import { useEffect, useRef } from 'react';
import { showSuccess } from '@/utils/toast';

interface AutoSaveOptions {
  data: any;
  storageKey: string;
  onSave?: (data: any) => void;
  debounceMs?: number;
  enabled?: boolean;
}

export const useAutoSave = ({
  data,
  storageKey,
  onSave,
  debounceMs = 2000,
  enabled = true
}: AutoSaveOptions) => {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const lastSaveRef = useRef<string>('');
  const saveCountRef = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Convert data to string for comparison
    const currentData = JSON.stringify(data);

    // Don't save if data hasn't changed
    if (currentData === lastSaveRef.current) {
      return;
    }

    // Set new timeout for auto-save
    timeoutRef.current = setTimeout(() => {
      try {
        // Save to localStorage
        localStorage.setItem(storageKey, currentData);
        lastSaveRef.current = currentData;
        saveCountRef.current += 1;

        // Call custom save handler if provided
        if (onSave) {
          onSave(data);
        }

        // Show subtle success message for first save and every 5th save
        if (saveCountRef.current === 1 || saveCountRef.current % 5 === 0) {
          showSuccess('Brouillon sauvegardé automatiquement');
        }

        console.log(`[AutoSave] Saved ${storageKey} (${saveCountRef.current} times)`);
      } catch (error) {
        console.error('[AutoSave] Failed to save:', error);
      }
    }, debounceMs);

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, storageKey, onSave, debounceMs, enabled]);

  // Function to load saved data
  const loadSavedData = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('[AutoSave] Failed to load saved data:', error);
      return null;
    }
  };

  // Function to clear saved data
  const clearSavedData = () => {
    try {
      localStorage.removeItem(storageKey);
      lastSaveRef.current = '';
      saveCountRef.current = 0;
      console.log(`[AutoSave] Cleared ${storageKey}`);
    } catch (error) {
      console.error('[AutoSave] Failed to clear saved data:', error);
    }
  };

  // Function to check if there's saved data
  const hasSavedData = () => {
    return localStorage.getItem(storageKey) !== null;
  };

  return {
    loadSavedData,
    clearSavedData,
    hasSavedData,
    saveCount: saveCountRef.current
  };
};
