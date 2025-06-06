import { NextResponse } from 'next/server';
import { EnhancedIMGWService } from '@/lib/enhanced-imgw-service';

export async function POST() {
  try {
    console.log('Initializing coordinates cache...');
    
    await EnhancedIMGWService.initializeCoordinatesCache();
    
    const stats = await EnhancedIMGWService.getCoordinatesStats();
    
    return NextResponse.json({
      success: true,
      message: 'Coordinates cache initialized successfully',
      stats
    });
  } catch (error) {
    console.error('Error initializing coordinates cache:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to initialize coordinates cache',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 