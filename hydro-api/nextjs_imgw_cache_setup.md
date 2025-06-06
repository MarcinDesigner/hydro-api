# Complete IMGW Data Caching Setup for Next.js

## 1. Install Dependencies

```bash
npm install @tanstack/react-query
```

## 2. Setup Query Client Provider

Create or update `pages/_app.js`:

```javascript
// pages/_app.js
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export default function App({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minut - dane są "świeże"
        cacheTime: 15 * 60 * 1000, // 15 minut - dane w cache
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: true,
        retry: 3,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <Component {...pageProps} />
      {/* Devtools tylko w development */}
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
    </QueryClientProvider>
  );
}
```

## 3. Create API Route with Server-Side Caching

Create `pages/api/imgw-stations.js`:

```javascript
// pages/api/imgw-stations.js

// In-memory cache
let cachedData = null;
let cacheTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minut

export default async function handler(req, res) {
  const now = Date.now();
  
  // Sprawdź czy cache jest aktualny
  if (cachedData && cacheTime && (now - cacheTime) < CACHE_DURATION) {
    console.log('🎯 Zwracam dane z server cache');
    return res.status(200).json({
      data: cachedData,
      cached: true,
      cacheAge: Math.floor((now - cacheTime) / 1000)
    });
  }
  
  try {
    console.log('🌐 Pobieram świeże dane z IMGW API');
    
    // Pobierz dane hydrologiczne z IMGW
    const response = await fetch('https://danepubliczne.imgw.pl/api/data/hydro', {
      headers: {
        'User-Agent': 'NextJS-App/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Zapisz do cache
    cachedData = data;
    cacheTime = now;
    
    // Ustaw HTTP headers dla browser cache
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    res.setHeader('X-Cache-Status', 'MISS');
    
    res.status(200).json({
      data: data,
      cached: false,
      fetchTime: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Błąd podczas pobierania danych:', error);
    
    // Jeśli API nie działa, zwróć cache'owane dane jeśli istnieją
    if (cachedData) {
      console.log('⚠️ API niedostępne, zwracam stare dane z cache');
      res.setHeader('X-Cache-Status', 'STALE');
      return res.status(200).json({
        data: cachedData,
        cached: true,
        error: 'API temporarily unavailable, serving cached data',
        cacheAge: Math.floor((now - cacheTime) / 1000)
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch data and no cached data available',
      message: error.message 
    });
  }
}
```

## 4. Create Custom Hook for IMGW Data

Create `hooks/useStationsData.js`:

```javascript
// hooks/useStationsData.js
import { useQuery } from '@tanstack/react-query';

export const useStationsData = (options = {}) => {
  return useQuery({
    queryKey: ['stations', 'imgw', 'hydro'],
    queryFn: async () => {
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
    cacheTime: 15 * 60 * 1000, // 15 minut - dane w cache
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
```

## 5. Create Utility Hook for Cache Management

Create `hooks/useCacheManager.js`:

```javascript
// hooks/useCacheManager.js
import { useQueryClient } from '@tanstack/react-query';

export const useCacheManager = () => {
  const queryClient = useQueryClient();
  
  const refreshStationsData = () => {
    console.log('🔄 Wymuszam odświeżenie danych stacji');
    queryClient.invalidateQueries(['stations', 'imgw', 'hydro']);
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
      stationsQuery: queries.find(q => 
        JSON.stringify(q.queryKey) === JSON.stringify(['stations', 'imgw', 'hydro'])
      )
    };
  };
  
  return {
    refreshStationsData,
    clearAllCache,
    getCacheStatus
  };
};
```

## 6. Stations List Component

Create `components/StationsList.js`:

```javascript
// components/StationsList.js
import { useStationsData, useRefreshStations } from '../hooks/useStationsData';
import { useCacheManager } from '../hooks/useCacheManager';

export default function StationsList() {
  const { data: result, isLoading, error, isFetching, dataUpdatedAt } = useStationsData();
  const { refreshStationsData } = useCacheManager();
  
  const stations = result?.data || [];
  const isCached = result?.cached || false;
  
  if (isLoading) {
    return (
      <div className="loading">
        <p>🔄 Ładowanie danych stacji...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error">
        <p>❌ Błąd: {error.message}</p>
        <button onClick={refreshStationsData}>
          Spróbuj ponownie
        </button>
      </div>
    );
  }
  
  return (
    <div className="stations-list">
      <div className="header">
        <h2>Stacje hydrologiczne IMGW</h2>
        <div className="cache-info">
          <span className={`cache-status ${isCached ? 'cached' : 'fresh'}`}>
            {isCached ? '📋 Dane z cache' : '🆕 Świeże dane'}
          </span>
          <span className="update-time">
            Ostatnia aktualizacja: {new Date(dataUpdatedAt).toLocaleTimeString()}
          </span>
          {isFetching && <span className="fetching">🔄 Odświeżanie...</span>}
        </div>
        <button onClick={refreshStationsData} disabled={isFetching}>
          🔄 Odśwież dane
        </button>
      </div>
      
      <div className="stations-grid">
        {stations.map((station, index) => (
          <div key={station.id_stacji || index} className="station-card">
            <h3>{station.stacja}</h3>
            <p><strong>Rzeka:</strong> {station.rzeka}</p>
            <p><strong>Stan wody:</strong> {station.stan_wody} cm</p>
            <p><strong>Temperatura:</strong> {station.temperatura}°C</p>
            <p><strong>Data pomiaru:</strong> {station.data_pomiaru}</p>
          </div>
        ))}
      </div>
      
      <div className="summary">
        <p>Znaleziono {stations.length} stacji</p>
      </div>
    </div>
  );
}
```

