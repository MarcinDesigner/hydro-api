import { NextRequest, NextResponse } from 'next/server';
import { IMGWService } from '@/lib/imgw-service';
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

    console.log('🔄 Starting data synchronization...');
    
    // Pobierz inteligentne dane ze wszystkich stacji
    const smartStations = await SmartDataService.getSmartStationsData();
    console.log(`📊 Fetched ${smartStations.length} smart stations from IMGW API`);
    
    let syncedStations = 0;
    let syncedMeasurements = 0;
    let errors = 0;
    
    // Synchronizuj każdą stację z bazą danych
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
              // Dodaj poziomy alarmowe z API
              warningLevel: typeof station.warningLevel === 'number' ? station.warningLevel : null,
              alarmLevel: typeof station.alarmLevel === 'number' ? station.alarmLevel : null,
            }
          });
          syncedStations++;
          console.log(`✅ Created new station: ${station.id} (${station.name || 'unnamed'})`);
        } else {
          // Aktualizuj istniejącą stację (tylko jeśli nie ma custom danych)
          await prisma.station.update({
            where: { id: dbStation.id },
            data: {
              stationName: station.name,
              // Nie nadpisuj riverName jeśli użytkownik go edytował
              riverName: dbStation.riverName || station.river,
              voivodeship: station.voivodeship,
              latitude: station.latitude || dbStation.latitude,
              longitude: station.longitude || dbStation.longitude,
              // Aktualizuj poziomy alarmowe tylko jeśli nie były edytowane przez użytkownika
              warningLevel: dbStation.warningLevel || (typeof station.warningLevel === 'number' ? station.warningLevel : null),
              alarmLevel: dbStation.alarmLevel || (typeof station.alarmLevel === 'number' ? station.alarmLevel : null),
            }
          });
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
                 temperature: null, // Temperatura nie jest dostępna w SmartStationData
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
    
    console.log(`✅ Sync completed: ${syncedStations} new stations, ${syncedMeasurements} measurements, ${errors} errors`);
    console.log(`📊 Total stations processed: ${smartStations.length}`);
    
    return NextResponse.json({
      status: 'success',
      message: `Data synchronized successfully with database`,
      stats: {
        total_stations: smartStations.length,
        synced_stations: syncedStations,
        synced_measurements: syncedMeasurements,
        errors: errors
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Sync error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Synchronization failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Endpoint GET do testowania
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Sync endpoint is working. Use POST to trigger synchronization.',
    timestamp: new Date().toISOString()
  });
} 