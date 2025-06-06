'use client';

import { useQuery } from '@tanstack/react-query';

interface StationData {
  id_stacji: string;
  stacja: string;
  rzeka: string;
  wojewodztwo: string;
  stan_wody: number;
  stan_wody_data_pomiaru: string;
  temperatura_wody: number;
  temperatura_wody_data_pomiaru: string;
  zjawisko_lodowe: string;
  zjawisko_lodowe_data_pomiaru: string;
}

interface QualityStats {
  total: number;
  water_level_from_hydro: number;
  water_level_from_hydro2: number;
  flow_from_hydro: number;
  flow_from_hydro2: number;
  mixed_sources: number;
  hydro2_preferred: number;
  with_coordinates: number;
}

interface StationsResponse {
  data: StationData[];
  cached: boolean;
  cacheAge?: number;
  fetchTime?: string;
  error?: string;
  qualityStats?: QualityStats;
  stats?: {
    total: number;
    hydroOnly: number;
    hydro2Only: number;
    combined: number;
  };
}

export const useStationsData = () => {
  return useQuery({
    queryKey: ['stations', 'imgw', 'cache'],
    queryFn: async () => {
      // Dodaj timestamp żeby wymusić odświeżenie cache
      const response = await fetch(`/api/imgw-stations?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch stations data');
      }
      return response.json();
    },
    staleTime: 0, // Wymuś odświeżenie
    gcTime: 1000, // Krótki czas cache
    refetchInterval: 60 * 60 * 1000, // Auto-refresh co 1 godzinę
    refetchOnWindowFocus: false,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
};

// Hook do wymuszenia odświeżenia danych
export const useRefreshStations = () => {
  const { refetch } = useStationsData();
  return refetch;
};

// Hook do pobierania danych dla mapy (z progami alarmowymi)
export const useMapStationsData = () => {
  return useQuery({
    queryKey: ['stations', 'map', 'smart'],
    queryFn: async () => {
      // Dodaj timestamp żeby wymusić odświeżenie cache
      const response = await fetch(`/api/stations/map?t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch map stations data');
      }
      return response.json();
    },
    staleTime: 0, // Zawsze traktuj jako stale
    gcTime: 1000, // Krótki czas cache
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    enabled: true, // Wymuś włączenie query
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}; 