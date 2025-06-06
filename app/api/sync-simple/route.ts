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

    console.log('🔄 Starting simple sync (max 10 stations)...');
    
    // Pobierz tylko pierwsze 10 stacji
    const smartStations = await SmartDataService.getSmartStationsData();
    const limitedStations = smartStations.slice(0, 10);
    console.log(`📊 Processing ${limitedStations.length} stations (limited from ${smartStations.length})`);
    
    let syncedStations = 0;
    let syncedMeasurements = 0;
    let errors = 0;
    
    // Synchronizuj każdą stację z bazą danych
    for (const station of limitedStations) {
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
          console.log(`✅ Created new station: ${station.id}`);
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
    
    console.log(`✅ Simple sync completed: ${syncedStations} new stations, ${syncedMeasurements} measurements, ${errors} errors`);
    
    return NextResponse.json({
      status: 'success',
      message: `Simple sync completed (limited to 10 stations)`,
      stats: {
        total_available: smartStations.length,
        processed_stations: limitedStations.length,
        synced_stations: syncedStations,
        synced_measurements: syncedMeasurements,
        errors: errors
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Simple sync error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Simple synchronization failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Simple sync endpoint is working. Use POST to trigger limited synchronization (10 stations).',
    timestamp: new Date().toISOString()
  });
} 