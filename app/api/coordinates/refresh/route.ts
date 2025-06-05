import { NextResponse } from 'next/server';
import { EnhancedIMGWService } from '@/lib/enhanced-imgw-service';

export async function POST() {
  try {
    console.log('Refreshing coordinates cache...');
    
    await EnhancedIMGWService.refreshCoordinatesCache();
    
    const stats = await EnhancedIMGWService.getCoordinatesStats();
    
    return NextResponse.json({
      success: true,
      message: 'Coordinates cache refreshed successfully',
      stats
    });
  } catch (error) {
    console.error('Error refreshing coordinates cache:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to refresh coordinates cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 