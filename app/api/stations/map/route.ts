import { NextResponse } from 'next/server';
import { IMGWCacheService } from '@/lib/imgw-cache-service';

export async function GET() {
  try {
    const stations = await IMGWCacheService.getSmartStationsForMap();
    
    return NextResponse.json({
      status: 'success',
      stations,
      count: stations.length,
      stats: {
        fresh: stations.filter(s => s.dataFreshness === 'fresh').length,
        stale: stations.filter(s => s.dataFreshness === 'stale').length,
        from_hydro: stations.filter(s => s.source === 'hydro').length,
        from_hydro2: stations.filter(s => s.source === 'hydro2').length,
        alarm_stats: {
          normal: stations.filter(s => s.alarmStatus === 'normal').length,
          warning: stations.filter(s => s.alarmStatus === 'warning').length,
          alarm: stations.filter(s => s.alarmStatus === 'alarm').length,
          unknown: stations.filter(s => s.alarmStatus === 'unknown').length
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in stations map API:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to fetch stations for map',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 