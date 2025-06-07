'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSettings } from './useSettings';

interface UseAutoRefreshOptions {
  onRefresh: () => void | Promise<void>;
  enabled?: boolean;
}

export function useAutoRefresh({ onRefresh, enabled = true }: UseAutoRefreshOptions) {
  const { settings } = useSettings();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isEnabledRef = useRef(enabled);

  // Aktualizuj ref gdy enabled się zmieni
  useEffect(() => {
    isEnabledRef.current = enabled;
  }, [enabled]);

  const startInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (settings.autoRefresh && isEnabledRef.current) {
      const intervalMs = settings.refreshInterval * 60 * 1000; // konwersja minut na milisekundy
      
      intervalRef.current = setInterval(async () => {
        if (isEnabledRef.current) {
          try {
            await onRefresh();
          } catch (error) {
            console.error('Błąd podczas auto-refresh:', error);
          }
        }
      }, intervalMs);
      
      console.log(`Auto-refresh ustawiony na ${settings.refreshInterval} minut`);
    }
  }, [settings.autoRefresh, settings.refreshInterval, onRefresh]);

  const stopInterval = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('Auto-refresh zatrzymany');
    }
  }, []);

  // Uruchom/zatrzymaj interval gdy ustawienia się zmienią
  useEffect(() => {
    startInterval();
    return stopInterval;
  }, [startInterval, stopInterval]);

  // Nasłuchuj zmian ustawień z innych komponentów
  useEffect(() => {
    const handleSettingsChange = (event: CustomEvent) => {
      const { autoRefresh, refreshInterval } = event.detail;
      console.log('Otrzymano zmianę ustawień refresh:', { autoRefresh, refreshInterval });
      
      // Restart interval z nowymi ustawieniami
      if (autoRefresh && isEnabledRef.current) {
        startInterval();
      } else {
        stopInterval();
      }
    };

    window.addEventListener('refreshSettingsChanged', handleSettingsChange as EventListener);
    
    return () => {
      window.removeEventListener('refreshSettingsChanged', handleSettingsChange as EventListener);
    };
  }, [startInterval, stopInterval]);

  // Cleanup przy unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    isActive: settings.autoRefresh && enabled,
    interval: settings.refreshInterval,
    start: startInterval,
    stop: stopInterval
  };
} 