## 7. Map Component Using Same Data

Create `components/Map.js`:

```javascript
// components/Map.js
import { useStationsData } from '../hooks/useStationsData';
import { useCacheManager } from '../hooks/useCacheManager';

export default function Map() {
  const { data: result, isLoading, error } = useStationsData();
  const { getCacheStatus } = useCacheManager();
  
  const stations = result?.data || [];
  const cacheStatus = getCacheStatus();
  
  if (isLoading) {
    return <div className="loading">🗺️ Ładowanie mapy...</div>;
  }
  
  if (error) {
    return <div className="error">❌ Błąd ładowania danych mapy</div>;
  }
  
  return (
    <div className="map-container">
      <div className="map-header">
        <h2>Mapa stacji hydrologicznych</h2>
        <div className="cache-debug">
          <p>📊 Dane z tego samego cache co lista stacji</p>
          <p>🎯 Stacji na mapie: {stations.length}</p>
          <p>💾 Zapytań w cache: {cacheStatus.totalQueries}</p>
        </div>
      </div>
      
      {/* Tutaj będzie Twoja mapa */}
      <div className="map-placeholder">
        <p>🗺️ Tutaj będzie mapa z {stations.length} stacjami</p>
        
        {/* Przykładowa lista stacji dla mapy */}
        <div className="map-stations-list">
          {stations.slice(0, 10).map((station, index) => (
            <div key={station.id_stacji || index} className="map-station-pin">
              📍 {station.stacja} - {station.stan_wody}cm
            </div>
          ))}
          {stations.length > 10 && (
            <p>... i {stations.length - 10} więcej stacji</p>
          )}
        </div>
      </div>
    </div>
  );
}
```

## 8. Next.js Configuration for Caching Headers

Update or create `next.config.js`:

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/api/imgw-stations',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

## 9. Example Pages

### Stations Page (`pages/stations.js`):

```javascript
// pages/stations.js
import StationsList from '../components/StationsList';

export default function StationsPage() {
  return (
    <div>
      <h1>Stacje hydrologiczne</h1>
      <StationsList />
    </div>
  );
}
```

### Map Page (`pages/map.js`):

```javascript
// pages/map.js
import Map from '../components/Map';

export default function MapPage() {
  return (
    <div>
      <h1>Mapa stacji</h1>
      <Map />
    </div>
  );
}
```

## 10. Basic Styling (Optional)

Create `styles/cache.css`:

```css
/* styles/cache.css */
.cache-status.cached {
  color: #28a745;
  background: #d4edda;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.cache-status.fresh {
  color: #007bff;
  background: #d1ecf1;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.fetching {
  color: #ffc107;
  font-size: 12px;
  margin-left: 8px;
}

.stations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin: 16px 0;
}

.station-card {
  border: 1px solid #ddd;
  padding: 16px;
  border-radius: 8px;
  background: #f9f9f9;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 8px;
}

.cache-info {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-wrap: wrap;
}

.loading, .error {
  text-align: center;
  padding: 20px;
  font-size: 16px;
}

.map-container {
  min-height: 400px;
}

.map-placeholder {
  border: 2px dashed #ccc;
  padding: 40px;
  text-align: center;
  background: #f5f5f5;
  border-radius: 8px;
}

.cache-debug {
  background: #e9ecef;
  padding: 8px;
  border-radius: 4px;
  font-size: 14px;
  margin: 8px 0;
}
```

## 11. Usage Instructions

1. **Install dependencies**: `npm install @tanstack/react-query`
2. **Copy all files** to your Next.js project
3. **Import CSS** in your `_app.js` if using the styling
4. **Navigate between pages** - dane będą się ładować tylko raz i cache'ować
5. **Check browser DevTools** - zobaczysz logi o cache'owaniu
6. **Use React Query DevTools** (w development) do monitorowania cache

## Key Features

✅ **Automatic caching** between components and pages  
✅ **Server-side cache** (5 min) + **Client-side cache** (15 min)  
✅ **Fallback mechanism** when IMGW API is down  
✅ **Background refresh** every 10 minutes  
✅ **Manual refresh** capability  
✅ **Cache status indicators**  
✅ **Error handling** with retry logic  
✅ **Development tools** for debugging  
✅ **HTTP headers** for browser caching  
✅ **Optimized performance** - no duplicate requests

## Cache Strategy Summary

- **Server cache**: 5 minut (API route level)
- **Client cache**: 15 minut (React Query)
- **Stale time**: 5 minut (data considered fresh)
- **Background refresh**: 10 minut (automatic updates)
- **Browser cache**: 5 minut via HTTP headers

This setup ensures your IMGW hydrology data loads instantly when switching between pages while staying reasonably up-to-date!