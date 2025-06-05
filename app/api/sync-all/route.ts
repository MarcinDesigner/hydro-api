import { NextRequest, NextResponse } from 'next/server';
import { SmartDataService } from '@/lib/smart-data-service';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    // Sprawdź autoryzację
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    console.log('🔄 Starting FULL synchronization of ALL stations...');
    const startTime = Date.now();
    
    // Pobierz wszystkie stacje
    const smartStations = await SmartDataService.getSmartStationsData();
    console.log(`📊 Total stations available: ${smartStations.length}`);
    
    let syncedStations = 0;
    let updatedStations = 0;
    let syncedMeasurements = 0;
    let errors = 0;
    
    // Synchronizuj WSZYSTKIE stacje
    for (const station of smartStations) {
      try {
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
              latitude: station.latitude || null,
              longitude: station.longitude || null,
              warningLevel: typeof station.warningLevel === 'number' ? station.warningLevel : null,
              alarmLevel: typeof station.alarmLevel === 'number' ? station.alarmLevel : null,
            }
          });
          syncedStations++;
        } else {
          // Aktualizuj istniejącą stację (zachowaj edycje użytkownika)
          await prisma.station.update({
            where: { id: dbStation.id },
            data: {
              stationName: station.name || dbStation.stationName,
              riverName: dbStation.riverName || station.river,
              voivodeship: station.voivodeship || dbStation.voivodeship,
              latitude: station.latitude || dbStation.latitude,
              longitude: station.longitude || dbStation.longitude,
              warningLevel: dbStation.warningLevel || (typeof station.warningLevel === 'number' ? station.warningLevel : null),
              alarmLevel: dbStation.alarmLevel || (typeof station.alarmLevel === 'number' ? station.alarmLevel : null),
            }
          });
          updatedStations++;
        }
        
        // Dodaj pomiar jeśli mamy dane o poziomie wody
        if (station.waterLevel && station.waterLevelDate) {
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
                flowRate: station.flow,
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
    
    console.log(`✅ FULL sync completed in ${totalTime}ms: ${syncedStations} new, ${updatedStations} updated, ${syncedMeasurements} measurements, ${errors} errors`);
    
    return NextResponse.json({
      status: 'success',
      message: `Full synchronization completed - ALL ${smartStations.length} stations processed`,
      stats: {
        total_stations: smartStations.length,
        new_stations: syncedStations,
        updated_stations: updatedStations,
        synced_measurements: syncedMeasurements,
        errors: errors,
        success_rate: Math.round(((smartStations.length - errors) / smartStations.length) * 100)
      },
      performance: {
        total_time_ms: totalTime,
        avg_time_per_station_ms: Math.round(totalTime / smartStations.length),
        stations_per_second: Math.round(smartStations.length / (totalTime / 1000))
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Full sync error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Full synchronization failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Full sync endpoint - synchronizes ALL stations at once. Use POST to trigger.',
    info: {
      description: 'Processes all 866+ stations in a single request',
      recommended_frequency: 'Every hour: 0 * * * *',
      estimated_time: '2-5 seconds',
      advantages: ['Simple setup', 'All data fresh', 'No complex batching']
    },
    timestamp: new Date().toISOString()
  });
} 