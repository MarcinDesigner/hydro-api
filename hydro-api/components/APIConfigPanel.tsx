'use client';

import { useState, useEffect } from 'react';
import Badge from '@/components/ui/badge';

interface APIStats {
  currentEndpoint: string;
  currentEndpointCount: number;
  hydro: {
    count: number;
    hasCoordinates: number;
    hasFlow: number;
    hasRiver: number;
  };
  hydro2: {
    count: number;
    hasCoordinates: number;
    hasFlow: number;
    hasRiver: number;
  };
  combined: {
    count: number;
    hasCoordinates: number;
    hasFlow: number;
    hasRiver: number;
  };
}

interface APIConfig {
  currentEndpoint: string;
  availableEndpoints: string[];
  stats: APIStats;
}

export default function APIConfigPanel() {
  const [config, setConfig] = useState<APIConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [comparing, setComparing] = useState(false);
  const [comparison, setComparison] = useState<any>(null);
  const [message, setMessage] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'stats' | 'compare'>('stats');

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      if (data.success) {
        setConfig(data.data);
      }
    } catch (error) {
      console.error('Error fetching config:', error);
    } finally {
      setLoading(false);
    }
  };

  const switchEndpoint = async (endpoint: string) => {
    setSwitching(true);
    setMessage('');
    
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ endpoint }),
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage(`✅ Przełączono na endpoint: ${endpoint}`);
        await fetchConfig();
      } else {
        setMessage(`❌ Błąd: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Błąd połączenia: ${error}`);
    } finally {
      setSwitching(false);
    }
  };

  const compareEndpoints = async () => {
    setComparing(true);
    
    try {
      const response = await fetch('/api/config', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'compare' }),
      });
      
      const data = await response.json();
      if (data.success) {
        setComparison(data.data);
      }
    } catch (error) {
      console.error('Error comparing endpoints:', error);
    } finally {
      setComparing(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
          Ładowanie konfiguracji...
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">Nie można załadować konfiguracji API</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Główny panel konfiguracji */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            ⚙️ Konfiguracja API IMGW
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Zarządzaj endpointami API i porównuj dane z różnych źródeł
          </p>
        </div>
        
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Aktualny endpoint:</p>
              <Badge variant="default" className="mt-1">
                {config.currentEndpoint}
              </Badge>
            </div>
            <button
              onClick={fetchConfig}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
            >
              🔄 Odśwież
            </button>
          </div>

          {message && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-blue-800 text-sm">{message}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {config.availableEndpoints.map((endpoint) => (
              <button
                key={endpoint}
                onClick={() => switchEndpoint(endpoint)}
                disabled={switching || endpoint === config.currentEndpoint}
                className={`px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2 ${
                  endpoint === config.currentEndpoint
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                } ${switching ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {switching ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                ) : endpoint === config.currentEndpoint ? (
                  '✅'
                ) : (
                  '🗄️'
                )}
                {endpoint}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Statystyki
            </button>
            <button
              onClick={() => setActiveTab('compare')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'compare'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              🔍 Porównanie
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'stats' && config.stats && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                📈 Statystyki endpointów
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-700">Hydro (klasyczny)</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Stacje:</span>
                      <Badge variant="default">{config.stats.hydro.count}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Z rzekami:</span>
                      <Badge variant="default">{config.stats.hydro.hasRiver}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Z przepływem:</span>
                      <Badge variant="default">{config.stats.hydro.hasFlow}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Ze współrzędnymi:</span>
                      <Badge variant="default">{config.stats.hydro.hasCoordinates}</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-medium text-gray-700">Hydro2 (nowy)</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Stacje:</span>
                      <Badge variant="success">{config.stats.hydro2.count}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Z rzekami:</span>
                      <Badge variant="success">{config.stats.hydro2.hasRiver}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Z przepływem:</span>
                      <Badge variant="success">{config.stats.hydro2.hasFlow}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Ze współrzędnymi:</span>
                      <Badge variant="success">{config.stats.hydro2.hasCoordinates}</Badge>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h5 className="font-medium text-gray-700">Połączone</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Stacje:</span>
                      <Badge variant="warning">{config.stats.combined.count}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Z rzekami:</span>
                      <Badge variant="warning">{config.stats.combined.hasRiver}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Z przepływem:</span>
                      <Badge variant="warning">{config.stats.combined.hasFlow}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Ze współrzędnymi:</span>
                      <Badge variant="warning">{config.stats.combined.hasCoordinates}</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'compare' && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 mb-4">Porównanie endpointów</h4>
              <p className="text-gray-600 mb-4">
                Porównaj dane dostępne w różnych endpointach API
              </p>
              
              <button
                onClick={compareEndpoints}
                disabled={comparing}
                className={`px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium flex items-center gap-2 mb-4 ${
                  comparing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'
                }`}
              >
                {comparing ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  '📊'
                )}
                Porównaj endpointy
              </button>

              {comparison && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-700 mb-2">Tylko Hydro</h5>
                      <Badge variant="default" className="text-lg px-3 py-1">
                        {comparison.summary.hydro.uniqueStations}
                      </Badge>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <h5 className="font-medium text-gray-700 mb-2">Wspólne</h5>
                      <Badge variant="success" className="text-lg px-3 py-1">
                        {comparison.summary.common}
                      </Badge>
                    </div>
                    <div className="text-center p-4 bg-gray-50 rounded-lg">
                      <h5 className="font-medium text-gray-700 mb-2">Tylko Hydro2</h5>
                      <Badge variant="warning" className="text-lg px-3 py-1">
                        {comparison.summary.hydro2.uniqueStations}
                      </Badge>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <p className="text-blue-800 text-sm">
                      <strong>Hydro:</strong> {comparison.summary.hydro.count} stacji, 
                      <strong> Hydro2:</strong> {comparison.summary.hydro2.count} stacji, 
                      <strong> Wspólnych:</strong> {comparison.summary.common} stacji
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 