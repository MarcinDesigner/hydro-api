'use client';

import { useState, useEffect } from 'react';
import { Eye, EyeOff, RefreshCw, AlertCircle, CheckCircle, Trash2 } from 'lucide-react';

interface VisibilityStats {
  totalStations: number;
  visibleStations: number;
  hiddenStations: number;
  hiddenStationsList: Array<{
    stationId: string;
    isVisible: boolean;
    hiddenAt?: string;
    hiddenBy?: string;
    reason?: string;
  }>;
}

interface StationData {
  id_stacji: string;
  stacja: string;
  rzeka?: string;
  województwo?: string;
  stan_wody: number | null;
  status_alarmowy?: string;
}

export default function StationVisibilityPage() {
  const [stats, setStats] = useState<VisibilityStats | null>(null);
  const [stations, setStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Pobierz statystyki widoczności
  const fetchVisibilityStats = async () => {
    try {
      const response = await fetch('/api/stations/visibility');
      const data = await response.json();
      
      if (data.status === 'success') {
        setStats(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch visibility stats');
      }
    } catch (err) {
      setError('Błąd podczas pobierania statystyk widoczności');
      console.error('Error fetching visibility stats:', err);
    }
  };

  // Pobierz wszystkie stacje
  const fetchAllStations = async () => {
    try {
      const response = await fetch('/api/stations');
      const data = await response.json();
      
      if (data.status === 'success') {
        setStations(data.stations);
      } else {
        throw new Error(data.error || 'Failed to fetch stations');
      }
    } catch (err) {
      setError('Błąd podczas pobierania stacji');
      console.error('Error fetching stations:', err);
    }
  };

  // Przełącz widoczność stacji
  const toggleStationVisibility = async (stationId: string, currentlyVisible: boolean) => {
    try {
      setActionLoading(stationId);
      
      const response = await fetch(`/api/stations/${stationId}/visibility`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isVisible: !currentlyVisible,
          reason: `Toggled from visibility management page`
        })
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        // Odśwież dane
        await Promise.all([fetchVisibilityStats(), fetchAllStations()]);
      } else {
        throw new Error(data.error || 'Failed to toggle station visibility');
      }
    } catch (error) {
      console.error('Error toggling station visibility:', error);
      alert('Błąd podczas zmiany widoczności stacji');
    } finally {
      setActionLoading(null);
    }
  };

  // Przywróć widoczność wszystkich stacji
  const showAllStations = async () => {
    if (!confirm('Czy na pewno chcesz przywrócić widoczność wszystkich stacji?')) {
      return;
    }

    try {
      setActionLoading('all');
      
      // Przywróć widoczność dla każdej ukrytej stacji
      if (stats?.hiddenStationsList) {
        for (const hiddenStation of stats.hiddenStationsList) {
          await fetch(`/api/stations/${hiddenStation.stationId}/visibility`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              isVisible: true,
              reason: 'Restored all stations visibility'
            })
          });
        }
      }
      
      // Odśwież dane
      await Promise.all([fetchVisibilityStats(), fetchAllStations()]);
      
      alert('Widoczność wszystkich stacji została przywrócona');
    } catch (error) {
      console.error('Error showing all stations:', error);
      alert('Błąd podczas przywracania widoczności stacji');
    } finally {
      setActionLoading(null);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchVisibilityStats(), fetchAllStations()]);
      setLoading(false);
    };

    loadData();
  }, []);

  // Sprawdź czy stacja jest ukryta
  const isStationHidden = (stationId: string): boolean => {
    return stats?.hiddenStationsList.some(h => h.stationId === stationId) || false;
  };

  // Pobierz informacje o ukryciu stacji
  const getHiddenInfo = (stationId: string) => {
    return stats?.hiddenStationsList.find(h => h.stationId === stationId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Ładowanie danych widoczności...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg border border-red-200">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <p className="text-red-800 font-medium">Błąd ładowania danych</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Zarządzanie widocznością stacji</h2>
        <p className="mt-2 text-gray-600">
          Kontroluj które stacje są widoczne w API
        </p>
      </div>

      {/* Statystyki */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3">
              <Eye className="h-6 w-6 text-blue-500" />
              <div>
                <p className="text-sm text-gray-600">Łącznie stacji</p>
                <p className="text-2xl font-bold text-blue-600">{stations.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
              <div>
                <p className="text-sm text-gray-600">Widoczne w API</p>
                <p className="text-2xl font-bold text-green-600">{stations.length - stats.hiddenStations}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3">
              <EyeOff className="h-6 w-6 text-red-500" />
              <div>
                <p className="text-sm text-gray-600">Ukryte</p>
                <p className="text-2xl font-bold text-red-600">{stats.hiddenStations}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <button
              onClick={showAllStations}
              disabled={actionLoading === 'all' || stats.hiddenStations === 0}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {actionLoading === 'all' ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Przywracanie...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  Pokaż wszystkie
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Lista stacji */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Wszystkie stacje</h3>
          <p className="text-sm text-gray-600">Kliknij przycisk aby ukryć/pokazać stację w API</p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stacja
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rzeka
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Województwo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Widoczność
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stations.map((station) => {
                const isHidden = isStationHidden(station.id_stacji);
                const hiddenInfo = getHiddenInfo(station.id_stacji);
                
                return (
                  <tr key={station.id_stacji} className={isHidden ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{station.stacja}</div>
                        <div className="text-sm text-gray-500">ID: {station.id_stacji}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {station.rzeka || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {station.województwo || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        station.status_alarmowy === 'alarm' ? 'bg-red-100 text-red-800' :
                        station.status_alarmowy === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                        station.status_alarmowy === 'normal' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {station.status_alarmowy === 'alarm' ? 'Alarm' :
                         station.status_alarmowy === 'warning' ? 'Ostrzeżenie' :
                         station.status_alarmowy === 'normal' ? 'Normalny' :
                         'Nieznany'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                                                 {isHidden ? (
                           <div>
                             <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                               <EyeOff className="h-3 w-3 mr-1" />
                               Ukryta
                             </span>
                             {hiddenInfo?.hiddenAt && (
                               <div className="text-xs text-gray-500 mt-1">
                                 Ukryta: {new Date(hiddenInfo.hiddenAt).toLocaleString('pl-PL')}
                               </div>
                             )}
                           </div>
                        ) : (
                          <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            <Eye className="h-3 w-3 mr-1" />
                            Widoczna
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => toggleStationVisibility(station.id_stacji, !isHidden)}
                        disabled={actionLoading === station.id_stacji}
                        className={`inline-flex items-center px-3 py-1 border border-transparent text-sm leading-4 font-medium rounded-md text-white transition-colors ${
                          isHidden 
                            ? 'bg-green-600 hover:bg-green-700' 
                            : 'bg-red-600 hover:bg-red-700'
                        } disabled:opacity-50 disabled:cursor-not-allowed`}
                      >
                        {actionLoading === station.id_stacji ? (
                          <RefreshCw className="h-3 w-3 animate-spin" />
                        ) : isHidden ? (
                          <>
                            <Eye className="h-3 w-3 mr-1" />
                            Pokaż
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Ukryj
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>


    </div>
  );
} 