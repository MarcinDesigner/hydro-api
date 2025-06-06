// app/stations/page.tsx
'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, MapPin, TrendingUp, TrendingDown, Minus, Eye } from 'lucide-react';
import Link from 'next/link';
import { StationCard } from '@/components/StationCard';
import { StationEditModal } from '@/components/StationEditModal';
import { StationData } from '@/types/hydro';
import { useMapStationsData } from '@/hooks/useStationsData';
import { useCacheManager } from '@/hooks/useCacheManager';
import { useQueryClient } from '@tanstack/react-query';

export default function StationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVoivodeship, setSelectedVoivodeship] = useState('');
  const [selectedRiver, setSelectedRiver] = useState('');
  const [selectedTrend, setSelectedTrend] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [editingStation, setEditingStation] = useState<StationData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [hasRefreshed, setHasRefreshed] = useState(false);

  // Używamy React Query do pobierania danych z cache'em
  const { data: stationsResult, isLoading: loading, error, refetch } = useMapStationsData();
  const { refreshStationsData } = useCacheManager();
  const queryClient = useQueryClient();
  
  // Przekształć dane z SmartStationData na format StationData (memoized)
  const stations: StationData[] = useMemo(() => {
    return stationsResult?.data?.map((station: any) => ({
      id_stacji: station.id,
      stacja: station.name,
      rzeka: station.river || '',
      województwo: station.voivodeship || '',
      stan_wody: station.waterLevel?.toString() || '0',
      stan_wody_data_pomiaru: station.waterLevelDate || '',
      przelyw: station.flow?.toString() || '',
      przelyw_data_pomiaru: station.flowDate || '',
      temperatura_wody: '',
      temperatura_wody_data_pomiaru: '',
      zjawisko_lodowe: '',
      zjawisko_lodowe_data_pomiaru: '',
      poziom_ostrzegawczy: (station.warningLevel && station.warningLevel !== 'nie określono') ? station.warningLevel.toString() : '',
      poziom_alarmowy: (station.alarmLevel && station.alarmLevel !== 'nie określono') ? station.alarmLevel.toString() : '',
      longitude: station.longitude?.toString() || '',
      latitude: station.latitude?.toString() || '',
      trend: 'stable' as const, // Domyślnie stabilny - można by to obliczyć na podstawie poprzednich pomiarów
      zmiana_poziomu: '0'
    })) || [];
  }, [stationsResult]);

  // Filtrowanie stacji (memoized)
  const filteredStations = useMemo(() => {
    let filtered = [...stations];

    // Filtrowanie po nazwie stacji/rzece
    if (searchTerm) {
      filtered = filtered.filter(station =>
        station.stacja?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        station.rzeka?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrowanie po województwie
    if (selectedVoivodeship) {
      filtered = filtered.filter(station =>
        station.województwo?.toLowerCase().includes(selectedVoivodeship.toLowerCase())
      );
    }

    // Filtrowanie po rzece
    if (selectedRiver) {
      filtered = filtered.filter(station =>
        station.rzeka?.toLowerCase().includes(selectedRiver.toLowerCase())
      );
    }

    // Filtrowanie po trendzie
    if (selectedTrend) {
      filtered = filtered.filter(station => station.trend === selectedTrend);
    }

    return filtered;
  }, [stations, searchTerm, selectedVoivodeship, selectedRiver, selectedTrend]);

  const fetchStations = useCallback(async () => {
    // Wyczyść React Query cache
    queryClient.invalidateQueries({ queryKey: ['stations', 'map', 'smart'] });
    // Wyczyść server cache
    refreshStationsData();
    // Wymuś ponowne pobranie
    refetch();
  }, [queryClient, refreshStationsData, refetch]);

  // Wymuś odświeżenie przy pierwszym załadowaniu (wyłączone - może powodować problemy)
  // useEffect(() => {
  //   if (!hasRefreshed && !loading) {
  //     console.log('🔄 Wymuszam odświeżenie przy pierwszym załadowaniu');
  //     fetchStations();
  //     setHasRefreshed(true);
  //   }
  // }, [hasRefreshed, loading, fetchStations]);

  const getUniqueValues = (key: keyof StationData) => {
    const values = stations.map(station => station[key] as string).filter(Boolean);
    return [...new Set(values)].sort();
  };

  const getTrendStats = () => {
    const rising = filteredStations.filter(s => s.trend === 'rising').length;
    const falling = filteredStations.filter(s => s.trend === 'falling').length;
    const stable = filteredStations.filter(s => s.trend === 'stable').length;
    return { rising, falling, stable };
  };

  const trendStats = getTrendStats();

  const handleEditStation = (station: StationData) => {
    setEditingStation(station);
    setIsEditModalOpen(true);
  };

  const handleSaveStation = async (stationId: string, data: { riverName: string; warningLevel: number | null; alarmLevel: number | null }) => {
    try {
      const response = await fetch(`/api/stations/${stationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update station');
      }

      // Odśwież listę stacji
      await fetchStations();
      
      // Pokaż komunikat sukcesu (opcjonalnie)
      console.log('Station updated successfully');
    } catch (error) {
      console.error('Error updating station:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold text-gray-900">Błąd ładowania stacji</h2>
        <p className="text-red-600">
          {error instanceof Error ? error.message : 'Nieznany błąd'}
        </p>
        <button 
          onClick={() => refetch()} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Stacje hydrologiczne</h2>
          <p className="mt-2 text-gray-600">
            {filteredStations.length} z {stations.length} stacji
          </p>
          {stationsResult && (
            <p className="text-sm text-gray-500 mt-1">
              📊 {stationsResult.data?.length || 0} stacji • Cache: {stationsResult.cached ? 'HIT' : 'MISS'} • Wiek: {stationsResult.cacheAge || 0}s
            </p>
          )}
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchStations}
            className="flex items-center space-x-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors"
          >
            <span>🔄 Odśwież dane</span>
          </button>
          <Link
            href="/stations/visibility"
            className="flex items-center space-x-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Eye className="h-4 w-4" />
            <span>Zarządzaj widocznością</span>
          </Link>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Filter className="h-4 w-4" />
            <span>Filtry</span>
          </button>
        </div>
      </div>

      {/* Trend summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Poziom rośnie</p>
              <p className="text-xl font-bold text-green-600">{trendStats.rising}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <TrendingDown className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm text-gray-600">Poziom spada</p>
              <p className="text-xl font-bold text-red-600">{trendStats.falling}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <Minus className="h-5 w-5 text-blue-600" />
            <div>
              <p className="text-sm text-gray-600">Poziom stabilny</p>
              <p className="text-xl font-bold text-blue-600">{trendStats.stable}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Szukaj stacji/rzeki
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nazwa stacji lub rzeki..."
                />
              </div>
            </div>

            {/* Voivodeship filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Województwo
              </label>
              <select
                value={selectedVoivodeship}
                onChange={(e) => setSelectedVoivodeship(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Wszystkie województwa</option>
                {getUniqueValues('województwo').map(voivodeship => (
                  <option key={voivodeship} value={voivodeship}>
                    {voivodeship}
                  </option>
                ))}
              </select>
            </div>

            {/* River filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rzeka
              </label>
              <select
                value={selectedRiver}
                onChange={(e) => setSelectedRiver(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Wszystkie rzeki</option>
                {getUniqueValues('rzeka').map(river => (
                  <option key={river} value={river}>
                    {river}
                  </option>
                ))}
              </select>
            </div>

            {/* Trend filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Trend
              </label>
              <select
                value={selectedTrend}
                onChange={(e) => setSelectedTrend(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Wszystkie trendy</option>
                <option value="rising">Rośnie</option>
                <option value="falling">Spada</option>
                <option value="stable">Stabilny</option>
              </select>
            </div>
          </div>

          {/* Clear filters */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedVoivodeship('');
                setSelectedRiver('');
                setSelectedTrend('');
              }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Wyczyść filtry
            </button>
          </div>
        </div>
      )}

      {/* Stations grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredStations.map((station) => (
          <StationCard 
            key={station.id_stacji} 
            station={station} 
            onEdit={handleEditStation}
          />
        ))}
      </div>

      {/* Empty state */}
      {filteredStations.length === 0 && !loading && (
        <div className="text-center py-12">
          <MapPin className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Brak stacji</h3>
          <p className="mt-1 text-sm text-gray-500">
            Nie znaleziono stacji pasujących do wybranych filtrów.
          </p>
        </div>
      )}

      {/* Edit Modal */}
      {editingStation && (
        <StationEditModal
          station={editingStation}
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingStation(null);
          }}
          onSave={handleSaveStation}
        />
      )}
    </div>
  );
}