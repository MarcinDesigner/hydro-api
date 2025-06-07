'use client';

import { useState, useEffect } from 'react';

interface APIEndpoint {
  method: string;
  path: string;
  description: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
    default?: string;
  }>;
  example: {
    request: string;
    response: any;
  };
  category: string;
}

const API_ENDPOINTS: APIEndpoint[] = [
  // Stacje
  {
    method: 'GET',
    path: '/api/stations',
    description: '🔥 REAL-TIME: Pobiera listę wszystkich stacji hydrologicznych z najświeższymi danymi z API IMGW',
    parameters: [
      { name: 'voivodeship', type: 'string', required: false, description: 'Filtruj po województwie' },
      { name: 'river', type: 'string', required: false, description: 'Filtruj po nazwie rzeki' },
      { name: 'limit', type: 'number', required: false, description: 'Maksymalna liczba wyników' },
      { name: 'fresh', type: 'boolean', required: false, description: 'Tylko świeże dane (< 24h)', default: 'false' }
    ],
    example: {
      request: '/api/stations?voivodeship=mazowieckie&limit=5',
      response: {
        status: 'success',
        stations: [
          {
            id: '152210010',
            name: 'Warszawa',
            river: 'Wisła',
            voivodeship: 'mazowieckie',
            waterLevel: 162,
            waterLevelDate: '2025-06-07T16:10:00.000Z',
            longitude: 21.0122,
            latitude: 52.2297,
            alarmStatus: 'normal',
            source: 'hydro'
          }
        ],
        count: 1
      }
    },
    category: 'Stacje Real-time'
  },
  {
    method: 'GET',
    path: '/api/stations/{id}',
    description: 'Pobiera szczegółowe informacje o konkretnej stacji',
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Kod stacji (np. 152210010)' }
    ],
    example: {
      request: '/api/stations/152210010',
      response: {
        status: 'success',
        station: {
          id: '152210010',
          name: 'Warszawa',
          river: 'Wisła',
          voivodeship: 'mazowieckie',
          waterLevel: 162,
          alarmStatus: 'normal'
        }
      }
    },
    category: 'Stacje Real-time'
  },
  {
    method: 'GET',
    path: '/api/stations/map',
    description: '🗺️ Pobiera stacje z współrzędnymi geograficznymi do wyświetlenia na mapie',
    example: {
      request: '/api/stations/map',
      response: {
        status: 'success',
        stations: [
          {
            id: '152210010',
            name: 'Warszawa',
            longitude: 21.0122,
            latitude: 52.2297,
            waterLevel: 162,
            alarmStatus: 'normal'
          }
        ],
        count: 866
      }
    },
    category: 'Mapa'
  },
  {
    method: 'GET',
    path: '/api/stations/visibility',
    description: 'Pobiera statystyki widoczności stacji w API',
    example: {
      request: '/api/stations/visibility',
      response: {
        status: 'success',
        data: {
          totalStations: 871,
          visibleStations: 870,
          hiddenStations: 1
        }
      }
    },
    category: 'Zarządzanie'
  },
  {
    method: 'POST',
    path: '/api/stations/{id}/visibility',
    description: 'Przełącza widoczność stacji w API',
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Kod stacji' }
    ],
    example: {
      request: '/api/stations/152210010/visibility',
      response: {
        status: 'success',
        message: 'Station visibility toggled',
        isVisible: false
      }
    },
    category: 'Zarządzanie'
  },
  // Pomiary historyczne
  {
    method: 'GET',
    path: '/api/stations/{id}/measurements',
    description: '📊 HISTORYCZNE: Pobiera historyczne pomiary dla stacji z bazy danych (do wykresów)',
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Kod stacji' },
      { name: 'days', type: 'number', required: false, description: 'Liczba dni wstecz', default: '30' },
      { name: 'limit', type: 'number', required: false, description: 'Maksymalna liczba pomiarów', default: '1000' },
      { name: 'source', type: 'string', required: false, description: 'Źródło danych: hydro lub hydro2' }
    ],
    example: {
      request: '/api/stations/152210010/measurements?days=7&limit=100',
      response: {
        status: 'success',
        data: {
          station: {
            id: '152210010',
            name: 'Warszawa',
            river: 'Wisła'
          },
          measurements: [
            {
              timestamp: '2025-06-07T16:10:00.000Z',
              waterLevel: 162,
              flowRate: null,
              temperature: null,
              source: 'hydro'
            }
          ],
          stats: {
            totalMeasurements: 1,
            waterLevel: { min: 162, max: 162, avg: 162 }
          }
        }
      }
    },
    category: 'Pomiary Historyczne'
  },
  {
    method: 'GET',
    path: '/api/database/recent-measurements',
    description: '📊 Pobiera najnowsze pomiary z bazy danych PostgreSQL',
    parameters: [
      { name: 'limit', type: 'number', required: false, description: 'Maksymalna liczba pomiarów', default: '20' },
      { name: 'hours', type: 'number', required: false, description: 'Liczba godzin wstecz', default: '24' }
    ],
    example: {
      request: '/api/database/recent-measurements?limit=5&hours=24',
      response: {
        success: true,
        data: {
          measurements: [
            {
              id: 'cmbmnuemi000r60zytcbqx2bk',
              stationId: 'cmbjktql5023yikij35jbkzt5',
              measurementTimestamp: '2025-06-07T19:20:00.000Z',
              waterLevel: 188,
              flowRate: 2.42,
              source: 'hydro2',
              station: {
                stationName: 'PLOSKI',
                riverName: 'Narew',
                voivodeship: 'podlaskie'
              }
            }
          ],
          stats: {
            totalFound: 5,
            todayCount: 1264,
            last24hCount: 1264
          }
        }
      }
    },
    category: 'Pomiary Historyczne'
  },
  // Statystyki Real-time
  {
    method: 'GET',
    path: '/api/stats',
    description: '🔥 REAL-TIME: Pobiera aktualne statystyki systemu bezpośrednio z API IMGW',
    example: {
      request: '/api/stats',
      response: {
        status: 'success',
        stats: {
          total_stations: 871,
          fresh_data_stations: 833,
          stale_data_stations: 38,
          from_hydro: 559,
          from_hydro2: 312,
          rivers_count: 156,
          top_rivers: [
            { name: 'Wisła', stations: 38 },
            { name: 'Warta', stations: 18 }
          ],
          alarm_stats: {
            normal: 750,
            warning: 85,
            alarm: 12,
            unknown: 24
          },
          data_freshness: {
            fresh_percentage: 96,
            stale_percentage: 4,
            coordinates_coverage: 89
          }
        },
        timestamp: '2025-06-07T20:30:00.000Z'
      }
    },
    category: 'Statystyki Real-time'
  },
  {
    method: 'GET',
    path: '/api/stats/detailed',
    description: '📊 HISTORYCZNE: Pobiera szczegółowe statystyki z bazy danych PostgreSQL',
    parameters: [
      { name: 'period', type: 'string', required: false, description: 'Okres: 7d, 30d, 90d, 1y', default: '30d' },
      { name: 'river', type: 'string', required: false, description: 'Filtruj po rzece', default: 'all' }
    ],
    example: {
      request: '/api/stats/detailed?period=7d&river=all',
      response: {
        status: 'success',
        data: {
          overview: {
            totalMeasurements: 50000,
            activeStations: 842,
            averageWaterLevel: 255.57,
            globalMinLevel: 1,
            globalMaxLevel: 70400,
            globalRange: 70399
          },
          riverStats: [
            {
              river: 'Wisła',
              stationCount: 38,
              averageLevel: 600.29,
              trend: 'stable'
            }
          ],
          monthlyStats: [],
          stationStats: []
        }
      }
    },
    category: 'Statystyki Historyczne'
  },
  // Alerty
  {
    method: 'GET',
    path: '/api/alerts',
    description: 'Pobiera listę aktywnych alertów hydrologicznych',
    example: {
      request: '/api/alerts',
      response: {
        status: 'success',
        alerts: [
          {
            id: 1,
            stationCode: '152210010',
            stationName: 'Warszawa',
            alertType: 'warning',
            waterLevel: 520,
            threshold: 500,
            timestamp: '2025-06-07T16:10:00.000Z'
          }
        ],
        count: 1
      }
    },
    category: 'Alerty'
  },
  // System
  {
    method: 'GET',
    path: '/api/health',
    description: '⚡ Sprawdza status systemu, bazy danych i API IMGW',
    example: {
      request: '/api/health',
      response: {
        status: 'healthy',
        services: {
          database: {
            status: 'healthy',
            stats: {
              total_stations: 871,
              active_stations_24h: 833,
              measurements_today: 1264
            }
          },
          imgw_api: {
            status: 'healthy',
            stations_available: 871
          }
        }
      }
    },
    category: 'System'
  },
  {
    method: 'GET',
    path: '/api/debug',
    description: 'Informacje debugowania i zmienne środowiskowe',
    example: {
      request: '/api/debug',
      response: {
        env_vars: {
          NODE_ENV: 'development',
          CRON_SECRET_TOKEN: 'SET'
        },
        timestamp: '2025-06-07T21:31:45.878Z'
      }
    },
    category: 'System'
  }
];

