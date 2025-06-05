import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Sprawdź autoryzację
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' }, 
        { status: 401 }
      );
    }

    // Parsuj body
    const body = await request.json();
    
    return NextResponse.json({
      status: 'success',
      message: 'Cron test endpoint working correctly',
      received: {
        source: body.source || 'unknown',
        timestamp: new Date().toISOString(),
        auth: 'valid'
      }
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: 'Cron test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Cron test endpoint. Use POST with Authorization header.',
    timestamp: new Date().toISOString()
  });
} 