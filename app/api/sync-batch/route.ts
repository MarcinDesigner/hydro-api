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

    console.log('🔄 Starting batch synchronization...');
    
    // Pobierz wszystkie stacje
    const smartStations = await SmartDataService.getSmartStationsData();
    console.log(`📊 Total stations available: ${smartStations.length}`);
    
    // Oblicz który batch pobrać na podstawie aktualnego czasu
    const now = new Date();
    const minuteOfHour = now.getMinutes();
    
    // Podziel stacje na batche po 10
    const batchSize = 10;
    const totalBatches = Math.ceil(smartStations.length / batchSize);
    
    // Oblicz który batch pobrać (rotacja co minutę)
    const currentBatch = minuteOfHour % totalBatches;
    const startIndex = currentBatch * batchSize;
    const endIndex = Math.min(startIndex + batchSize, smartStations.length);
    
    // Pobierz stacje dla tego batcha
    const batchStations = smartStations.slice(startIndex, endIndex);
    
    console.log(`📦 Processing batch ${currentBatch + 1}/${totalBatches} (stations ${startIndex + 1}-${endIndex})`);
    
    let syncedStations = 0;
    let syncedMeasurements = 0;
    let errors = 0;
    
    // Synchronizuj stacje z tego batcha
    for (const station of batchStations) {
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
    
    // Oblicz postęp
    const progressPercent = Math.round(((currentBatch + 1) / totalBatches) * 100);
    const nextBatch = (currentBatch + 1) % totalBatches;
    const nextBatchTime = nextBatch === 0 ? 'Full cycle completed!' : `Next batch in ~1 minute`;
    
    console.log(`✅ Batch sync completed: ${syncedStations} new stations, ${syncedMeasurements} measurements, ${errors} errors`);
    
    return NextResponse.json({
      status: 'success',
      message: `Batch sync completed`,
      batch_info: {
        current_batch: currentBatch + 1,
        total_batches: totalBatches,
        progress_percent: progressPercent,
        stations_in_batch: batchStations.length,
        next_batch_info: nextBatchTime
      },
      stats: {
        total_available: smartStations.length,
        processed_stations: batchStations.length,
        synced_stations: syncedStations,
        synced_measurements: syncedMeasurements,
        errors: errors
      },
      timing: {
        minute_of_hour: minuteOfHour,
        stations_range: `${startIndex + 1}-${endIndex}`
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Batch sync error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Batch synchronization failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const smartStations = await SmartDataService.getSmartStationsData();
    const batchSize = 10;
    const totalBatches = Math.ceil(smartStations.length / batchSize);
    
    return NextResponse.json({
      message: 'Batch sync endpoint. Use POST to trigger batch synchronization.',
      info: {
        total_stations: smartStations.length,
        batch_size: batchSize,
        total_batches: totalBatches,
        full_cycle_time: `${totalBatches} minutes`,
        recommended_cron: '* * * * * (every minute)'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      message: 'Batch sync endpoint info unavailable',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
} 