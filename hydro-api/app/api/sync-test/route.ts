import { NextRequest, NextResponse } from 'next/server';
import { SmartDataService } from '@/lib/smart-data-service';

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

    console.log('🔄 Starting test synchronization...');
    
    // Pobierz dane ze SmartDataService (bez zapisu do bazy)
    const smartStations = await SmartDataService.getSmartStationsData();
    console.log(`📊 Fetched ${smartStations.length} smart stations from IMGW API`);
    
    return NextResponse.json({
      status: 'success',
      message: `Test sync completed - data fetched but not saved to database`,
      stats: {
        total_stations: smartStations.length,
        sample_station: smartStations[0] || null
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Test sync error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Test synchronization failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Test sync endpoint is working. Use POST to trigger test synchronization.',
    timestamp: new Date().toISOString()
  });
} 