'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Droplets, AlertCircle, RefreshCw, Eye, EyeOff } from 'lucide-react';
import L from 'leaflet';
import { useMapStationsData } from '../hooks/useStationsData';
import { useCacheManager } from '../hooks/useCacheManager';

// Dynamiczny import mapy (tylko po stronie klienta)
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

interface StationData {
  id: string;
  name: string;
  waterLevel: number | null;
  waterLevelDate: string;
  flow?: number | null;
  flowDate?: string | null;
  river?: string | null;
  voivodeship?: string | null;
  longitude: number | null;
  latitude: number | null;
  coordinatesSource: 'cache' | 'hydro2' | 'none';
  source: string;
  // Nowe pola z SmartDataService
  dataFreshness?: 'fresh' | 'stale';
  hoursOld?: number;
  timestamp?: string;
  // Poziomy alarmowe
  warningLevel?: number | 'nie określono';
  alarmLevel?: number | 'nie określono';
  alarmStatus?: 'normal' | 'warning' | 'alarm' | 'unknown';
  alarmMessage?: string;
}

const StationsMap = () => {
  const [mapReady, setMapReady] = useState(false);
  const [hidingStation, setHidingStation] = useState<string | null>(null);
  
  // Używamy React Query do pobierania danych z cache'em
  const { data: stationsResult, isLoading: loading, error, refetch } = useMapStationsData();
  const { refreshStationsData, getCacheStatus } = useCacheManager();
  
  // Przekształć dane z Smart API na format używany przez mapę
  const stations: StationData[] = stationsResult?.data?.map((station: any) => ({
    id: station.id,
    name: station.name,
    waterLevel: station.waterLevel,
    waterLevelDate: station.waterLevelDate,
    flow: station.flow,
    flowDate: station.flowDate,
    river: station.river,
    voivodeship: station.voivodeship,
    longitude: station.longitude,
    latitude: station.latitude,
    coordinatesSource: station.coordinatesSource,
    source: station.source,
    dataFreshness: station.dataFreshness,
    hoursOld: station.hoursOld,
    timestamp: station.timestamp,
    alarmStatus: station.alarmStatus,
    warningLevel: station.warningLevel,
    alarmLevel: station.alarmLevel,
    alarmMessage: station.alarmMessage
  })) || [];

  useEffect(() => {
    setMapReady(true);
  }, []);

  // Funkcja do odświeżania danych
  const fetchStations = async () => {
    refreshStationsData();
  };

  // Funkcja do ukrywania/pokazywania stacji
  const toggleStationVisibility = async (stationId: string, stationName: string) => {
    try {
      setHidingStation(stationId);
      
      const response = await fetch(`/api/stations/${stationId}/visibility`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: `Toggled from map for station: ${stationName}`
        })
      });

      const data = await response.json();
      
      if (data.status === 'success') {
        // Odśwież listę stacji
        await fetchStations();
        
        // Pokaż komunikat
        alert(`Stacja "${stationName}" została ${data.data.isVisible ? 'pokazana' : 'ukryta'} w API`);
      } else {
        throw new Error(data.error || 'Failed to toggle station visibility');
      }
    } catch (error) {
      console.error('Error toggling station visibility:', error);
      alert('Błąd podczas zmiany widoczności stacji');
    } finally {
      setHidingStation(null);
    }
  };

  // Funkcja do określenia koloru markera na podstawie statusu alarmowego
  const getMarkerColor = (station: StationData) => {
    // Użyj statusu alarmowego jeśli dostępny
    if (station.alarmStatus) {
      switch (station.alarmStatus) {
        case 'alarm': return '#EF4444'; // czerwony - alarm
        case 'warning': return '#F59E0B'; // pomarańczowy - ostrzeżenie
        case 'normal': return '#10B981'; // zielony - normalny
        case 'unknown': 
        default: return '#6B7280'; // szary - nieznany/brak danych
      }
    }
    
    // Fallback do starych kolorów na podstawie poziomu wody
    const waterLevel = station.waterLevel;
    if (!waterLevel) return '#6B7280'; // szary dla brak danych
    
    if (waterLevel > 500) return '#EF4444'; // czerwony - wysoki poziom
    if (waterLevel > 300) return '#F59E0B'; // pomarańczowy - średni poziom
    if (waterLevel > 100) return '#10B981'; // zielony - normalny poziom
    return '#3B82F6'; // niebieski - niski poziom
  };

  // Funkcja do formatowania poziomu wody dla markera
  const formatWaterLevelForMarker = (waterLevel: number | null): string => {
    if (!waterLevel) return '?';
    
    if (waterLevel >= 1000) {
      return `${Math.round(waterLevel / 100) / 10}k`;
    }
    
    return waterLevel.toString();
  };

  // Funkcja do tworzenia niestandardowej ikony SVG
  const createCustomIcon = (station: StationData) => {
    const color = getMarkerColor(station);
    const displayLevel = formatWaterLevelForMarker(station.waterLevel);
    const fontSize = displayLevel.length > 3 ? '9' : displayLevel.length > 2 ? '10' : '12';
    
    // Wszystkie ikony mają ten sam rozmiar, ale różne efekty wizualne
    const isHighPriority = station.alarmStatus === 'alarm' || station.alarmStatus === 'warning';
    const iconSize = 40; // Stały rozmiar dla wszystkich
    
    // Używamy stałego viewBox 40x40 dla wszystkich ikon
    const svgIcon = `
      <svg width="${iconSize}" height="${iconSize}" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow-${station.id}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="2" stdDeviation="${isHighPriority ? '3' : '2'}" flood-color="#000000" flood-opacity="${isHighPriority ? '0.5' : '0.3'}"/>
          </filter>
          ${isHighPriority ? `
          <filter id="glow-${station.id}" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          ` : ''}
        </defs>
        ${isHighPriority ? `
        <circle cx="20" cy="20" r="22" fill="${color}" opacity="0.3" 
                filter="url(#glow-${station.id})"/>
        ` : ''}
        <circle cx="20" cy="20" r="18" fill="${color}" stroke="#ffffff" stroke-width="3" 
                filter="url(#shadow-${station.id})" opacity="0.95"/>
        <circle cx="20" cy="20" r="14" fill="${color}" opacity="0.8"/>
        ${isHighPriority && station.alarmStatus === 'alarm' ? `
        <circle cx="20" cy="20" r="11" fill="none" stroke="#ffffff" stroke-width="2" opacity="0.8">
          <animate attributeName="r" values="11;16;11" dur="2s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.8;0.3;0.8" dur="2s" repeatCount="indefinite"/>
        </circle>
        ` : ''}
        <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" 
              font-size="${fontSize}" font-weight="bold" stroke="#000000" stroke-width="0.5" 
              stroke-opacity="0.3">${displayLevel}</text>
      </svg>
    `;

    return L.divIcon({
      html: svgIcon,
      className: `custom-station-marker ${isHighPriority ? 'high-priority-marker' : ''} ${station.alarmStatus === 'alarm' ? 'alarm-marker' : ''}`,
      iconSize: [iconSize, iconSize],
      iconAnchor: [iconSize/2, iconSize/2], // Dokładne centrowanie
      popupAnchor: [0, -iconSize/2] // Popup nad ikoną
    });
  };

  // Funkcja do formatowania daty
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString('pl-PL');
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="text-center">
          <RefreshCw className="animate-spin h-8 w-8 text-blue-600 mx-auto mb-2" />
          <p className="text-gray-600">Ładowanie mapy stacji...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg border border-red-200">
        <div className="text-center">
          <AlertCircle className="h-8 w-8 text-red-600 mx-auto mb-2" />
          <p className="text-red-800 font-medium">Błąd ładowania mapy</p>
          <p className="text-red-600 text-sm mt-1">{error instanceof Error ? error.message : 'Nieznany błąd'}</p>
          <button
            onClick={fetchStations}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  if (!mapReady) {
    return (
      <div className="h-96 bg-gray-100 rounded-lg flex items-center justify-center">
        <p className="text-gray-600">Przygotowywanie mapy...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statystyki */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="text-blue-600" />
              Mapa Stacji Hydrologicznych
            </h2>
            {stationsResult && (
              <p className="text-sm text-gray-500 mt-1">
                {stationsResult.status === 'success' ? 
                  `📊 ${stationsResult.count} stacji z bazy danych` : 
                  '⚠️ Błąd pobierania danych'
                }
              </p>
            )}
          </div>
          <button
            onClick={fetchStations}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Odśwież
          </button>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{stations.length}</div>
            <div className="text-sm text-gray-600">Stacji na mapie</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stations.filter(s => s.dataFreshness === 'fresh').length}
            </div>
            <div className="text-sm text-gray-600">Świeże dane</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {stations.filter(s => s.dataFreshness === 'stale').length}
            </div>
            <div className="text-sm text-gray-600">Przestarzałe</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {stations.filter(s => s.alarmStatus === 'normal').length}
            </div>
            <div className="text-sm text-gray-600">Normalny</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">
              {stations.filter(s => s.alarmStatus === 'warning').length}
            </div>
            <div className="text-sm text-gray-600">Ostrzeżenie</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {stations.filter(s => s.alarmStatus === 'alarm').length}
            </div>
            <div className="text-sm text-gray-600">Alarm</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-600">
              {stations.filter(s => s.alarmStatus === 'unknown' || !s.alarmStatus).length}
            </div>
            <div className="text-sm text-gray-600">Brak danych</div>
          </div>
        </div>

        {/* Legenda */}
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Normalny</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
            <span>Ostrzeżenie</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Alarm</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
            <span>Brak danych/nieznany</span>
          </div>
        </div>
      </div>

      {/* Mapa */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div style={{ height: '600px', width: '100%' }}>
          <MapContainer
            center={[52.0, 19.0]} // Centrum Polski
            zoom={6}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {stations
              .filter(station => {
                // Filtruj tylko stacje z prawidłowymi współrzędnymi
                return station.latitude !== null && 
                       station.longitude !== null &&
                       !isNaN(station.latitude) &&
                       !isNaN(station.longitude) &&
                       Math.abs(station.latitude) <= 90 &&
                       Math.abs(station.longitude) <= 180;
              })
              .sort((a, b) => {
                // Sortuj tak, aby stacje alarmowe były na końcu (renderowane jako ostatnie = na wierzchu)
                const getPriority = (station: StationData) => {
                  if (station.alarmStatus === 'alarm') return 3;
                  if (station.alarmStatus === 'warning') return 2;
                  return 1;
                };
                return getPriority(a) - getPriority(b);
              })
              .map((station) => {
                // Debug dla stacji alarmowych
                if (station.alarmStatus === 'alarm') {
                  console.log('Alarm station:', station.name, 'Lat:', station.latitude, 'Lon:', station.longitude);
                }
                
                return (
                  <Marker
                    key={station.id}
                    position={[station.latitude!, station.longitude!]}
                    icon={createCustomIcon(station)}
                    zIndexOffset={station.alarmStatus === 'alarm' ? 1000 : station.alarmStatus === 'warning' ? 500 : 0}
                  >
                <Popup>
                  <div className="p-2 min-w-64">
                    <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
                      <Droplets className="text-blue-600" size={20} />
                      {station.name}
                    </h3>
                    
                    <div className="space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <span className="font-medium">ID stacji:</span>
                        <span>{station.id}</span>
                      </div>
                      
                      {station.river && (
                        <div className="grid grid-cols-2 gap-2">
                          <span className="font-medium">Rzeka:</span>
                          <span>{station.river}</span>
                        </div>
                      )}
                      
                      {station.voivodeship && (
                        <div className="grid grid-cols-2 gap-2">
                          <span className="font-medium">Województwo:</span>
                          <span>{station.voivodeship}</span>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2">
                        <span className="font-medium">Stan wody:</span>
                        <span className={`font-bold ${
                          station.alarmStatus === 'alarm' ? 'text-red-600' :
                          station.alarmStatus === 'warning' ? 'text-orange-600' :
                          station.alarmStatus === 'normal' ? 'text-green-600' :
                          'text-gray-500'
                        }`}>
                          {station.waterLevel ? `${station.waterLevel} cm` : 'Brak danych'}
                        </span>
                      </div>
                      
                      {station.alarmStatus && station.alarmStatus !== 'unknown' && (
                        <div className="grid grid-cols-2 gap-2">
                          <span className="font-medium">Status:</span>
                          <span className={`font-bold ${
                            station.alarmStatus === 'alarm' ? 'text-red-600' :
                            station.alarmStatus === 'warning' ? 'text-orange-600' :
                            'text-green-600'
                          }`}>
                            {station.alarmStatus === 'alarm' ? 'ALARM' :
                             station.alarmStatus === 'warning' ? 'OSTRZEŻENIE' :
                             'NORMALNY'}
                          </span>
                        </div>
                      )}
                      
                      {station.warningLevel && station.warningLevel !== 'nie określono' && (
                        <div className="grid grid-cols-2 gap-2">
                          <span className="font-medium">Poziom ostrzegawczy:</span>
                          <span className="text-orange-600 font-medium">{station.warningLevel} cm</span>
                        </div>
                      )}
                      
                      {station.alarmLevel && station.alarmLevel !== 'nie określono' && (
                        <div className="grid grid-cols-2 gap-2">
                          <span className="font-medium">Poziom alarmowy:</span>
                          <span className="text-red-600 font-medium">{station.alarmLevel} cm</span>
                        </div>
                      )}
                      
                      {station.alarmMessage && (
                        <div className="col-span-2 p-2 bg-gray-50 rounded text-xs">
                          <span className="font-medium">Info:</span> {station.alarmMessage}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2">
                        <span className="font-medium">Data pomiaru:</span>
                        <span className="text-xs">{formatDate(station.waterLevelDate)}</span>
                      </div>
                      
                      {station.dataFreshness && (
                        <div className="grid grid-cols-2 gap-2">
                          <span className="font-medium">Świeżość danych:</span>
                          <span className={`text-xs font-medium ${
                            station.dataFreshness === 'fresh' ? 'text-green-600' : 'text-orange-600'
                          }`}>
                            {station.dataFreshness === 'fresh' ? '🟢 Świeże' : '🟡 Przestarzałe'}
                            {station.hoursOld && ` (${station.hoursOld}h)`}
                          </span>
                        </div>
                      )}
                      
                      {station.flow && (
                        <div className="grid grid-cols-2 gap-2">
                          <span className="font-medium">Przepływ:</span>
                          <span>{station.flow} m³/s</span>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-2">
                        <span className="font-medium">Współrzędne:</span>
                        <span className="text-xs">
                          {station.coordinatesSource === 'cache' ? '📍 Cache' : '🌐 API'}
                        </span>
                      </div>
                      
                      <div className="pt-2 border-t">
                        <span className="text-xs text-gray-500">
                        Źródło: {station.source} | {station.latitude && typeof station.latitude === 'number' ? station.latitude.toFixed(4) : 'N/A'}, {station.longitude && typeof station.longitude === 'number' ? station.longitude.toFixed(4) : 'N/A'}
                        </span>
                      </div>
                      
                      {/* Przycisk ukryj/pokaż stację */}
                      <div className="pt-3 border-t mt-3">
                        <button
                          onClick={() => toggleStationVisibility(station.id, station.name)}
                          disabled={hidingStation === station.id}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {hidingStation === station.id ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Ukrywanie...
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-4 w-4" />
                              Ukryj stację w API
                            </>
                          )}
                        </button>
                        <p className="text-xs text-gray-500 mt-1 text-center">
                          Stacja zostanie ukryta we wszystkich endpointach API
                        </p>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
                );
              })}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default StationsMap; 