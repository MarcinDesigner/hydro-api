import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const hours = parseInt(searchParams.get('hours') || '24');
    
    // Pobierz najnowsze pomiary z ostatnich X godzin
    const hoursAgo = new Date();
    hoursAgo.setHours(hoursAgo.getHours() - hours);
    
    // Pobierz najnowsze pomiary
    const measurements = await prisma.measurement.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      where: {
        measurementTimestamp: {
          gte: hoursAgo
        }
      },
      include: {
        station: {
          select: {
            id: true,
            stationName: true,
            riverName: true,
            voivodeship: true
          }
        }
      }
    });

    // Statystyki
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const [todayCount, last24hCount] = await Promise.all([
      prisma.measurement.count({
        where: {
          measurementTimestamp: {
            gte: todayStart
          }
        }
      }),
      prisma.measurement.count({
        where: {
          measurementTimestamp: {
            gte: hoursAgo
          }
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      data: {
        measurements: measurements || [],
        stats: {
          totalFound: measurements?.length || 0,
          todayCount: todayCount || 0,
          last24hCount: last24hCount || 0,
          timeRange: `${hours} godzin`,
          oldestMeasurement: measurements?.[measurements.length - 1]?.measurementTimestamp,
          newestMeasurement: measurements?.[0]?.measurementTimestamp
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Błąd w endpoint recent-measurements:', error);
    return NextResponse.json(
      { error: 'Wewnętrzny błąd serwera' },
      { status: 500 }
    );
  }
} 