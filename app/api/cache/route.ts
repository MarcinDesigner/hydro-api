import { NextRequest, NextResponse } from 'next/server';
import { IMGWCacheService } from '@/lib/imgw-cache-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'stats':
        const stats = IMGWCacheService.getCacheStats();
        return NextResponse.json({
          status: 'success',
          data: stats,
          timestamp: new Date().toISOString()
        });

      case 'expired':
        const expired = IMGWCacheService.getExpiredEntries();
        return NextResponse.json({
          status: 'success',
          data: {
            expiredEntries: expired,
            count: expired.length
          },
          timestamp: new Date().toISOString()
        });

      default:
        // Domyślnie zwróć statystyki
        const defaultStats = IMGWCacheService.getCacheStats();
        return NextResponse.json({
          status: 'success',
          data: defaultStats,
          timestamp: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('Error in cache API:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'refresh':
        const key = searchParams.get('key');
        if (key) {
          // Odśwież konkretny klucz
          const success = await IMGWCacheService.refreshCache(key);
          return NextResponse.json({
            status: success ? 'success' : 'error',
            message: success ? `Cache refreshed for ${key}` : `Failed to refresh cache for ${key}`,
            data: { key, success },
            timestamp: new Date().toISOString()
          });
        } else {
          // Odśwież cały cache
          const results = await IMGWCacheService.refreshAllCache();
          return NextResponse.json({
            status: 'success',
            message: `Cache refresh completed`,
            data: results,
            timestamp: new Date().toISOString()
          });
        }

      case 'clear':
        const clearKey = searchParams.get('key');
        if (clearKey) {
          // Wyczyść konkretny klucz (nie implementujemy jeszcze)
          return NextResponse.json({
            status: 'error',
            message: 'Clearing specific keys not implemented yet',
            timestamp: new Date().toISOString()
          }, { status: 501 });
        } else {
          // Wyczyść cały cache
          IMGWCacheService.clearAllCache();
          return NextResponse.json({
            status: 'success',
            message: 'All cache cleared',
            timestamp: new Date().toISOString()
          });
        }

      case 'cleanup':
        const cleaned = IMGWCacheService.cleanupExpiredEntries();
        return NextResponse.json({
          status: 'success',
          message: `Cleaned up ${cleaned} expired entries`,
          data: { cleanedEntries: cleaned },
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          status: 'error',
          message: 'Invalid action. Use: refresh, clear, or cleanup',
          timestamp: new Date().toISOString()
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in cache POST API:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 