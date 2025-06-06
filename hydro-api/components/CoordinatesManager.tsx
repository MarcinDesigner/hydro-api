'use client';

import React, { useState, useEffect } from 'react';
import { AlertCircle, MapPin, RefreshCw, Database, CheckCircle } from 'lucide-react';

interface CoordinatesStats {
  totalCoordinatesInCache: number;
  totalActiveStations: number;
  stationsWithCoordinates: number;
  stationsFromCache: number;
  stationsFromHydro2: number;
  stationsWithoutCoordinates: number;
  coveragePercentage: number;
}

const CoordinatesManager = () => {
  const [stats, setStats] = useState<CoordinatesStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Pobierz statystyki cache
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/coordinates/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Inicjalizuj cache współrzędnych
  const initializeCache = async () => {
    setLoading(true);
    setMessage('Inicjalizuję cache współrzędnych...');
    
    try {
      const response = await fetch('/api/coordinates/initialize', {
        method: 'POST'
      });
      
      if (response.ok) {
        setMessage('Cache współrzędnych został zainicjalizowany!');
        setInitialized(true);
        await fetchStats();
      } else {
        setMessage('Błąd podczas inicjalizacji cache');
      }
    } catch (error) {
      setMessage('Błąd podczas inicjalizacji cache');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Odśwież cache współrzędnych
  const refreshCache = async () => {
    setLoading(true);
    setMessage('Odświeżam cache współrzędnych z hydro2...');
    
    try {
      const response = await fetch('/api/coordinates/refresh', {
        method: 'POST'
      });
      
      if (response.ok) {
        setMessage('Cache współrzędnych został odświeżony!');
        await fetchStats();
      } else {
        setMessage('Błąd podczas odświeżania cache');
      }
    } catch (error) {
      setMessage('Błąd podczas odświeżania cache');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <MapPin className="text-blue-600" />
          Zarządzanie Współrzędnymi Stacji
        </h2>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-blue-600 mt-1 flex-shrink-0" size={20} />
            <div>
              <h3 className="font-semibold text-blue-900">Jak to działa?</h3>
              <p className="text-blue-800 mt-1">
                System pobiera współrzędne stacji z API hydro2 i zapisuje je w cache. 
                Następnie używa tych współrzędnych zawsze, niezależnie od tego, z którego 
                API pobierane są dane pomiarowe (hydro lub hydro2).
              </p>
            </div>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Stacje w cache</p>
                  <p className="text-2xl font-bold text-green-800">{stats.totalCoordinatesInCache}</p>
                </div>
                <Database className="text-green-600" size={24} />
              </div>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600">Aktywne stacje</p>
                  <p className="text-2xl font-bold text-blue-800">{stats.totalActiveStations}</p>
                </div>
                <MapPin className="text-blue-600" size={24} />
              </div>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Z współrzędnymi</p>
                  <p className="text-2xl font-bold text-purple-800">{stats.stationsWithCoordinates}</p>
                </div>
                <CheckCircle className="text-purple-600" size={24} />
              </div>
            </div>
            
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">Pokrycie</p>
                  <p className="text-2xl font-bold text-orange-800">{stats.coveragePercentage}%</p>
                </div>
                <div className="text-orange-600 font-bold">%</div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={initializeCache}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              <Database size={20} />
            )}
            Inicjalizuj Cache
          </button>
          
          <button
            onClick={refreshCache}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={20} />
            ) : (
              <RefreshCw size={20} />
            )}
            Odśwież Cache
          </button>
        </div>

        {message && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-gray-800">{message}</p>
          </div>
        )}

        {stats && (
          <div className="mt-6 space-y-3">
            <h3 className="font-semibold text-gray-900">Szczegóły:</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium">Z cache: {stats.stationsFromCache}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium">Z hydro2: {stats.stationsFromHydro2}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium">Bez współrzędnych: {stats.stationsWithoutCoordinates}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoordinatesManager; 