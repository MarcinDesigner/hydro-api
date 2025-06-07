// app/api/sync-smart/route.ts
// Nowy endpoint który synchronizuje dane ze wszystkich źródeł

import { NextRequest, NextResponse } from 'next/server';
import { SmartDataService } from '@/lib/smart-data-service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Sprawdź autoryzację (opcjonalnie)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    // Dla środowiska developerskiego możemy pominąć autoryzację
    const isDev = process.env.NODE_ENV === 'development' || 
                  request.headers.get('x-dev-mode') === 'true';
    
    if (!isDev && expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    console.log('🔄 Starting SMART synchronization (all sources)...');
    const startTime = Date.now();
    
    // Pobierz dane ze SmartDataService - automatycznie łączy hydro i hydro2
    const smartStations = await SmartDataService.getSmartStationsData();
    console.log(`📊 Smart Data Service returned ${smartStations.length} stations`);
    
    // Pobierz statystyki
    const stats = await SmartDataService.getSmartDataStats();
    console.log('📈 Data sources breakdown:');
    console.log(`   - From hydro: ${stats?.fromHydro || 0}`);
    console.log(`   - From hydro2: ${stats?.fromHydro2 || 0}`);
    console.log(`   - Fresh data: ${stats?.freshData || 0}`);
    console.log(`   - Stale data: ${stats?.staleData || 0}`);
    
    let syncedStations = 0;
    let updatedStations = 0;
    let syncedMeasurements = 0;
    let errors = 0;
    const processedStations = new Set<string>();
    
    // Synchronizuj każdą stację
    for (const station of smartStations) {
      try {
        // Sprawdź czy już przetworzyliśmy tę stację
        if (processedStations.has(station.id)) {
          console.log(`⚠️ Skipping duplicate station ${station.id}`);
          continue;
        }
        processedStations.add(station.id);
        
        // Sprawdź czy stacja istnieje w bazie
        let dbStation = await prisma.station.findFirst({
          where: { stationCode: station.id }
        });
        
        // Jeśli nie istnieje, utwórz nową
        if (!dbStation) {
          dbStation = await prisma.station.create({
            data: {
              stationCode: station.id,
              stationName: station.name || `Station ${station.id}`,
              riverName: station.river || null,
              voivodeship: station.voivodeship || null,
              latitude: station.latitude && typeof station.latitude === 'number' ? station.latitude : null,
              longitude: station.longitude && typeof station.longitude === 'number' ? station.longitude : null,
              warningLevel: typeof station.warningLevel === 'number' ? station.warningLevel : null,
              alarmLevel: typeof station.alarmLevel === 'number' ? station.alarmLevel : null,
            }
          });
          syncedStations++;
          console.log(`✅ Created station: ${station.id} (${station.name}) from ${station.source}`);
        } else {
          // Aktualizuj istniejącą stację
          const updates: any = {};
          let hasUpdates = false;
          
          // Aktualizuj tylko jeśli mamy nowsze/lepsze dane
          if (station.name && station.name !== dbStation.stationName) {
            updates.stationName = station.name;
            hasUpdates = true;
          }
          
          // Nie nadpisuj danych użytkownika
          if (!dbStation.riverName && station.river) {
            updates.riverName = station.river;
            hasUpdates = true;
          }
          
          if (station.voivodeship && station.voivodeship !== dbStation.voivodeship) {
            updates.voivodeship = station.voivodeship;
            hasUpdates = true;
          }
          
          // Aktualizuj współrzędne jeśli są lepsze
          if (station.latitude && typeof station.latitude === 'number' && !dbStation.latitude) {
            updates.latitude = station.latitude;
            hasUpdates = true;
          }
          
          if (station.longitude && typeof station.longitude === 'number' && !dbStation.longitude) {
            updates.longitude = station.longitude;
            hasUpdates = true;
          }
          
          // Aktualizuj poziomy alarmowe jeśli nie były ustawione
          if (!dbStation.warningLevel && typeof station.warningLevel === 'number') {
            updates.warningLevel = station.warningLevel;
            hasUpdates = true;
          }
          
          if (!dbStation.alarmLevel && typeof station.alarmLevel === 'number') {
            updates.alarmLevel = station.alarmLevel;
            hasUpdates = true;
          }
          
          if (hasUpdates) {
            await prisma.station.update({
              where: { id: dbStation.id },
              data: updates
            });
            updatedStations++;
          }
        }
        
        // Dodaj pomiar jeśli mamy dane o poziomie wody
        if (station.waterLevel !== null && station.waterLevelDate) {
          const measurementDate = new Date(station.waterLevelDate);
          
          // Sprawdź czy pomiar już istnieje
          const existingMeasurement = await prisma.measurement.findFirst({
            where: {
              stationId: dbStation.id,
              measurementTimestamp: measurementDate,
              source: station.source
            }
          });
          
          if (!existingMeasurement) {
            await prisma.measurement.create({
              data: {
                stationId: dbStation.id,
                measurementTimestamp: measurementDate,
                waterLevel: station.waterLevel,
                flowRate: station.flow || null,
                temperature: null,
                source: station.source
              }
            });
            syncedMeasurements++;
          }
        }
        
      } catch (stationError) {
        console.error(`❌ Error syncing station ${station.id}:`, stationError);
        errors++;
      }
    }
    
    const totalTime = Date.now() - startTime;
    
    console.log(`✅ Smart sync completed in ${totalTime}ms`);
    console.log(`   - Processed: ${processedStations.size} unique stations`);
    console.log(`   - New stations: ${syncedStations}`);
    console.log(`   - Updated stations: ${updatedStations}`);
    console.log(`   - New measurements: ${syncedMeasurements}`);
    console.log(`   - Errors: ${errors}`);
    
    return NextResponse.json({
      status: 'success',
      message: `Smart synchronization completed - processed ${processedStations.size} unique stations from both APIs`,
      stats: {
        total_stations: processedStations.size,
        new_stations: syncedStations,
        updated_stations: updatedStations,
        synced_measurements: syncedMeasurements,
        errors: errors,
        data_sources: {
          from_hydro: stats?.fromHydro || 0,
          from_hydro2: stats?.fromHydro2 || 0,
          fresh_data: stats?.freshData || 0,
          stale_data: stats?.staleData || 0,
          with_coordinates: stats?.withCoordinates || 0
        }
      },
      performance: {
        total_time_ms: totalTime,
        avg_time_per_station_ms: Math.round(totalTime / processedStations.size)
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Smart sync error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Smart synchronization failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const stats = await SmartDataService.getSmartDataStats();
    
    return NextResponse.json({
      message: 'Smart sync endpoint - synchronizes data from BOTH hydro and hydro2 APIs',
      description: 'Uses SmartDataService to get the freshest data from both sources',
      current_stats: {
        total_stations: stats?.totalStations || 0,
        from_hydro: stats?.fromHydro || 0,
        from_hydro2: stats?.fromHydro2 || 0,
        fresh_data: stats?.freshData || 0,
        with_coordinates: stats?.withCoordinates || 0
      },
      usage: 'POST to this endpoint to trigger synchronization',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      message: 'Smart sync endpoint info',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
} 