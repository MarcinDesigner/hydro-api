import { NextRequest, NextResponse } from 'next/server';

// In-memory cache
let cachedData: any = null;
let cacheTime: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minut

export async function GET(request: NextRequest) {
  const now = Date.now();
  
  // Sprawdź czy cache jest aktualny
  if (cachedData && cacheTime && (now - cacheTime) < CACHE_DURATION) {
    console.log('🎯 Zwracam dane z server cache');
    
    const response = NextResponse.json({
      data: cachedData,
      cached: true,
      cacheAge: Math.floor((now - cacheTime) / 1000),
      timestamp: new Date().toISOString()
    });
    
    response.headers.set('X-Cache-Status', 'HIT');
    return response;
  }
  
  try {
    console.log('🌐 Pobieram świeże dane z IMGW API');
    
    // Pobierz dane hydrologiczne z IMGW
    const response = await fetch('https://danepubliczne.imgw.pl/api/data/hydro', {
      headers: {
        'User-Agent': 'NextJS-HydroAPI/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Zapisz do cache
    cachedData = data;
    cacheTime = now;
    
    console.log(`✅ Pobrano ${data.length} stacji z IMGW API`);
    
    const nextResponse = NextResponse.json({
      data: data,
      cached: false,
      fetchTime: new Date().toISOString(),
      count: data.length,
      timestamp: new Date().toISOString()
    });
    
    // Ustaw HTTP headers dla browser cache
    nextResponse.headers.set('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
    nextResponse.headers.set('X-Cache-Status', 'MISS');
    
    return nextResponse;
    
  } catch (error) {
    console.error('❌ Błąd podczas pobierania danych:', error);
    
    // Jeśli API nie działa, zwróć cache'owane dane jeśli istnieją
    if (cachedData) {
      console.log('⚠️ API niedostępne, zwracam stale dane z cache');
      
      const response = NextResponse.json({
        data: cachedData,
        cached: true,
        error: 'API temporarily unavailable, serving cached data',
        cacheAge: Math.floor((now - (cacheTime || 0)) / 1000),
        timestamp: new Date().toISOString()
      });
      
      response.headers.set('X-Cache-Status', 'STALE');
      return response;
    }
    
    return NextResponse.json({ 
      error: 'Failed to fetch data and no cached data available',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 