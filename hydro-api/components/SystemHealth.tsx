// components/SystemHealth.tsx
'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock, Wifi, Database, Activity } from 'lucide-react';

interface HealthData {
  status: string;
  database: string;
  stations_count: number;
  latest_measurement?: {
    station: string;
    timestamp: string;
    age_minutes: number;
  };
  data_freshness: string;
  timestamp: string;
}

export function SystemHealth() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000); // co 30 sekund
    return () => clearInterval(interval);
  }, []);

  const fetchHealth = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setHealth(data);
      setLastUpdated(new Date().toLocaleTimeString('pl-PL'));
    } catch (error) {
      console.error('Error fetching health:', error);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'fresh':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'stale':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <XCircle className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
      case 'fresh':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'stale':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  const getStatusText = (type: string, status: string) => {
    switch (type) {
      case 'system':
        return status === 'healthy' ? 'System działa prawidłowo' : 'Wykryto problemy';
      case 'database':
        return status === 'connected' ? 'Baza danych połączona' : 'Błąd połączenia z bazą';
      case 'data':
        return status === 'fresh' ? 'Dane są aktualne' : 'Dane wymagają odświeżenia';
      default:
        return 'Nieznany status';
    }
  };

  const healthChecks = [
    {
      id: 'system',
      name: 'Status systemu',
      icon: Activity,
      status: health?.status || 'unknown',
      description: 'Ogólny stan systemu API'
    },
    {
      id: 'database',
      name: 'Baza danych',
      icon: Database,
      status: health?.database || 'unknown',
      description: 'Połączenie z PostgreSQL'
    },
    {
      id: 'data',
      name: 'Świeżość danych',
      icon: Wifi,
      status: health?.data_freshness || 'unknown',
      description: 'Aktualność danych z IMGW'
    }
  ];

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <div className="h-5 w-5 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                </div>
                <div className="h-6 w-16 bg-gray-200 rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Status systemu</h3>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Clock className="h-4 w-4" />
          <span>Ostatnia aktualizacja: {lastUpdated}</span>
        </div>
      </div>
      
      {health ? (
        <div className="space-y-3">
          {healthChecks.map((check) => (
            <div key={check.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getStatusIcon(check.status)}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <check.icon className="h-4 w-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{check.name}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{check.description}</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(check.status)}`}>
                {getStatusText(check.id, check.status)}
              </span>
            </div>
          ))}

          {/* Dodatkowe informacje */}
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2">
                  <Database className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-900">Stacje w systemie</span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-blue-900">
                    {health.stations_count.toLocaleString('pl-PL')}
                  </span>
                  <span className="text-sm text-blue-700 ml-2">aktywnych stacji</span>
                </div>
              </div>

              {health.latest_measurement && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Activity className="h-5 w-5 text-green-600" />
                    <span className="font-medium text-green-900">Ostatni pomiar</span>
                  </div>
                  <div className="mt-2">
                    <div className="font-medium text-green-900">
                      {health.latest_measurement.station}
                    </div>
                    <div className="text-sm text-green-700">
                      {health.latest_measurement.age_minutes} minut temu
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ogólny status */}
          <div className="mt-4 p-4 rounded-lg border-2 border-dashed border-gray-200">
            <div className="text-center">
              <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full ${
                health.status === 'healthy' && health.data_freshness === 'fresh' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {health.status === 'healthy' && health.data_freshness === 'fresh' ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span className="font-medium">System działa prawidłowo</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Wymagana uwaga</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <XCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Błąd pobierania statusu</h3>
          <p className="mt-1 text-sm text-gray-500">
            Nie można połączyć się z API health check
          </p>
          <button
            onClick={fetchHealth}
            className="mt-3 px-4 py-2 bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
          >
            Spróbuj ponownie
          </button>
        </div>
      )}
    </div>
  );
}