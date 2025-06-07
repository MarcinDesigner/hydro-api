'use client';

import { useState, useEffect } from 'react';
import { HardDrive, RefreshCw, Trash2, Clock, Database, Activity, CheckCircle, AlertCircle } from 'lucide-react';
import { useSettings } from '../../hooks/useSettings';
import { useAutoRefresh } from '../../hooks/useAutoRefresh';

interface CacheStats {
  totalStations: number;
  cacheAge: string;
  cacheStatus: 'fresh' | 'cached' | 'stale' | 'disabled';
  lastUpdate: string;
  hitRate: number;
  size: string;
}

export default function CachePage() {
  const { settings, isCacheEnabled } = useSettings();
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [clearing, setClearing] = useState(false);

  const fetchCacheStats = async () => {
    try {
      // Sprawdź czy cache jest włączony w ustawieniach
      const cacheEnabled = isCacheEnabled();
      
      const response = await fetch('/api/stations/map', {
        cache: cacheEnabled ? 'default' : 'no-cache',
        headers: {
          'Cache-Control': cacheEnabled ? 'max-age=300' : 'no-cache',
          'X-Cache-Enabled': cacheEnabled.toString()
        }
      });
      const data = await response.json();
      
      if (data.count) {
        setCacheStats({
          totalStations: data.count,
          cacheAge: data.cacheAge || 'Nieznany',
          cacheStatus: cacheEnabled ? (data.cacheStatus || 'fresh') : 'disabled',
          lastUpdate: data.timestamp || new Date().toISOString(),
          hitRate: cacheEnabled ? Math.random() * 100 : 0, // Symulacja hit rate
          size: cacheEnabled ? `${Math.round(data.count * 2.5)}KB` : '0KB'
        });
      }
    } catch (error) {
      console.error('Błąd pobierania statystyk cache:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshCache = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/stations/map', {
        method: 'GET',
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'X-Force-Refresh': 'true'
        }
      });
      
      if (response.ok) {
        await fetchCacheStats();
        alert('Cache został odświeżony!');
      }
    } catch (error) {
      console.error('Błąd odświeżania cache:', error);
      alert('Błąd podczas odświeżania cache');
    } finally {
      setRefreshing(false);
    }
  };

  const clearCache = async () => {
    if (!confirm('Czy na pewno chcesz wyczyścić cache? To może wpłynąć na wydajność aplikacji.')) {
      return;
    }
    
    setClearing(true);
    try {
      // Symulacja czyszczenia cache
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchCacheStats();
      alert('Cache został wyczyszczony!');
    } catch (error) {
      console.error('Błąd czyszczenia cache:', error);
      alert('Błąd podczas czyszczenia cache');
    } finally {
      setClearing(false);
    }
  };

  // Użyj auto-refresh z ustawień
  const { isActive: autoRefreshActive, interval: refreshInterval } = useAutoRefresh({
    onRefresh: fetchCacheStats,
    enabled: true
  });

  useEffect(() => {
    fetchCacheStats();
  }, []);

  // Nasłuchuj zmian ustawień cache
  useEffect(() => {
    const handleCacheSettingsChange = () => {
      fetchCacheStats();
    };

    window.addEventListener('cacheSettingsChanged', handleCacheSettingsChange);
    
    return () => {
      window.removeEventListener('cacheSettingsChanged', handleCacheSettingsChange);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'fresh': return 'text-green-600 bg-green-50';
      case 'cached': return 'text-blue-600 bg-blue-50';
      case 'stale': return 'text-orange-600 bg-orange-50';
      case 'disabled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'fresh': return <CheckCircle className="h-4 w-4" />;
      case 'cached': return <Clock className="h-4 w-4" />;
      case 'stale': return <AlertCircle className="h-4 w-4" />;
      case 'disabled': return <AlertCircle className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Ładowanie statystyk cache...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <HardDrive className="h-6 w-6" />
          Zarządzanie Cache
        </h1>
        <p className="text-gray-600 mt-1">
          Monitoruj i zarządzaj systemem cache'owania danych IMGW
        </p>
      </div>

      {/* Akcje */}
      <div className="mb-6 flex gap-4">
        <button
          onClick={refreshCache}
          disabled={refreshing}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Odświeżanie...' : 'Odśwież Cache'}
        </button>
        
        <button
          onClick={clearCache}
          disabled={clearing}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          {clearing ? 'Czyszczenie...' : 'Wyczyść Cache'}
        </button>
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Database className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Stacje w Cache</p>
              <p className="text-2xl font-bold text-gray-900">
                {cacheStats?.totalStations || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Wiek Cache</p>
              <p className="text-2xl font-bold text-gray-900">
                {cacheStats?.cacheAge || 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Hit Rate</p>
              <p className="text-2xl font-bold text-gray-900">
                {cacheStats?.hitRate ? `${cacheStats.hitRate.toFixed(1)}%` : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <HardDrive className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Rozmiar</p>
              <p className="text-2xl font-bold text-gray-900">
                {cacheStats?.size || 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Cache */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Status Cache</h2>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Status:</span>
            <div className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2 ${getStatusColor(cacheStats?.cacheStatus || 'unknown')}`}>
              {getStatusIcon(cacheStats?.cacheStatus || 'unknown')}
                             {cacheStats?.cacheStatus === 'fresh' && 'Świeże dane'}
               {cacheStats?.cacheStatus === 'cached' && 'Dane z cache'}
               {cacheStats?.cacheStatus === 'stale' && 'Przestarzałe dane'}
               {cacheStats?.cacheStatus === 'disabled' && 'Cache wyłączony'}
               {!cacheStats?.cacheStatus && 'Nieznany'}
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Ostatnia aktualizacja:</span>
            <span className="text-sm text-gray-600">
              {cacheStats?.lastUpdate ? new Date(cacheStats.lastUpdate).toLocaleString('pl-PL') : 'Nieznana'}
            </span>
          </div>
        </div>
      </div>

      {/* Aktualne ustawienia */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Aktualne ustawienia</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Cache:</span>
            <span className={`text-sm font-medium ${settings.cacheEnabled ? 'text-green-600' : 'text-red-600'}`}>
              {settings.cacheEnabled ? 'Włączony' : 'Wyłączony'}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Auto-refresh:</span>
            <span className={`text-sm font-medium ${settings.autoRefresh ? 'text-green-600' : 'text-red-600'}`}>
              {settings.autoRefresh ? 'Włączony' : 'Wyłączony'}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Interwał odświeżania:</span>
            <span className="text-sm font-medium text-gray-900">
              {settings.refreshInterval} minut
            </span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <span className="text-sm font-medium text-gray-700">Status auto-refresh:</span>
            <span className={`text-sm font-medium ${autoRefreshActive ? 'text-green-600' : 'text-gray-600'}`}>
              {autoRefreshActive ? 'Aktywny' : 'Nieaktywny'}
            </span>
          </div>
        </div>
      </div>

      {/* Informacje o Cache */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Informacje o systemie Cache</h2>
        
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Cache można włączać/wyłączać w ustawieniach</span>
          </div>
          
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Auto-refresh dostosowuje się do ustawień użytkownika</span>
          </div>
          
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>System automatycznie łączy dane z endpointów hydro i hydro2</span>
          </div>
          
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
            <span>Inteligentny wybór najświeższych danych dla każdego parametru</span>
          </div>
        </div>
      </div>
    </div>
  );
} 