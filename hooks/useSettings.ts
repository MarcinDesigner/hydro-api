'use client';

import { useState, useEffect, useCallback } from 'react';

export interface AppSettings {
  notifications: boolean;
  autoRefresh: boolean;
  refreshInterval: number; // w minutach
  theme: 'light' | 'dark' | 'auto';
  language: 'pl' | 'en';
  showCoordinates: boolean;
  showAlerts: boolean;
  cacheEnabled: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  notifications: true,
  autoRefresh: true,
  refreshInterval: 60, // 1 godzina
  theme: 'light',
  language: 'pl',
  showCoordinates: true,
  showAlerts: true,
  cacheEnabled: true
};

const SETTINGS_KEY = 'hydro-app-settings';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Ładowanie ustawień z localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(SETTINGS_KEY);
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...DEFAULT_SETTINGS, ...parsed });
      }
    } catch (error) {
      console.error('Błąd ładowania ustawień:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Zapisywanie ustawień do localStorage
  const saveSettings = useCallback(async (newSettings: Partial<AppSettings>) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
      
      // Wywołaj callback dla zmian cache
      if ('cacheEnabled' in newSettings) {
        await handleCacheToggle(updatedSettings.cacheEnabled);
      }
      
      // Wywołaj callback dla zmian interwału
      if ('refreshInterval' in newSettings || 'autoRefresh' in newSettings) {
        handleRefreshIntervalChange(updatedSettings);
      }
      
      return true;
    } catch (error) {
      console.error('Błąd zapisywania ustawień:', error);
      return false;
    }
  }, [settings]);

  // Obsługa włączania/wyłączania cache
  const handleCacheToggle = async (enabled: boolean) => {
    try {
      if (!enabled) {
        // Wyczyść cache gdy jest wyłączony
        await fetch('/api/cache/clear', { method: 'POST' });
        console.log('Cache został wyczyszczony');
      }
      
      // Ustaw flagę w sessionStorage dla innych komponentów
      sessionStorage.setItem('cache-enabled', enabled.toString());
      
      // Wyślij event do innych komponentów
      window.dispatchEvent(new CustomEvent('cacheSettingsChanged', { 
        detail: { enabled } 
      }));
    } catch (error) {
      console.error('Błąd zarządzania cache:', error);
    }
  };

  // Obsługa zmiany interwału odświeżania
  const handleRefreshIntervalChange = (newSettings: AppSettings) => {
    // Wyślij event do innych komponentów
    window.dispatchEvent(new CustomEvent('refreshSettingsChanged', { 
      detail: { 
        autoRefresh: newSettings.autoRefresh,
        refreshInterval: newSettings.refreshInterval 
      } 
    }));
  };

  // Reset ustawień do domyślnych
  const resetSettings = useCallback(async () => {
    try {
      setSettings(DEFAULT_SETTINGS);
      localStorage.removeItem(SETTINGS_KEY);
      
      // Wyczyść cache
      await handleCacheToggle(DEFAULT_SETTINGS.cacheEnabled);
      handleRefreshIntervalChange(DEFAULT_SETTINGS);
      
      return true;
    } catch (error) {
      console.error('Błąd resetowania ustawień:', error);
      return false;
    }
  }, []);

  // Sprawdź czy cache jest włączony
  const isCacheEnabled = useCallback(() => {
    return settings.cacheEnabled;
  }, [settings.cacheEnabled]);

  // Pobierz interwał odświeżania w milisekundach
  const getRefreshInterval = useCallback(() => {
    return settings.autoRefresh ? settings.refreshInterval * 60 * 1000 : null;
  }, [settings.autoRefresh, settings.refreshInterval]);

  return {
    settings,
    loading,
    saveSettings,
    resetSettings,
    isCacheEnabled,
    getRefreshInterval
  };
} 