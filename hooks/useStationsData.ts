import { useQuery } from '@tanstack/react-query';

interface StationData {
  id_stacji: string;
  stacja: string;
  rzeka: string;
  wojewodztwo: string;
  stan_wody: string;
  stan_wody_data_pomiaru: string;
  temperatura: string;
  data_pomiaru: string;
}

interface StationsResponse {
  data: StationData[];
  cached: boolean;
  cacheAge?: number;
  fetchTime?: string;
  count: number;
  timestamp: string;
  error?: string;
}

export const useStationsData = (options = {}) => {
  return useQuery({
    queryKey: ['stations', 'imgw', 'hydro'],
    queryFn: async (): Promise<StationsResponse> => {
      console.log('🔄 Wykonuję zapytanie do API');
      const response = await fetch('/api/imgw-stations');
      
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`📊 Otrzymano ${result.data?.length || 0} stacji`, 
                  result.cached ? '(z cache)' : '(świeże dane)');
      
      return result;
    },
    staleTime: 5 * 60 * 1000, // 5 minut - dane są "świeże"
    gcTime: 15 * 60 * 1000, // 15 minut - dane w cache
    refetchInterval: 10 * 60 * 1000, // Auto-refresh co 10 minut
    refetchIntervalInBackground: false,
    ...options
  });
};

// Hook do wymuszenia odświeżenia danych
export const useRefreshStations = () => {
  const { refetch } = useStationsData({ enabled: false });
  return refetch;
}; 