// app/api/stations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { IMGWService } from '@/lib/imgw-service';

export async function GET(request: NextRequest) {
  try {
    // Pobierz parametry z URL
    const { searchParams } = new URL(request.url);
    const voivodeship = searchParams.get('voivodeship');
    const river = searchParams.get('river');
    const limit = searchParams.get('limit');

    // Pobierz prawdziwe dane z API IMGW
    let allStations = await IMGWService.getAllStations();

    // Filtrowanie po województwie
    if (voivodeship) {
      allStations = allStations.filter(station => 
        station.voivodeship && station.voivodeship.toLowerCase().includes(voivodeship.toLowerCase())
      );
    }

    // Filtrowanie po rzece
    if (river) {
      allStations = allStations.filter(station => 
        station.river && station.river.toLowerCase().includes(river.toLowerCase())
      );
    }

    // Limit wyników
    if (limit) {
      const limitNum = parseInt(limit);
      if (limitNum > 0) {
        allStations = allStations.slice(0, limitNum);
      }
    }

    // Przekształć dane do standardowego formatu
    const formattedStations = allStations.map(station => ({
      id_stacji: station.id,
      stacja: station.name,
      rzeka: station.river,
      województwo: station.voivodeship,
      stan_wody: station.waterLevel?.toString() || null,
      stan_wody_data_pomiaru: station.waterLevelDate,
      przelyw: station.flow?.toString() || null,
      temperatura_wody: station.waterTemp?.toString() || null,
      source: station.source,
      longitude: station.longitude,
      latitude: station.latitude,
      poziom_ostrzegawczy: null, // Brak w API IMGW
      poziom_alarmowy: null,     // Brak w API IMGW
      trend: 'stable' as const,  // Wymagałoby porównania z poprzednimi danymi
      zmiana_poziomu: '0'        // Wymagałoby porównania z poprzednimi danymi
    }));

    return NextResponse.json({
      status: 'success',
      stations: formattedStations,
      count: formattedStations.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in stations API:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}