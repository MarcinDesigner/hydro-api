import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Vercel Cron Job started - Hydro API sync');
    
    // Sprawdź czy to rzeczywiście wywołanie z Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET_TOKEN}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const startTime = Date.now();
    
    // Wywołaj sync-smart endpoint wewnętrznie
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    const syncResponse = await fetch(`${baseUrl}/api/sync-smart`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Vercel-Cron/1.0'
      },
      body: JSON.stringify({ source: 'vercel-cron' })
    });

    const syncResult = await syncResponse.json();
    const duration = Date.now() - startTime;

    if (syncResponse.ok) {
      console.log(`✅ Vercel Cron sync completed in ${duration}ms`);
      console.log(`📊 Stats: ${JSON.stringify(syncResult.stats)}`);
      
      return NextResponse.json({
        status: 'success',
        message: 'Hydro data synchronized successfully via Vercel Cron',
        duration_ms: duration,
        sync_result: syncResult,
        timestamp: new Date().toISOString()
      });
    } else {
      console.error('❌ Vercel Cron sync failed:', syncResult);
      
      return NextResponse.json({
        status: 'error',
        message: 'Sync failed',
        error: syncResult,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Vercel Cron error:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST method dla kompatybilności
export async function POST(request: NextRequest) {
  return GET(request);
} 