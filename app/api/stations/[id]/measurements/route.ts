import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { IMGWCacheService } from '@/lib/imgw-cache-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const stationId = params.id;
    const { searchParams } = new URL(request.url);
    
    // Parametry zapytania
    const days = parseInt(searchParams.get('days') || '30'); // domyślnie 30 dni
    const limit = parseInt(searchParams.get('limit') || '1000'); // domyślnie 1000 pomiarów
    const source = searchParams.get('source'); // opcjonalnie filtruj po źródle
    
    // Funkcja do pobierania danych z bazy (bez cache)
    const fetchMeasurementsFromDB = async () => {
      // Sprawdź czy stacja istnieje
      const station = await prisma.station.findFirst({
        where: { stationCode: stationId }
      });

      if (!station) {
        throw new Error(`Station ${stationId} not found`);
      }

      // Oblicz datę początkową
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Pobierz pomiary
      const whereClause: any = {
        stationId: station.id,
        measurementTimestamp: {
          gte: startDate
        }
      };

      if (source) {
        whereClause.source = source;
      }

      const measurements = await prisma.measurement.findMany({
        where: whereClause,
        orderBy: { measurementTimestamp: 'desc' },
        take: limit,
        select: {
          id: true,
          measurementTimestamp: true,
          waterLevel: true,
          flowRate: true,
          temperature: true,
          source: true,
          createdAt: true
        }
      });

      return { station, measurements };
    };

    // Pobierz dane z cache lub bazy danych
    let station, measurements;
    try {
      console.log(`🔍 Fetching measurements for station ${stationId}, days: ${days}, limit: ${limit}`);
      const result = await IMGWCacheService.getStationMeasurements(
        stationId,
        days,
        limit,
        fetchMeasurementsFromDB
      );
      console.log(`✅ Got measurements for station ${stationId}: ${result.measurements?.length || 0} records`);
      station = result.station;
      measurements = result.measurements;
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        return NextResponse.json(
          { 
            status: 'error',
            error: 'Station not found',
            stationId 
          },
          { status: 404 }
        );
      }
      throw error; // Re-throw other errors
    }

    // Oblicz statystyki
    const stats = {
      totalMeasurements: measurements.length,
      dateRange: {
        from: measurements.length > 0 ? measurements[measurements.length - 1]?.measurementTimestamp : null,
        to: measurements.length > 0 ? measurements[0]?.measurementTimestamp : null
      },
      waterLevel: (() => {
        const validMeasurements = measurements.filter((m: any) => m.waterLevel !== null);
        if (validMeasurements.length === 0) {
          return { min: null, max: null, avg: null };
        }
        const levels = validMeasurements.map((m: any) => m.waterLevel!);
        return {
          min: Math.min(...levels),
          max: Math.max(...levels),
          avg: Math.round(levels.reduce((sum: number, level: number) => sum + level, 0) / levels.length)
        };
      })(),
      sources: measurements.reduce((acc: any, m: any) => {
        acc[m.source] = (acc[m.source] || 0) + 1;
        return acc;
      }, {})
    };

    // Przygotuj dane do wykresu (grupuj po godzinach dla lepszej czytelności)
    const chartData = measurements.map((measurement: any) => ({
      timestamp: measurement.measurementTimestamp,
      waterLevel: measurement.waterLevel,
      flowRate: measurement.flowRate,
      temperature: measurement.temperature,
      source: measurement.source
    }));

    return NextResponse.json({
      status: 'success',
      data: {
        station: {
          id: station.stationCode,
          name: station.stationName,
          river: station.riverName,
          voivodeship: station.voivodeship
        },
        measurements: chartData,
        stats,
        query: {
          days,
          limit,
          source: source || 'all',
          actualCount: measurements.length
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching station measurements:', error);
    return NextResponse.json(
      { 
        status: 'error',
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 