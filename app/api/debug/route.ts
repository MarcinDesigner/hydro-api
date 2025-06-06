import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({
    env_vars: {
      CRON_SECRET_TOKEN: process.env.CRON_SECRET_TOKEN ? 'SET' : 'NOT_SET',
      CRON_SECRET_TOKEN_LENGTH: process.env.CRON_SECRET_TOKEN?.length || 0,
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV
    },
    timestamp: new Date().toISOString()
  });
} 