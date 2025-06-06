import { NextRequest, NextResponse } from 'next/server';
import { StationVisibilityService } from '@/lib/station-visibility';

// GET - pobierz statystyki widoczności
export async function GET() {
  try {
    const stats = await StationVisibilityService.getVisibilityStats();
    
    return NextResponse.json({
      status: 'success',
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting visibility stats:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to get visibility stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - ustaw widoczność stacji
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stationId, isVisible, reason } = body;

    if (!stationId) {
      return NextResponse.json(
        { 
          status: 'error',
          error: 'Station ID is required'
        },
        { status: 400 }
      );
    }

    if (typeof isVisible !== 'boolean') {
      return NextResponse.json(
        { 
          status: 'error',
          error: 'isVisible must be a boolean'
        },
        { status: 400 }
      );
    }

    await StationVisibilityService.setStationVisibility(
      stationId, 
      isVisible, 
      reason,
      'API User' // W przyszłości można dodać autentykację
    );

    return NextResponse.json({
      status: 'success',
      message: `Station ${stationId} visibility set to ${isVisible}`,
      data: {
        stationId,
        isVisible,
        reason
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error setting station visibility:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to set station visibility',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 