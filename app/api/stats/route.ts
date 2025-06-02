// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';
import { IMGWService } from '@/lib/imgw-service';

export async function GET(request: NextRequest) {
  try {
    // Pobierz dane z API IMGW
    const allStations = await IMGWService.getAllStations();
    
    // Oblicz statystyki
    const totalStations = allStations.length;
    
    // Stacje aktywne (wszystkie z API IMGW są aktywne)
    const activeStations = allStations.filter(station => 
      station.waterLevelDate && 
      new Date(station.waterLevelDate) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;
    
    // Pomiary dzisiaj (wszystkie z dzisiejszą datą)
    const today = new Date().toISOString().split('T')[0];
    const measurementsToday = allStations.filter(station => 
      station.waterLevelDate.includes(today)
    ).length;
    
    // Unikalne rzeki
    const uniqueRivers = new Set(allStations.map(station => station.river).filter(Boolean));
    const riversCount = uniqueRivers.size;
    
    // Top rzeki (grupowanie po rzekach)
    const riverStats = new Map<string, number>();
    allStations.forEach(station => {
      if (station.river) {
        riverStats.set(station.river, (riverStats.get(station.river) || 0) + 1);
      }
    });
    
    const topRivers = Array.from(riverStats.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, stations]) => ({ name, stations }));

    // Dodaj informacje o aktualnym endpoincie
    const currentEndpoint = IMGWService.getCurrentEndpoint();
    const apiStats = await IMGWService.getAPIStats();

    return NextResponse.json({
      status: 'success',
      stats: {
        total_stations: totalStations,
        active_stations_24h: activeStations,
        measurements_today: measurementsToday,
        rivers_count: riversCount,
        top_rivers: topRivers,
        current_endpoint: currentEndpoint,
        api_stats: apiStats
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 