import { NextResponse } from 'next/server';

// Zmienne cache z /api/imgw-stations
let cachedData: any = null;
let cachedQualityStats: any = null;
let cacheTime: number | null = null;

export async function POST() {
  try {
    // Wyczyść server-side cache
    cachedData = null;
    cachedQualityStats = null;
    cacheTime = null;
    
    return NextResponse.json({
      success: true,
      message: 'Server cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to clear cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 