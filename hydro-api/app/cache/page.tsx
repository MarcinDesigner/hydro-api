'use client';

import { useState } from 'react';
import { RefreshCw, Trash2, Database, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useStationsData } from '@/hooks/useStationsData';
import { useCacheManager } from '@/hooks/useCacheManager';

export default function CachePage() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  
  const { data: stationsResult, isLoading, error, refetch } = useStationsData();
  const { refreshStationsData, clearAllCache, getCacheStatus } = useCacheManager();
  
  const cacheStatus = getCacheStatus();

  const handleRefreshCache = async () => {
    setIsRefreshing(true);
    try {
      await refreshStationsData();
      console.log('Cache odświeżony');
    } catch (error) {
      console.error('Błąd odświeżania cache:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      clearAllCache();
      console.log('Cache wyczyszczony');
    } catch (error) {
      console.error('Błąd czyszczenia cache:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const formatCacheAge = (cacheAge?: number) => {
    if (!cacheAge) return 'Brak danych';
    
    if (cacheAge < 60) return `${cacheAge}s`;
    if (cacheAge < 3600) return `${Math.floor(cacheAge / 60)}m ${cacheAge % 60}s`;
    return `${Math.floor(cacheAge / 3600)}h ${Math.floor((cacheAge % 3600) / 60)}m`;
  };

  const getCacheStatusColor = (cached?: boolean, cacheAge?: number) => {
    if (!cached) return 'text-green-600';
    if (cacheAge && cacheAge < 300) return 'text-blue-600'; // < 5 minut
    if (cacheAge && cacheAge < 600) return 'text-yellow-600'; // < 10 minut
    return 'text-red-600'; // > 10 minut
  };

  const getCacheStatusIcon = (cached?: boolean, cacheAge?: number) => {
    if (!cached) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (cacheAge && cacheAge < 300) return <Clock className="h-5 w-5 text-blue-600" />;
    if (cacheAge && cacheAge < 600) return <Clock className="h-5 w-5 text-yellow-600" />;
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Zarządzanie Cache</h2>
        <p className="mt-2 text-gray-600">
          Monitoruj i zarządzaj systemem cache'owania danych IMGW
        </p>
      </div>

      {/* Status Cache */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Status Cache</p>
              <p className={`text-xl font-bold ${getCacheStatusColor(stationsResult?.cached, stationsResult?.cacheAge)}`}>
                {stationsResult?.cached ? 'Cache Hit' : 'Fresh Data'}
              </p>
            </div>
            {getCacheStatusIcon(stationsResult?.cached, stationsResult?.cacheAge)}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Wiek Cache</p>
              <p className="text-xl font-bold text-gray-900">
                {formatCacheAge(stationsResult?.cacheAge)}
              </p>
            </div>
            <Clock className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stacje w Cache</p>
              <p className="text-xl font-bold text-gray-900">
                {stationsResult?.data?.length || 0}
              </p>
            </div>
            <Database className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Szczegóły Cache */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Szczegóły Cache</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Server-side Cache</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">TTL:</span>
                  <span className="font-medium">5 minut</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${stationsResult?.cached ? 'text-blue-600' : 'text-green-600'}`}>
                    {stationsResult?.cached ? 'Aktywny' : 'Świeże dane'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ostatnie pobranie:</span>
                  <span className="font-medium">
                    {stationsResult?.fetchTime ? 
                      new Date(stationsResult.fetchTime).toLocaleString('pl-PL') : 
                      'Brak danych'
                    }
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">Client-side Cache (React Query)</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Stale Time:</span>
                  <span className="font-medium">5 minut</span>
                </div>
                                 <div className="flex justify-between">
                   <span className="text-gray-600">GC Time:</span>
                   <span className="font-medium">1 godzina</span>
                 </div>
                                 <div className="flex justify-between">
                   <span className="text-gray-600">Auto Refresh:</span>
                   <span className="font-medium">1 godzina</span>
                 </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Queries w cache:</span>
                  <span className="font-medium">{cacheStatus.totalQueries}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Akcje */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Akcje Cache</h3>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleRefreshCache}
              disabled={isRefreshing || isLoading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Odświeżanie...' : 'Odśwież Cache'}
            </button>

            <button
              onClick={handleClearCache}
              disabled={isClearing}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              {isClearing ? 'Czyszczenie...' : 'Wyczyść Cache'}
            </button>
          </div>
          
          <div className="mt-4 p-4 bg-gray-50 rounded-md">
            <h4 className="font-medium text-gray-900 mb-2">Informacje</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• <strong>Odśwież Cache:</strong> Wymusza pobranie świeżych danych z API IMGW</li>
              <li>• <strong>Wyczyść Cache:</strong> Usuwa wszystkie dane z cache React Query</li>
                             <li>• Cache automatycznie odświeża się co 1 godzinę w tle</li>
              <li>• Dane są cache'owane przez 5 minut na serwerze i 5 minut w przeglądarce</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Logi */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h4 className="font-medium text-red-900">Błąd Cache</h4>
          </div>
          <p className="text-red-700 mt-2">
            {error instanceof Error ? error.message : 'Nieznany błąd'}
          </p>
        </div>
      )}
    </div>
  );
} 