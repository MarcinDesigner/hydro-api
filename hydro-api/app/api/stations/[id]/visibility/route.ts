import { NextRequest, NextResponse } from 'next/server';
import { StationVisibilityService } from '@/lib/station-visibility';

// GET - sprawdź widoczność stacji
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stationId = params.id;
    const isVisible = await StationVisibilityService.isStationVisible(stationId);
    
    return NextResponse.json({
      status: 'success',
      data: {
        stationId,
        isVisible
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking station visibility:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to check station visibility',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST - przełącz widoczność stacji
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stationId = params.id;
    const body = await request.json();
    const { reason } = body;

    const newVisibility = await StationVisibilityService.toggleStationVisibility(stationId, reason);
    
    return NextResponse.json({
      status: 'success',
      message: `Station ${stationId} is now ${newVisibility ? 'visible' : 'hidden'}`,
      data: {
        stationId,
        isVisible: newVisibility,
        reason
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error toggling station visibility:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Failed to toggle station visibility',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// PUT - ustaw konkretną widoczność stacji
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stationId = params.id;
    const body = await request.json();
    const { isVisible, reason } = body;

    if (typeof isVisible !== 'boolean') {
      return NextResponse.json(
        { 
          status: 'error',
          error: 'isVisible must be a boolean'
        },
        { status: 400 }
      );
    }

    await StationVisibilityService.setStationVisibility(stationId, isVisible, reason);
    
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