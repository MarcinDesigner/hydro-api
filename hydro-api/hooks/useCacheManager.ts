'use client';

import { useQueryClient } from '@tanstack/react-query';

export const useCacheManager = () => {
  const queryClient = useQueryClient();
  
  const refreshStationsData = () => {
    console.log('🔄 Wymuszam odświeżenie danych stacji');
    // Odśwież oba cache - dla mapy i dla cache dashboard
    queryClient.invalidateQueries({ queryKey: ['stations', 'map', 'smart'] });
    queryClient.invalidateQueries({ queryKey: ['stations', 'imgw', 'cache'] });
  };
  
  const clearAllCache = () => {
    console.log('🗑️ Czyszczę cały cache');
    queryClient.clear();
  };
  
  const getCacheStatus = () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    return {
      totalQueries: queries.length,
      mapQuery: queries.find(q => 
        JSON.stringify(q.queryKey) === JSON.stringify(['stations', 'map', 'smart'])
      ),
      cacheQuery: queries.find(q => 
        JSON.stringify(q.queryKey) === JSON.stringify(['stations', 'imgw', 'cache'])
      )
    };
  };
  
  return {
    refreshStationsData,
    clearAllCache,
    getCacheStatus
  };
}; 