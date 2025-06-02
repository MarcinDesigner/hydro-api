import { NextRequest, NextResponse } from 'next/server';
import { DatabaseService } from '@/lib/database-service';

export async function POST(request: NextRequest) {
  try {
    // Sprawdź autoryzację (opcjonalnie)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    console.log('🔄 Starting data synchronization with Supabase...');
    
    // Uruchom synchronizację z bazą danych
    await DatabaseService.syncStationsAndMeasurements();
    
    return NextResponse.json({
      status: 'success',
      message: 'Data synchronized successfully with Supabase',
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

// Opcjonalnie - endpoint GET do ręcznego testowania
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Sync endpoint is working. Use POST to trigger synchronization with Supabase.',
    timestamp: new Date().toISOString()
  });
} 