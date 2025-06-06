// app/stations/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, MapPin, TrendingUp, TrendingDown, Minus, Eye, Settings } from 'lucide-react';
import Link from 'next/link';
import { StationCard } from '@/components/StationCard';
import { StationEditModal } from '@/components/StationEditModal';
import { StationData } from '@/types/hydro';

export default function StationsPage() {
  const [stations, setStations] = useState<StationData[]>([]);
  const [filteredStations, setFilteredStations] = useState<StationData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedVoivodeship, setSelectedVoivodeship] = useState('');
  const [selectedRiver, setSelectedRiver] = useState('');
  const [selectedTrend, setSelectedTrend] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [editingStation, setEditingStation] = useState<StationData | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [chartDays, setChartDays] = useState(7);
  const [currentPage, setCurrentPage] = useState(1);
  const [stationsPerPage] = useState(50); // Ograniczenie do 50 stacji na stronę
  const [showCharts, setShowCharts] = useState(true); // Opcja wyłączenia wykresów

  useEffect(() => {
    fetchStations();
  }, []);

  useEffect(() => {
    filterStations();
  }, [stations, searchTerm, selectedVoivodeship, selectedRiver, selectedTrend]);

  const fetchStations = async () => {
    try {
      const response = await fetch('/api/stations');
      const data = await response.json();
      if (data.status === 'success' && data.stations) {
        setStations(data.stations);
      }
    } catch (error) {
      console.error('Error fetching stations:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterStations = () => {
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

    setFilteredStations(filtered);
  };

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

  // Paginacja
  const totalPages = Math.ceil(filteredStations.length / stationsPerPage);
  const startIndex = (currentPage - 1) * stationsPerPage;
  const endIndex = startIndex + stationsPerPage;
  const currentStations = filteredStations.slice(startIndex, endIndex);

  // Reset strony przy zmianie filtrów
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedVoivodeship, selectedRiver, selectedTrend]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Stacje hydrologiczne</h2>
          <p className="mt-2 text-gray-600">
            Pokazano {currentStations.length} z {filteredStations.length} stacji (łącznie: {stations.length})
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {/* Chart controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowCharts(!showCharts)}
              className={`px-3 py-2 text-sm rounded-md transition-colors ${
                showCharts 
                  ? 'bg-green-50 text-green-700 hover:bg-green-100' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              {showCharts ? '📊 Ukryj wykresy' : '📊 Pokaż wykresy'}
            </button>
            
            {showCharts && (
              <div className="flex items-center space-x-2 bg-gray-50 rounded-lg p-1">
                <button
                  onClick={() => setChartDays(3)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    chartDays === 3 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  3 dni
                </button>
                <button
                  onClick={() => setChartDays(7)}
                  className={`px-3 py-1 text-sm rounded-md transition-colors ${
                    chartDays === 7 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  7 dni
                </button>
              </div>
            )}
          </div>
          
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
            <TrendingUp className="h-5 w-5 text-red-600" />
            <div>
              <p className="text-sm text-gray-600">Poziom rośnie</p>
              <p className="text-xl font-bold text-red-600">{trendStats.rising}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3">
            <TrendingDown className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm text-gray-600">Poziom spada</p>
              <p className="text-xl font-bold text-green-600">{trendStats.falling}</p>
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
        {currentStations.map((station) => (
          <StationCard 
            key={station.id_stacji} 
            station={station} 
            onEdit={handleEditStation}
            chartDays={chartDays}
            showChart={showCharts}
          />
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Poprzednia
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Następna
            </button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Pokazano <span className="font-medium">{startIndex + 1}</span> do{' '}
                <span className="font-medium">{Math.min(endIndex, filteredStations.length)}</span> z{' '}
                <span className="font-medium">{filteredStations.length}</span> stacji
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Poprzednia</span>
                  ←
                </button>
                
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        currentPage === pageNum
                          ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="sr-only">Następna</span>
                  →
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}

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