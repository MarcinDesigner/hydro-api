'use client';

import { useState, useEffect } from 'react';

export default function SimpleCacheTest() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🚀 SimpleCacheTest useEffect triggered');
    
    const fetchData = async () => {
      try {
        console.log('📡 Fetching cache stats...');
        const response = await fetch('/api/cache?action=stats');
        console.log('📊 Response:', response.status, response.statusText);
        
        const result = await response.json();
        console.log('✅ Data received:', result);
        
        setData(result);
        setLoading(false);
      } catch (err) {
        console.error('❌ Error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Simple Cache Test</h1>
        <p>Loading... (check console for logs)</p>
        <p>Loading state: {loading.toString()}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>Simple Cache Test</h1>
        <p style={{ color: 'red' }}>Error: {error}</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Simple Cache Test</h1>
      <h2>Raw API Response:</h2>
      <pre style={{ background: '#f5f5f5', padding: '10px', overflow: 'auto' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
      
      {data?.data && (
        <div>
          <h2>Cache Stats:</h2>
          <ul>
            <li>Total Entries: {data.data.totalEntries}</li>
            <li>Cache Hits: {data.data.cacheHits}</li>
            <li>Cache Misses: {data.data.cacheMisses}</li>
            <li>Cache Size: {data.data.cacheSize}</li>
            <li>Last Update: {data.data.lastUpdate}</li>
          </ul>
        </div>
      )}
    </div>
  );
} 