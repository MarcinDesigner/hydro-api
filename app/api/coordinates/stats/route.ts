import { NextResponse } from 'next/server';
import { EnhancedIMGWService } from '@/lib/enhanced-imgw-service';

export async function GET() {
  try {
    const stats = await EnhancedIMGWService.getCoordinatesStats();
    
    if (!stats) {
      return NextResponse.json(
        { error: 'Unable to fetch coordinates stats' },
        { status: 500 }
      );
    }

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error in coordinates stats API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 