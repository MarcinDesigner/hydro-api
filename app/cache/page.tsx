'use client';

import { useStationsData } from '@/hooks/useStationsData';
import { useCacheManager } from '@/hooks/useCacheManager';

export default function CachePage() {
  const { data: result, isLoading, error, isFetching, dataUpdatedAt } = useStationsData();
  const { refreshStationsData, clearAllCache, getCacheStatus } = useCacheManager();
  
  const stations = result?.data || [];
  const isCached = result?.cached || false;
  const cacheStatus = getCacheStatus();

  if (isLoading) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Zarządzanie Cache IMGW</h1>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          height: '200px',
          flexDirection: 'column'
        }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #3498db',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p style={{ marginTop: '10px' }}>Ładowanie danych z IMGW API...</p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
        <h1>Zarządzanie Cache IMGW</h1>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#fee', 
          border: '1px solid #fcc',
          borderRadius: '4px',
          color: '#c33'
        }}>
          <strong>Błąd:</strong> {error instanceof Error ? error.message : 'Unknown error'}
        </div>
        <button 
          onClick={refreshStationsData}
          style={{
            marginTop: '10px',
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Spróbuj ponownie
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Zarządzanie Cache IMGW (React Query)</h1>
      <p style={{ color: '#666', marginBottom: '20px' }}>
        Monitorowanie i zarządzanie buforem danych z API IMGW używając React Query
      </p>

      {/* Status cache */}
      <div style={{ 
        marginBottom: '20px',
        padding: '15px',
        backgroundColor: isCached ? '#d4edda' : '#d1ecf1',
        border: `1px solid ${isCached ? '#c3e6cb' : '#bee5eb'}`,
        borderRadius: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{ 
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            backgroundColor: isCached ? '#28a745' : '#007bff',
            color: 'white'
          }}>
            {isCached ? '📋 Dane z cache' : '🆕 Świeże dane'}
          </span>
          <span style={{ fontSize: '14px' }}>
            Ostatnia aktualizacja: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('pl-PL') : 'Brak danych'}
          </span>
          {isFetching && (
            <span style={{ color: '#ffc107', fontSize: '12px' }}>
              🔄 Odświeżanie...
            </span>
          )}
        </div>
      </div>

      {/* Przyciski akcji */}
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={refreshStationsData}
          disabled={isFetching}
          style={{
            marginRight: '10px',
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            opacity: isFetching ? 0.6 : 1
          }}
        >
          🔄 Odśwież dane
        </button>
        <button 
          onClick={clearAllCache}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          🗑️ Wyczyść cache
        </button>
      </div>

      {/* Statystyki główne */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '20px'
      }}>
        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6',
          borderRadius: '4px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>Stacje IMGW</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
            {stations.length}
          </div>
        </div>

        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6',
          borderRadius: '4px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>Zapytania w cache</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#28a745' }}>
            {cacheStatus.totalQueries}
          </div>
        </div>

        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6',
          borderRadius: '4px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>Status cache</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#6f42c1' }}>
            {cacheStatus.stationsStatus || 'idle'}
          </div>
        </div>

        <div style={{ 
          padding: '15px', 
          backgroundColor: '#f8f9fa', 
          border: '1px solid #dee2e6',
          borderRadius: '4px'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#666' }}>Wiek cache</h3>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffc107' }}>
            {result?.cacheAge ? `${result.cacheAge}s` : 'Świeże'}
          </div>
        </div>
      </div>

      {/* Szczegóły */}
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#f8f9fa', 
        border: '1px solid #dee2e6',
        borderRadius: '4px'
      }}>
        <h3 style={{ margin: '0 0 15px 0' }}>Szczegóły Cache (React Query)</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <strong>Źródło danych:</strong><br />
            {isCached ? 'Server cache' : 'IMGW API'}
          </div>
          <div>
            <strong>Ostatnie pobranie:</strong><br />
            {result?.fetchTime ? new Date(result.fetchTime).toLocaleString('pl-PL') : 'Brak danych'}
          </div>
          <div>
            <strong>Auto-refresh:</strong><br />
            Co 10 minut
          </div>
          <div>
            <strong>Stale time:</strong><br />
            5 minut
          </div>
        </div>
      </div>

      {/* Przykładowe dane */}
      {stations.length > 0 && (
        <div style={{ 
          marginTop: '20px',
          padding: '15px', 
          backgroundColor: '#e7f3ff', 
          border: '1px solid #b3d9ff',
          borderRadius: '4px'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>Przykładowe dane (pierwsze 3 stacje)</h3>
          <div style={{ fontSize: '14px' }}>
            {stations.slice(0, 3).map((station, index) => (
              <div key={index} style={{ marginBottom: '5px' }}>
                <strong>{station.stacja}</strong> - {station.rzeka} - Stan: {station.stan_wody}cm
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Debug info */}
      <details style={{ marginTop: '20px' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>🔍 Debug Info</summary>
        <pre style={{ 
          background: '#f5f5f5', 
          padding: '10px', 
          overflow: 'auto',
          fontSize: '12px',
          marginTop: '10px'
        }}>
          {JSON.stringify({
            isLoading,
            isFetching,
                         error: error ? String(error) : null,
            dataUpdatedAt,
            cacheStatus,
            resultMeta: {
              cached: result?.cached,
              cacheAge: result?.cacheAge,
              count: result?.count,
              timestamp: result?.timestamp
            }
          }, null, 2)}
        </pre>
      </details>
    </div>
  );
} 