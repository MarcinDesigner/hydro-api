import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Fast sync started');
    const startTime = Date.now();
    
    // Sprawdź autoryzację
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_TOKEN}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Pobierz tylko 10 stacji z IMGW API
    const imgwResponse = await fetch('https://danepubliczne.imgw.pl/api/data/hydro');
    if (!imgwResponse.ok) {
      throw new Error(`IMGW API error: ${imgwResponse.status}`);
    }
    
    const imgwData = await imgwResponse.json();
    const limitedStations = imgwData.slice(0, 10); // Tylko 10 stacji
    
    let syncedStations = 0;
    let syncedMeasurements = 0;
    let errors = 0;

    // Synchronizuj tylko te 10 stacji
    for (const stationData of limitedStations) {
      try {
        const stationCode = stationData.id_stacji;
        
        // Znajdź lub utwórz stację
        const station = await prisma.station.upsert({
          where: { stationCode },
          update: {
            stationName: stationData.stacja,
            riverName: stationData.rzeka,
            voivodeship: stationData.wojewodztwo,
            updatedAt: new Date(),
          },
          create: {
            stationCode,
            stationName: stationData.stacja,
            riverName: stationData.rzeka,
            voivodeship: stationData.wojewodztwo,
            apiVisible: true,
          },
        });

        syncedStations++;

        // Dodaj pomiar jeśli istnieje
        if (stationData.stan_wody_data_pomiaru && stationData.stan_wody) {
          await prisma.measurement.create({
            data: {
              stationId: station.id,
              measurementTimestamp: new Date(stationData.stan_wody_data_pomiaru),
              waterLevel: Math.round(parseFloat(stationData.stan_wody) * 100), // cm
              temperature: stationData.temperatura_wody ? parseFloat(stationData.temperatura_wody) : null,
              source: 'hydro',
            },
          });
          syncedMeasurements++;
        }
      } catch (error) {
        console.error(`❌ Error syncing station ${stationData.id_stacji}:`, error);
        errors++;
      }
    }

    const duration = Date.now() - startTime;
    
    console.log(`✅ Fast sync completed in ${duration}ms`);
    console.log(`   - Processed: ${limitedStations.length} stations`);
    console.log(`   - Synced stations: ${syncedStations}`);
    console.log(`   - Synced measurements: ${syncedMeasurements}`);
    console.log(`   - Errors: ${errors}`);

    return NextResponse.json({
      status: 'success',
      message: 'Fast sync completed',
      stats: {
        processed_stations: limitedStations.length,
        synced_stations: syncedStations,
        synced_measurements: syncedMeasurements,
        errors,
      },
      timing: {
        duration_ms: duration,
        duration_seconds: Math.round(duration / 1000),
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('❌ Fast sync error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Fast sync endpoint - use POST method',
    description: 'Synchronizes only 10 stations quickly (<10 seconds)',
    usage: 'POST with Authorization: Bearer token',
  });
} 