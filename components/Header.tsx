// components/Header.tsx
'use client';

import { useState, useEffect } from 'react';
import { Bell, Settings, RefreshCw, Activity } from 'lucide-react';

interface SystemStatus {
  status: string;
  stations_count: number;
  data_freshness: string;
  latest_measurement?: {
    age_minutes: number;
  };
}

export function Header() {
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
    try {
      const response = await fetch('/api/sync', { method: 'POST' });
      const result = await response.json();
      
      if (result.status === 'success') {
        // Refresh status after sync
        setTimeout(fetchSystemStatus, 2000);
      }
    } catch (error) {
      console.error('Error during manual sync:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusColor = () => {
    if (!systemStatus) return 'bg-gray-500';
    if (systemStatus.status === 'healthy' && systemStatus.data_freshness === 'fresh') {
      return 'bg-green-500';
    }
    if (systemStatus.data_freshness === 'stale') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStatusText = () => {
    if (!systemStatus) return 'Sprawdzanie...';
    if (systemStatus.status === 'healthy' && systemStatus.data_freshness === 'fresh') {
      return 'System działa prawidłowo';
    }
    if (systemStatus.data_freshness === 'stale') {
      return 'Dane nieaktualne';
    }
    return 'Problemy z systemem';
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
                  ({systemStatus.stations_count} stacji)
                </span>
              )}
            </div>

            {/* Manual refresh */}
            <button
              onClick={handleManualSync}
              disabled={isRefreshing}
              className="flex items-center space-x-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Synchronizuj</span>
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