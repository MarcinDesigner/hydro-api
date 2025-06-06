import { NextRequest, NextResponse } from 'next/server';
import { IMGWCacheService } from '@/lib/imgw-cache-service';

export async function POST(request: NextRequest) {
  try {
    // Sprawdź autoryzację (opcjonalnie)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET_TOKEN;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({
        status: 'error',
        message: 'Unauthorized',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    console.log('🔄 Auto-refresh cache triggered');
    
    // Wyczyść wygasłe wpisy
    const cleanedCount = IMGWCacheService.cleanupExpiredEntries();
    
    // Odśwież wszystkie dane
    const refreshResults = await IMGWCacheService.refreshAllCache();
    
    // Pobierz aktualne statystyki
    const stats = IMGWCacheService.getCacheStats();
    
    const response = {
      status: 'success',
      message: 'Auto-refresh completed',
      data: {
        cleanedExpiredEntries: cleanedCount,
        refreshResults,
        currentStats: stats
      },
      timestamp: new Date().toISOString()
    };
    
    console.log('✅ Auto-refresh completed:', {
      cleaned: cleanedCount,
      refreshed: refreshResults.success.length,
      failed: refreshResults.failed.length
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Error in auto-refresh:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Auto-refresh failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET endpoint do sprawdzenia statusu
export async function GET() {
  try {
    const stats = IMGWCacheService.getCacheStats();
    const expired = IMGWCacheService.getExpiredEntries();
    
    return NextResponse.json({
      status: 'success',
      data: {
        stats,
        expiredEntries: expired.length,
        nextAutoRefresh: 'Every 60 minutes via cron',
        lastRefresh: stats.lastUpdate
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Failed to get auto-refresh status',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 