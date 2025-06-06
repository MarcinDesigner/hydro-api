import { useQueryClient } from '@tanstack/react-query';

export const useCacheManager = () => {
  const queryClient = useQueryClient();
  
  const refreshStationsData = () => {
    console.log('🔄 Wymuszam odświeżenie danych stacji');
    queryClient.invalidateQueries({ queryKey: ['stations', 'imgw', 'hydro'] });
  };
  
  const clearAllCache = () => {
    console.log('🗑️ Czyszczę cały cache');
    queryClient.clear();
  };
  
  const getCacheStatus = () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    const stationsQuery = queries.find(q => 
      JSON.stringify(q.queryKey) === JSON.stringify(['stations', 'imgw', 'hydro'])
    );
    
    return {
      totalQueries: queries.length,
      stationsQuery,
      stationsData: stationsQuery?.state.data,
      stationsStatus: stationsQuery?.state.status,
      lastUpdated: stationsQuery?.state.dataUpdatedAt
    };
  };
  
  return {
    refreshStationsData,
    clearAllCache,
    getCacheStatus
  };
}; 