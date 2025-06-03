import { NextRequest, NextResponse } from 'next/server';
import { IMGWService } from '@/lib/imgw-service';

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
    
    // Pobierz dane z IMGW API (bez zapisywania do bazy)
    const allStations = await IMGWService.getAllStations();
    console.log(`📊 Fetched ${allStations.length} stations from IMGW API`);
    
    return NextResponse.json({
      status: 'success',
      message: `Data synchronized successfully - fetched ${allStations.length} stations`,
      stations_count: allStations.length,
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