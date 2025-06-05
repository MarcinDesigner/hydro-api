import { NextRequest, NextResponse } from 'next/server';
import { SmartDataService } from '@/lib/smart-data-service';

export async function GET(request: NextRequest) {
  try {
    // Pobierz inteligentne statystyki z obu endpointów
    const smartStats = await SmartDataService.getSmartDataStats();
    
    if (!smartStats) {
      throw new Error('Failed to get smart data statistics');
    }
    
    // Pobierz dane stacji dla dodatkowych statystyk
    const allStations = await SmartDataService.getSmartStationsData();
    
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

    // Statystyki alarmowe z allStations (już zawarte w smartStats, ale dla pewności)
    const alarmStats = smartStats.alarmStats;

    return NextResponse.json({
      status: 'success',
      stats: {
        // Podstawowe statystyki z inteligentnego systemu
        total_stations: smartStats.totalStations,
        fresh_data_stations: smartStats.freshData,
        stale_data_stations: smartStats.staleData,
        from_hydro: smartStats.fromHydro,
        from_hydro2: smartStats.fromHydro2,
        with_coordinates: smartStats.withCoordinates,
        average_data_age: smartStats.averageDataAge,
        
        // Dodatkowe statystyki
        rivers_count: riversCount,
        top_rivers: topRivers,
        alarm_stats: alarmStats,
        
        // Informacje o świeżości danych
        data_freshness: {
          fresh_percentage: Math.round((smartStats.freshData / smartStats.totalStations) * 100),
          stale_percentage: Math.round((smartStats.staleData / smartStats.totalStations) * 100),
          coordinates_coverage: Math.round((smartStats.withCoordinates / smartStats.totalStations) * 100)
        }
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