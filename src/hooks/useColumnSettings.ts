import { useState, useEffect } from 'react';
import type { ColumnDefinition } from '@/components/library/ColumnSelector';

/**
 * Hook to persist column settings to localStorage or Electron storage
 */
export function useColumnSettings(libraryType: string, defaultColumns: ColumnDefinition[]) {
  const storageKey = `column-settings-${libraryType}`;
  
  const [columns, setColumns] = useState<ColumnDefinition[]>(() => {
    // Try to load from storage
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const savedColumns = JSON.parse(stored);
        // Merge saved settings with default columns (in case new columns were added)
        return defaultColumns.map(col => {
          const saved = savedColumns.find((s: ColumnDefinition) => s.id === col.id);
          return saved ? { ...col, visible: saved.visible } : col;
        });
      }
    } catch (error) {
      console.error('Failed to load column settings:', error);
    }
    
    return defaultColumns;
  });

  // Save to storage whenever columns change
  useEffect(() => {
    try {
      const toSave = columns.map(col => ({ id: col.id, visible: col.visible }));
      localStorage.setItem(storageKey, JSON.stringify(toSave));
      
      // Also save to Electron storage if available
      if (typeof window !== 'undefined' && window.electron) {
        window.electron.settings.set(storageKey, toSave).catch((error: Error) => {
          console.error('Failed to save column settings to Electron storage:', error);
        });
      }
    } catch (error) {
      console.error('Failed to save column settings:', error);
    }
  }, [columns, storageKey]);

  return [columns, setColumns] as const;
}
