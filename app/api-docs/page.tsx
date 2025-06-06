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
    description: 'Pobiera listę wszystkich stacji hydrologicznych z najświeższymi danymi',
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
            id_stacji: '152210010',
            stacja: 'Warszawa',
            rzeka: 'Wisła',
            województwo: 'mazowieckie',
            stan_wody: '162',
            stan_wody_data_pomiaru: '2025-06-05 16:10:00',
            poziom_ostrzegawczy: '500',
            poziom_alarmowy: '600',
            status_alarmowy: 'normal',
            longitude: 21.0122,
            latitude: 52.2297
          }
        ],
        count: 1
      }
    },
    category: 'Stacje'
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
          stationCode: '152210010',
          stationName: 'Warszawa',
          riverName: 'Wisła',
          voivodeship: 'mazowieckie',
          warningLevel: 500,
          alarmLevel: 600
        }
      }
    },
    category: 'Stacje'
  },
  {
    method: 'PUT',
    path: '/api/stations/{id}',
    description: 'Aktualizuje dane stacji (nazwa rzeki, poziomy alarmowe)',
    parameters: [
      { name: 'id', type: 'string', required: true, description: 'Kod stacji' }
    ],
    example: {
      request: '/api/stations/152210010',
      response: {
        status: 'success',
        message: 'Station updated successfully',
        station: {
          stationCode: '152210010',
          riverName: 'Wisła Warszawska',
          warningLevel: 520,
          alarmLevel: 620
        }
      }
    },
    category: 'Stacje'
  },
  // Pomiary historyczne
  {
    method: 'GET',
    path: '/api/stations/{id}/measurements',
    description: 'Pobiera historyczne pomiary dla stacji (do wykresów)',
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
              timestamp: '2025-06-05T16:10:00.000Z',
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
    category: 'Pomiary'
  },
  // Mapa
  {
    method: 'GET',
    path: '/api/stations/map',
    description: 'Pobiera stacje z współrzędnymi geograficznymi do wyświetlenia na mapie',
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
  // Synchronizacja
  {
    method: 'POST',
    path: '/api/sync',
    description: 'Synchronizuje dane z API IMGW do bazy danych (używane przez cron job)',
    example: {
      request: '/api/sync',
      response: {
        status: 'success',
        message: 'Data synchronized successfully with database',
        stats: {
          total_stations: 866,
          synced_stations: 10,
          synced_measurements: 15,
          errors: 0
        }
      }
    },
    category: 'Synchronizacja'
  },
  // Widoczność stacji
  {
    method: 'GET',
    path: '/api/stations/visibility',
    description: 'Pobiera statystyki widoczności stacji w API',
    example: {
      request: '/api/stations/visibility',
      response: {
        status: 'success',
        data: {
          totalStations: 866,
          visibleStations: 860,
          hiddenStations: 6
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
  // Statystyki
  {
    method: 'GET',
    path: '/api/stats',
    description: 'Pobiera statystyki systemu i stacji',
    example: {
      request: '/api/stats',
      response: {
        status: 'success',
        stats: {
          totalStations: 866,
          activeStations: 560,
          measurementsToday: 551,
          lastSync: '2025-06-05T16:10:00.000Z'
        }
      }
    },
    category: 'Statystyki'
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
            timestamp: '2025-06-05T16:10:00.000Z'
          }
        ],
        count: 1
      }
    },
    category: 'Alerty'
  },
  {
    method: 'POST',
    path: '/api/alerts',
    description: 'Tworzy nowy alert hydrologiczny',
    parameters: [
      { name: 'stationCode', type: 'string', required: true, description: 'Kod stacji' },
      { name: 'alertType', type: 'string', required: true, description: 'Typ alertu: warning lub alarm' },
      { name: 'message', type: 'string', required: false, description: 'Dodatkowa wiadomość' }
    ],
    example: {
      request: '/api/alerts',
      response: {
        status: 'success',
        message: 'Alert created successfully',
        alertId: 123
      }
    },
    category: 'Alerty'
  },
  // Konfiguracja
  {
    method: 'GET',
    path: '/api/config',
    description: 'Pobiera konfigurację systemu',
    example: {
      request: '/api/config',
      response: {
        status: 'success',
        config: {
          syncInterval: 3600,
          alertThresholds: {
            warning: 0.8,
            alarm: 0.9
          },
          enabledFeatures: ['alerts', 'sync', 'maps']
        }
      }
    },
    category: 'Konfiguracja'
  },
  {
    method: 'POST',
    path: '/api/config',
    description: 'Aktualizuje konfigurację systemu',
    parameters: [
      { name: 'syncInterval', type: 'number', required: false, description: 'Interwał synchronizacji w sekundach' },
      { name: 'alertThresholds', type: 'object', required: false, description: 'Progi alertów' }
    ],
    example: {
      request: '/api/config',
      response: {
        status: 'success',
        message: 'Configuration updated successfully'
      }
    },
    category: 'Konfiguracja'
  },
  // Współrzędne
  {
    method: 'GET',
    path: '/api/coordinates/stats',
    description: 'Pobiera statystyki współrzędnych geograficznych stacji',
    example: {
      request: '/api/coordinates/stats',
      response: {
        status: 'success',
        stats: {
          totalStations: 866,
          withCoordinates: 850,
          withoutCoordinates: 16,
          coverage: 98.2
        }
      }
    },
    category: 'Współrzędne'
  },
  {
    method: 'POST',
    path: '/api/coordinates/initialize',
    description: 'Inicjalizuje współrzędne geograficzne dla wszystkich stacji',
    example: {
      request: '/api/coordinates/initialize',
      response: {
        status: 'success',
        message: 'Coordinates initialization started',
        processed: 866,
        updated: 16
      }
    },
    category: 'Współrzędne'
  },
  {
    method: 'POST',
    path: '/api/coordinates/refresh',
    description: 'Odświeża współrzędne geograficzne dla stacji bez współrzędnych',
    example: {
      request: '/api/coordinates/refresh',
      response: {
        status: 'success',
        message: 'Coordinates refresh completed',
        updated: 5
      }
    },
    category: 'Współrzędne'
  },
  // System
  {
    method: 'GET',
    path: '/api/health',
    description: 'Sprawdza status systemu, bazy danych i API IMGW',
    example: {
      request: '/api/health',
      response: {
        status: 'healthy',
        services: {
          database: {
            status: 'healthy',
            stats: {
              total_stations: 560,
              active_stations_24h: 533,
              measurements_today: 551
            }
          },
          imgw_api: {
            status: 'healthy',
            stations_available: 609
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
        }
      }
    },
    category: 'System'
  }
];

const CATEGORIES = ['Stacje', 'Pomiary', 'Mapa', 'Synchronizacja', 'Zarządzanie', 'Statystyki', 'Alerty', 'Konfiguracja', 'Współrzędne', 'System'];

export default function APIDocsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('Stacje');
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
                {baseUrl || 'http://localhost:3000'}
              </code>
              <button
                onClick={() => copyToClipboard(baseUrl || 'http://localhost:3000')}
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
              <div className="text-2xl font-bold text-green-600">866</div>
              <div className="text-sm text-gray-600">Stacji dostępnych</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-purple-600">7+ lat</div>
              <div className="text-sm text-gray-600">Danych historycznych</div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow">
              <div className="text-2xl font-bold text-orange-600">Co godzinę</div>
              <div className="text-sm text-gray-600">Aktualizacja danych</div>
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
              <h4 className="font-medium text-gray-900 mb-3">1. Pobierz listę stacji</h4>
              <div className="bg-gray-900 rounded p-3 mb-3">
                <code className="text-green-300 text-sm">
                  curl "{baseUrl}/api/stations?limit=10"
                </code>
              </div>
              <p className="text-sm text-gray-600">Pobiera 10 pierwszych stacji z najświeższymi danymi</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">2. Sprawdź dane historyczne</h4>
              <div className="bg-gray-900 rounded p-3 mb-3">
                <code className="text-green-300 text-sm">
                  curl "{baseUrl}/api/stations/152210010/measurements?days=7"
                </code>
              </div>
              <p className="text-sm text-gray-600">Pobiera pomiary z ostatnich 7 dni dla stacji Warszawa</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">3. Sprawdź status systemu</h4>
              <div className="bg-gray-900 rounded p-3 mb-3">
                <code className="text-green-300 text-sm">
                  curl "{baseUrl}/api/health"
                </code>
              </div>
              <p className="text-sm text-gray-600">Sprawdza czy system i baza danych działają poprawnie</p>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">4. Pobierz stacje na mapę</h4>
              <div className="bg-gray-900 rounded p-3 mb-3">
                <code className="text-green-300 text-sm">
                  curl "{baseUrl}/api/stations/map"
                </code>
              </div>
              <p className="text-sm text-gray-600">Pobiera wszystkie stacje z współrzędnymi do wyświetlenia na mapie</p>
            </div>
          </div>
        </div>

        {/* Use Cases */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">💡 Przykłady zastosowań</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📈 Monitoring poziomu wody</h4>
              <p className="text-sm text-gray-600 mb-3">
                Pobieraj dane w czasie rzeczywistym i twórz wykresy poziomu wody dla wybranych stacji.
              </p>
              <div className="bg-gray-50 rounded p-2">
                <code className="text-xs text-gray-700">
                  GET /api/stations?fresh=true&voivodeship=mazowieckie
                </code>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🚨 System alertów</h4>
              <p className="text-sm text-gray-600 mb-3">
                Monitoruj przekroczenia poziomów ostrzegawczych i alarmowych.
              </p>
              <div className="bg-gray-50 rounded p-2">
                <code className="text-xs text-gray-700">
                  GET /api/alerts<br/>
                  POST /api/alerts
                </code>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">🗺️ Aplikacje mapowe</h4>
              <p className="text-sm text-gray-600 mb-3">
                Integruj dane hydrologiczne z mapami interaktywnymi.
              </p>
              <div className="bg-gray-50 rounded p-2">
                <code className="text-xs text-gray-700">
                  GET /api/stations/map
                </code>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">📊 Analizy historyczne</h4>
              <p className="text-sm text-gray-600 mb-3">
                Analizuj trendy i wzorce w danych hydrologicznych z ostatnich lat.
              </p>
              <div className="bg-gray-50 rounded p-2">
                <code className="text-xs text-gray-700">
                  GET /api/stations/[id]/measurements?days=365
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 mb-4">🔗 Przydatne linki</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/stations"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <h4 className="font-medium text-gray-900">📊 Dashboard Stacji</h4>
              <p className="text-sm text-gray-600 mt-1">Zarządzaj stacjami i edytuj dane</p>
            </a>
            <a
              href="/map"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <h4 className="font-medium text-gray-900">🗺️ Mapa Stacji</h4>
              <p className="text-sm text-gray-600 mt-1">Interaktywna mapa wszystkich stacji</p>
            </a>
            <a
              href="/stations/visibility"
              className="block p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <h4 className="font-medium text-gray-900">👁️ Zarządzanie Widocznością</h4>
              <p className="text-sm text-gray-600 mt-1">Ukrywaj/pokazuj stacje w API</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
} 