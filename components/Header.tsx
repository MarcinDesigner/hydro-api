// components/Header.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bell, Settings, RefreshCw, Activity } from 'lucide-react';

interface SystemStatus {
  status: string;
  stations_count?: number;
  data_freshness?: string;
  latest_measurement?: {
    age_minutes: number;
  };
  // Dodaj właściwości z faktycznego API response
  services?: {
    database?: {
      status: string;
      stats?: {
        total_stations: number;
        active_stations_24h: number;
        measurements_today: number;
      };
    };
    imgw_api?: {
      status: string;
      stations_available: number;
    };
  };
}

export function Header() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string>('');

  useEffect(() => {
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 30000); // co 30 sekund
    return () => clearInterval(interval);
  }, []);

  const fetchSystemStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setSystemStatus(data);
    } catch (error) {
      console.error('Error fetching system status:', error);
    }
  };

  const handleManualSync = async () => {
    setIsRefreshing(true);
    setSyncMessage('');
    
    try {
      // Użyj sync-smart który pobiera dane z OBUAPI (hydro + hydro2)
      const response = await fetch('/api/sync-smart', { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET_TOKEN || 'hydro-cron-secret-2025'}`,
          'X-Dev-Mode': 'true' // Pozwól na synchronizację bez tokenu w dev
        },
        body: JSON.stringify({ source: 'manual' })
      });
      
      if (!response.ok) {
        // Jeśli sync-smart nie działa, spróbuj sync-all
        console.log('Sync-smart failed, trying sync-all...');
        const allResponse = await fetch('/api/sync-all', { 
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CRON_SECRET_TOKEN || 'hydro-cron-secret-2025'}`
          },
          body: JSON.stringify({ source: 'manual' })
        });
        
        if (!allResponse.ok) {
          // Ostatnia próba - sync-dev
          const devResponse = await fetch('/api/sync-dev', { 
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ source: 'manual' })
          });
          
          if (!devResponse.ok) {
            throw new Error(`HTTP error! status: ${devResponse.status}`);
          }
          
          const devResult = await devResponse.json();
          setSyncMessage(`✅ Zsynchronizowano ${devResult.stats?.synced_stations || 0} stacji (tryb dev)`);
        } else {
          const allResult = await allResponse.json();
          setSyncMessage(`✅ Zsynchronizowano ${allResult.stats?.total_stations || 0} stacji (wszystkie źródła)`);
        }
      } else {
        const result = await response.json();
        
        if (result.status === 'success') {
          const totalStations = result.stats?.total_stations || 0;
          const fromHydro = result.stats?.data_sources?.from_hydro || 0;
          const fromHydro2 = result.stats?.data_sources?.from_hydro2 || 0;
          
          setSyncMessage(`✅ Zsynchronizowano ${totalStations} stacji (Hydro: ${fromHydro}, Hydro2: ${fromHydro2})`);
          // Odśwież status po synchronizacji
          setTimeout(fetchSystemStatus, 2000);
        } else {
          setSyncMessage('⚠️ ' + (result.message || 'Synchronizacja nieudana'));
        }
      }
    } catch (error) {
      console.error('Error during manual sync:', error);
      setSyncMessage('❌ Błąd synchronizacji');
      
      // Ostatnia próba - użyj health check do weryfikacji
      try {
        const healthResponse = await fetch('/api/health');
        if (healthResponse.ok) {
          setSyncMessage('⚠️ API działa, ale synchronizacja nie powiodła się');
        }
      } catch (healthError) {
        setSyncMessage('❌ Błąd połączenia z API');
      }
    } finally {
      setIsRefreshing(false);
      // Wyczyść wiadomość po 5 sekundach
      setTimeout(() => setSyncMessage(''), 5000);
    }
  };

  const getStatusColor = () => {
    if (!systemStatus) return 'bg-gray-500';
    
    // Sprawdź status z nowego formatu API
    if (systemStatus.services?.imgw_api?.status === 'healthy') {
      return 'bg-green-500';
    }
    
    // Fallback do starego formatu
    if (systemStatus.status === 'healthy' && systemStatus.data_freshness === 'fresh') {
      return 'bg-green-500';
    }
    if (systemStatus.data_freshness === 'stale') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (!systemStatus) return 'Sprawdzanie...';
    
    // Sprawdź nowy format API
    if (systemStatus.services?.imgw_api?.status === 'healthy') {
      return 'System działa prawidłowo';
    }
    
    // Fallback do starego formatu
    if (systemStatus.status === 'healthy' && systemStatus.data_freshness === 'fresh') {
      return 'System działa prawidłowo';
    }
    if (systemStatus.data_freshness === 'stale') {
      return 'Dane nieaktualne';
    }
    return 'Problemy z systemem';
  };

  const getStationsCount = () => {
    // Sprawdź różne możliwe lokalizacje liczby stacji
    if (systemStatus?.services?.imgw_api?.stations_available) {
      return systemStatus.services.imgw_api.stations_available;
    }
    if (systemStatus?.services?.database?.stats?.total_stations) {
      return systemStatus.services.database.stats.total_stations;
    }
    if (systemStatus?.stations_count) {
      return systemStatus.stations_count;
    }
    return 0;
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and title */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">Hydro API</h1>
            </div>
            <div className="text-sm text-gray-500">
              Dashboard zarządzania danymi hydrologicznymi
            </div>
          </div>

          {/* Status and actions */}
          <div className="flex items-center space-x-4">
            {/* System status */}
            <div className="flex items-center space-x-2">
              <div className={`status-dot ${getStatusColor()}`}></div>
              <span className="text-sm text-gray-700">{getStatusText()}</span>
              {systemStatus && (
                <span className="text-xs text-gray-500">
                  ({getStationsCount()} stacji)
                </span>
              )}
            </div>

            {/* Sync message */}
            {syncMessage && (
              <div className="text-sm px-3 py-1 bg-blue-50 text-blue-700 rounded-md">
                {syncMessage}
              </div>
            )}

            {/* Manual refresh */}
            <button
              onClick={handleManualSync}
              disabled={isRefreshing}
              className="flex items-center space-x-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Synchronizuję...' : 'Synchronizuj'}</span>
            </button>

            {/* Notifications */}
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Bell className="h-5 w-5" />
            </button>

            {/* Settings */}
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}