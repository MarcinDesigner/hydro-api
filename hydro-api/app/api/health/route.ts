import { NextRequest, NextResponse } from 'next/server';
import { SmartDataService } from '@/lib/smart-data-service';

export async function GET(request: NextRequest) {
  try {
    // Sprawdź API IMGW używając nowego systemu cache
    const smartStats = await SmartDataService.getSmartDataStats();
    const imgwStatus = smartStats && smartStats.totalStations > 0 ? 'healthy' : 'unhealthy';
    
    // Uproszczona kontrola bazy danych
    let dbHealth = { status: 'unknown', message: 'Database check skipped during build' };
    let dbStats = null;
    
    // Tylko w runtime sprawdzaj bazę danych
    if (process.env.NODE_ENV !== 'production' || process.env.RUNTIME_CHECK === 'true') {
      try {
        const { DatabaseService } = await import('@/lib/database-service');
        dbHealth = await DatabaseService.checkDatabaseHealth();
        
        if (dbHealth.status === 'healthy') {
          try {
            dbStats = await DatabaseService.getStationStats();
          } catch (error) {
            console.warn('Could not fetch DB stats:', error);
          }
        }
      } catch (error) {
        console.warn('Database service not available:', error);
        dbHealth = { status: 'unavailable', message: 'Database service not available' };
      }
    }

    const overallStatus = imgwStatus === 'healthy' ? 'healthy' : 'unhealthy';

    return NextResponse.json({
      status: overallStatus,
      services: {
        database: {
          status: dbHealth.status,
          message: dbHealth.message,
          stats: dbStats
        },
        imgw_api: {
          status: imgwStatus,
          stations_available: smartStats?.totalStations || 0,
          fresh_data_stations: smartStats?.freshData || 0,
          stale_data_stations: smartStats?.staleData || 0,
          cache_enabled: true
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Health check failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 