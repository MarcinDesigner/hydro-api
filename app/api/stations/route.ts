// app/api/stations/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { SmartDataService } from '@/lib/smart-data-service';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    // Pobierz parametry z URL
    const { searchParams } = new URL(request.url);
    const voivodeship = searchParams.get('voivodeship');
    const river = searchParams.get('river');
    const limit = searchParams.get('limit');
    const freshOnly = searchParams.get('fresh') === 'true';

    // Pobierz inteligentne dane ze wszystkich stacji (najświeższe z obu endpointów)
    let allStations = await SmartDataService.getSmartStationsData();

    // Pobierz dane z bazy danych dla wszystkich stacji
    let dbStationsMap = new Map();
    try {
      const dbStations = await prisma.station.findMany({
        select: {
          stationCode: true,
          riverName: true,
          warningLevel: true,
          alarmLevel: true,
        }
      });

      // Utwórz mapę dla szybkiego dostępu do danych z bazy
      dbStationsMap = new Map(
        dbStations.map(station => [station.stationCode, station])
      );
    } catch (dbError) {
      console.warn('Database connection failed, using API data only:', dbError);
      // Kontynuuj bez danych z bazy
    }

    // Filtrowanie po świeżości danych
    if (freshOnly) {
      allStations = allStations.filter(station => station.dataFreshness === 'fresh');
    }

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

    // Przekształć dane do standardowego formatu z dodatkowymi informacjami o świeżości
    const formattedStations = allStations.map(station => {
      const dbStation = dbStationsMap.get(station.id);
      
      return {
        id_stacji: station.id,
        stacja: station.name,
        rzeka: dbStation?.riverName || station.river, // Priorytet dla danych z bazy
        województwo: station.voivodeship,
        stan_wody: station.waterLevel?.toString() || null,
        stan_wody_data_pomiaru: station.waterLevelDate,
        przelyw: station.flow?.toString() || null,
        przelyw_data_pomiaru: station.flowDate,
        // Współrzędne z cache lub hydro2
        longitude: station.longitude,
        latitude: station.latitude,
        coordinates_source: station.coordinatesSource,
        // Poziomy alarmowe - priorytet dla danych z bazy
        poziom_ostrzegawczy: dbStation?.warningLevel?.toString() || station.warningLevel,
        poziom_alarmowy: dbStation?.alarmLevel?.toString() || station.alarmLevel,
        status_alarmowy: station.alarmStatus,
        komunikat_alarmowy: station.alarmMessage,
        // Informacje o świeżości danych
        source: station.source,
        data_freshness: station.dataFreshness,
        hours_old: station.hoursOld,
        is_fresh: station.dataFreshness === 'fresh',
        trend: 'stable' as const,  // Wymagałoby porównania z poprzednimi danymi
        zmiana_poziomu: '0'        // Wymagałoby porównania z poprzednimi danymi
      };
    });

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