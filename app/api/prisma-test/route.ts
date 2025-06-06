import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test z importem Prisma
    const { prisma } = await import('@/lib/prisma');
    
    // Spróbuj prostego zapytania
    const stationCount = await prisma.station.count();
    
    return NextResponse.json({
      status: 'success',
      database: {
        connection: 'working',
        station_count: stationCount
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 