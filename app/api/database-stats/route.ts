import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { IMGWService } from '@/lib/imgw-service';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  try {
    // Pobierz podstawowe statystyki bazy danych
    const [
      totalStations,
      totalMeasurements,
      measurementsToday,
      measurementsThisMonth,
      lastSyncTime,
      uniqueRivers,
      activeAlerts
    ] = await Promise.all([
      prisma.station.count(),
      prisma.measurement.count(),
      prisma.measurement.count({
        where: {
          measurementTimestamp: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      prisma.measurement.count({
        where: {
          measurementTimestamp: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      prisma.measurement.findFirst({
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true }
      }),
      prisma.station.findMany({
        select: { riverName: true },
        distinct: ['riverName'],
        where: { riverName: { not: null } }
      }),
      prisma.alert.count({
        where: { isActive: true }
      })
    ]);

    // Pobierz statystyki z ostatnich 24h
    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const measurementsLast24h = await prisma.measurement.count({
      where: {
        createdAt: {
          gte: last24Hours
        }
      }
    });

    // Pobierz statystyki stacji z najnowszymi pomiarami
    const stationsWithRecentData = await prisma.station.count({
      where: {
        measurements: {
          some: {
            measurementTimestamp: {
              gte: new Date(Date.now() - 6 * 60 * 60 * 1000) // ostatnie 6 godzin
            }
          }
        }
      }
    });

    // Sprawdź status API IMGW (symulacja statystyk zapytań)
    let imgwApiStats = {
      status: 'unknown',
      monthlyRequests: 0,
      dailyRequests: 0,
      successfulRequests: 0,
      failedRequests: 0
    };

    try {
      const imgwData = await IMGWService.fetchCurrentAPIData();
      const isHealthy = imgwData.length > 0;
      
      // Symulacja statystyk (w rzeczywistej aplikacji te dane byłyby przechowywane w bazie)
      const now = new Date();
      const dayOfMonth = now.getDate();
      const hourOfDay = now.getHours();
      
      imgwApiStats = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        monthlyRequests: dayOfMonth * 24 + hourOfDay, // Symulacja
        dailyRequests: Math.floor(Math.random() * 50) + 20, // Symulacja
        successfulRequests: Math.floor(Math.random() * 45) + 15, // Symulacja
        failedRequests: Math.floor(Math.random() * 5) // Symulacja
      };
    } catch (error) {
      console.error('Error checking IMGW API:', error);
      imgwApiStats.status = 'error';
    }

    // Oblicz system status
    const systemStatus = imgwApiStats.status === 'healthy' && totalStations > 0 ? 'operational' : 'degraded';

    return NextResponse.json({
      status: 'success',
      data: {
        database: {
          totalStations,
          totalMeasurements,
          measurementsToday,
          measurementsThisMonth,
          measurementsLast24h,
          lastSyncTime: lastSyncTime?.createdAt || null,
          uniqueRivers: uniqueRivers.length,
          activeAlerts,
          stationsWithRecentData
        },
        imgwApi: imgwApiStats,
        system: {
          status: systemStatus,
          uptime: process.uptime(),
          lastCheck: new Date().toISOString()
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Database stats API error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 