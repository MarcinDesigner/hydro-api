import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Test bez importu Prisma
    const databaseUrl = process.env.DATABASE_URL;
    
    return NextResponse.json({
      status: 'success',
      database: {
        url_set: !!databaseUrl,
        url_length: databaseUrl?.length || 0,
        url_starts_with: databaseUrl?.substring(0, 20) || 'not set'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 