const CATEGORIES = [
  'Stacje Real-time', 
  'Pomiary Historyczne', 
  'Mapa', 
  'Statystyki Real-time', 
  'Statystyki Historyczne',
  'Zarządzanie', 
  'Alerty', 
  'System'
];

export default function APIDocsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Statystyki Real-time');
  const [baseUrl, setBaseUrl] = useState<string>('');

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const filteredEndpoints = API_ENDPOINTS.filter(endpoint => 
    endpoint.category === selectedCategory
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            📚 Hydro API - Dokumentacja
          </h1>
          <p className="text-lg text-gray-600 mb-6">
            Kompletna dokumentacja API do zarządzania danymi hydrologicznymi IMGW
          </p>
          
          {/* Base URL */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">🌐 Base URL</h3>
            <div className="flex items-center space-x-2">
              <code className="bg-blue-100 px-3 py-1 rounded text-blue-800 font-mono">
                {baseUrl || 'https://hydro-main.vercel.app'}
              </code>
              <button
                onClick={() => copyToClipboard(baseUrl || 'https://hydro-main.vercel.app')}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              >
                Kopiuj
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-blue-600">{API_ENDPOINTS.length}</div>
              <div className="text-sm text-gray-600">Endpointów API</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-green-600">871</div>
              <div className="text-sm text-gray-600">Stacji dostępnych</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">Real-time</div>
              <div className="text-sm text-gray-600">Dane z API IMGW</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-orange-600">PostgreSQL</div>
              <div className="text-sm text-gray-600">Baza historyczna</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="lg:w-64">
            <div className="bg-white rounded-lg shadow p-4 sticky top-4">
              <h3 className="font-semibold text-gray-900 mb-4">📂 Kategorie</h3>
              <nav className="space-y-2">
                {CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      selectedCategory === category
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {category}
                    <span className="ml-2 text-xs text-gray-500">
                      ({API_ENDPOINTS.filter(e => e.category === category).length})
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            <div className="space-y-6">
              {filteredEndpoints.map((endpoint, index) => (
                <div key={index} className="bg-white rounded-lg shadow-lg overflow-hidden">
                  {/* Header */}
                  <div className="bg-gray-50 px-6 py-4 border-b">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          endpoint.method === 'GET' ? 'bg-green-100 text-green-800' :
                          endpoint.method === 'POST' ? 'bg-blue-100 text-blue-800' :
                          endpoint.method === 'PUT' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {endpoint.method}
                        </span>
                        <code className="text-lg font-mono text-gray-800">
                          {endpoint.path}
                        </code>
                      </div>
                      <button
                        onClick={() => copyToClipboard(`${baseUrl}${endpoint.example.request}`)}
                        className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                      >
                        Kopiuj URL
                      </button>
                    </div>
                    <p className="text-gray-600 mt-2">{endpoint.description}</p>
                  </div>

                  <div className="p-6">
                    {/* Parameters */}
                    {endpoint.parameters && endpoint.parameters.length > 0 && (
                      <div className="mb-6">
                        <h4 className="font-semibold text-gray-900 mb-3">📋 Parametry</h4>
                        <div className="overflow-x-auto">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Nazwa</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Typ</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Wymagany</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Opis</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {endpoint.parameters.map((param, paramIndex) => (
                                <tr key={paramIndex}>
                                  <td className="px-4 py-2 text-sm font-mono text-gray-900">{param.name}</td>
                                  <td className="px-4 py-2 text-sm text-gray-600">{param.type}</td>
                                  <td className="px-4 py-2 text-sm">
                                    <span className={`px-2 py-1 rounded text-xs ${
                                      param.required ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {param.required ? 'Tak' : 'Nie'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-2 text-sm text-gray-600">
                                    {param.description}
                                    {param.default && (
                                      <span className="ml-2 text-xs text-gray-500">
                                        (domyślnie: {param.default})
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Example */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Request */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">🚀 Przykład żądania</h4>
                        <div className="bg-gray-900 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-green-400 text-sm font-mono">curl</span>
                            <button
                              onClick={() => copyToClipboard(`curl "${baseUrl}${endpoint.example.request}"`)}
                              className="text-gray-400 hover:text-white text-xs"
                            >
                              Kopiuj
                            </button>
                          </div>
                          <code className="text-green-300 text-sm break-all">
                            curl "{baseUrl}{endpoint.example.request}"
                          </code>
                        </div>
                        
                        {/* Live Test Button */}
                        <div className="mt-3">
                          <a
                            href={`${baseUrl}${endpoint.example.request}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                          >
                            🧪 Testuj na żywo
                          </a>
                        </div>
                      </div>

                      {/* Response */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">📤 Przykład odpowiedzi</h4>
                        <div className="bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                          <pre className="text-green-300 text-sm">
                            {JSON.stringify(endpoint.example.response, null, 2)}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Start Guide */}
        <div className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">🚀 Przewodnik szybkiego startu</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">1. 🔥 Pobierz statystyki real-time</h4>
              <div className="bg-gray-900 rounded p-3 mb-3">
                <code className="text-green-300 text-sm">
                  curl "{baseUrl}/api/stats"
                </code>
              </div>
              <p className="text-sm text-gray-600">Pobiera aktualne statystyki 871 stacji z API IMGW</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">2. 📊 Sprawdź dane historyczne</h4>
              <div className="bg-gray-900 rounded p-3 mb-3">
                <code className="text-green-300 text-sm">
                  curl "{baseUrl}/api/stats/detailed?period=7d"
                </code>
              </div>
              <p className="text-sm text-gray-600">Pobiera statystyki z ostatnich 7 dni z bazy PostgreSQL</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">3. 🗺️ Pobierz stacje na mapę</h4>
              <div className="bg-gray-900 rounded p-3 mb-3">
                <code className="text-green-300 text-sm">
                  curl "{baseUrl}/api/stations/map"
                </code>
              </div>
              <p className="text-sm text-gray-600">Pobiera wszystkie stacje z współrzędnymi do wyświetlenia na mapie</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">4. ⚡ Sprawdź status systemu</h4>
              <div className="bg-gray-900 rounded p-3 mb-3">
                <code className="text-green-300 text-sm">
                  curl "{baseUrl}/api/health"
                </code>
              </div>
              <p className="text-sm text-gray-600">Sprawdza czy system i baza danych działają poprawnie</p>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">💡 Przypadki użycia API Real-time</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🔥 Dashboardy w czasie rzeczywistym</h4>
              <p className="text-sm text-gray-600 mb-3">
                Twórz dashboardy z aktualnymi danymi z 871 stacji hydrologicznych. Idealne do monitoringu operacyjnego.
              </p>
              <div className="bg-gray-50 rounded p-2">
                <code className="text-xs text-gray-700">
                  GET /api/stats → 871 stacji real-time<br/>
                  GET /api/stations/map → Mapa interaktywna
                </code>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🚨 Systemy ostrzegania</h4>
              <p className="text-sm text-gray-600 mb-3">
                Monitoruj przekroczenia poziomów alarmowych i twórz systemy wczesnego ostrzegania przed powodziami.
              </p>
              <div className="bg-gray-50 rounded p-2">
                <code className="text-xs text-gray-700">
                  GET /api/stats → alarm_stats: {`{alarm: 12, warning: 85}`}<br/>
                  GET /api/alerts → Aktywne alerty
                </code>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📱 Aplikacje mobilne</h4>
              <p className="text-sm text-gray-600 mb-3">
                Integruj dane hydrologiczne z aplikacjami mobilnymi dla żeglarzy, kajakarzy i służb ratunkowych.
              </p>
              <div className="bg-gray-50 rounded p-2">
                <code className="text-xs text-gray-700">
                  GET /api/stations?voivodeship=mazowieckie<br/>
                  GET /api/stations/map → Współrzędne GPS
                </code>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🔗 Integracje IoT</h4>
              <p className="text-sm text-gray-600 mb-3">
                Połącz z systemami IoT, Home Assistant, MQTT. Automatyzuj działania na podstawie poziomów wody.
              </p>
              <div className="bg-gray-50 rounded p-2">
                <code className="text-xs text-gray-700">
                  setInterval(() =&gt; fetch('/api/stats'), 300000)<br/>
                  MQTT publish hydro/alarms
                </code>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Analizy historyczne</h4>
              <p className="text-sm text-gray-600 mb-3">
                Analizuj trendy i wzorce w danych hydrologicznych z bazy PostgreSQL. Porównuj okresy i rzeki.
              </p>
              <div className="bg-gray-50 rounded p-2">
                <code className="text-xs text-gray-700">
                  GET /api/stats/detailed?period=1y&river=Wisła<br/>
                  GET /api/database/recent-measurements
                </code>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🤖 Automatyzacja</h4>
              <p className="text-sm text-gray-600 mb-3">
                Automatyzuj pobieranie danych, twórz raporty, integruj z systemami zewnętrznymi.
              </p>
              <div className="bg-gray-50 rounded p-2">
                <code className="text-xs text-gray-700">
                  setInterval(() =&gt; fetch('/api/stats'), 60000)<br/>
                  Webhook notifications
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Architecture Overview */}
        <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">🏗️ Architektura systemu</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">🔥</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Real-time API</h4>
              <p className="text-sm text-gray-600">
                Dane pobierane bezpośrednio z API IMGW. Zawsze aktualne, cache 5 minut.
              </p>
              <div className="mt-2 text-xs text-blue-600 font-mono">
                /api/stats<br/>
                /api/stations
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">📊</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">Baza PostgreSQL</h4>
              <p className="text-sm text-gray-600">
                Dane historyczne, statystyki, trendy. Synchronizacja automatyczna.
              </p>
              <div className="mt-2 text-xs text-purple-600 font-mono">
                /api/stats/detailed<br/>
                /api/database/*
              </div>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">⚡</span>
              </div>
              <h4 className="font-medium text-gray-900 mb-2">System Alertów</h4>
              <p className="text-sm text-gray-600">
                Monitorowanie poziomów alarmowych i ostrzeżeń hydrologicznych.
              </p>
              <div className="mt-2 text-xs text-green-600 font-mono">
                /api/alerts<br/>
                /api/health
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">🔗 Przydatne linki</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/stats"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <h4 className="font-medium text-gray-900">📊 Statystyki Historyczne</h4>
              <p className="text-sm text-gray-600 mt-1">Analizy danych z bazy PostgreSQL</p>
            </a>
            <a
              href="/map"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <h4 className="font-medium text-gray-900">🗺️ Mapa Stacji</h4>
              <p className="text-sm text-gray-600 mt-1">Interaktywna mapa 871 stacji</p>
            </a>
            <a
              href="/stations"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <h4 className="font-medium text-gray-900">🔥 Dashboard Real-time</h4>
              <p className="text-sm text-gray-600 mt-1">Aktualne dane z API IMGW</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 