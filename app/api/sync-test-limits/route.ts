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

    const body = await request.json();
    const testLimit = body.limit || 50; // Domyślnie testuj 50 stacji
    
    console.log(`🧪 Testing sync with ${testLimit} stations...`);
    const startTime = Date.now();
    
    // Pobierz stacje (bez zapisu do bazy - tylko test API)
    const smartStations = await SmartDataService.getSmartStationsData();
    const limitedStations = smartStations.slice(0, testLimit);
    
    const apiTime = Date.now() - startTime;
    
    // Symuluj operacje bazodanowe (bez rzeczywistego zapisu)
    const dbStartTime = Date.now();
    let processedStations = 0;
    
    for (const station of limitedStations) {
      // Symuluj sprawdzenie czy stacja istnieje
      await new Promise(resolve => setTimeout(resolve, 1)); // 1ms delay
      processedStations++;
      
      // Sprawdź czy nie przekraczamy 8 sekund (buffer dla Vercel)
      if (Date.now() - startTime > 8000) {
        break;
      }
    }
    
    const dbTime = Date.now() - dbStartTime;
    const totalTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: 'success',
      test_results: {
        requested_limit: testLimit,
        total_available: smartStations.length,
        processed_stations: processedStations,
        completed_all: processedStations === testLimit,
        performance: {
          api_fetch_time_ms: apiTime,
          db_simulation_time_ms: dbTime,
          total_time_ms: totalTime,
          avg_time_per_station_ms: Math.round(totalTime / processedStations),
          estimated_max_stations: Math.floor(8000 / (totalTime / processedStations))
        }
      },
      recommendations: {
        safe_limit: Math.floor(8000 / (totalTime / processedStations)) * 0.8, // 80% marginesu
        aggressive_limit: Math.floor(8000 / (totalTime / processedStations))
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Limit test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Sync limits test endpoint. Use POST with {"limit": 50} to test different limits.',
    suggested_tests: [
      { limit: 10, description: 'Current conservative limit' },
      { limit: 25, description: 'Moderate increase' },
      { limit: 50, description: 'Aggressive test' },
      { limit: 100, description: 'Maximum test' }
    ],
    timestamp: new Date().toISOString()
  });
} 