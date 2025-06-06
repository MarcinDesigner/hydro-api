import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const stationId = params.id;
    
    // Parametry zapytania
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');
    const orderBy = searchParams.get('order_by') || 'desc'; // desc lub asc
    
    // Sprawdzamy czy stacja istnieje
    const station = await prisma.station.findFirst({
      where: {
        OR: [
          { id: stationId },
          { stationCode: stationId }
        ]
      }
    });

    if (!station) {
      return NextResponse.json(
        { error: 'Stacja nie została znaleziona' },
        { status: 404 }
      );
    }

    // Budujemy warunki zapytania
    const whereConditions: any = {
      stationId: station.id
    };

    // Filtrowanie po dacie
    if (startDate || endDate) {
      whereConditions.measurementTimestamp = {};
      
      if (startDate) {
        whereConditions.measurementTimestamp.gte = new Date(startDate);
      }
      
      if (endDate) {
        whereConditions.measurementTimestamp.lte = new Date(endDate);
      }
    }

    // Pobieramy pomiary historyczne
    const measurements = await prisma.measurement.findMany({
      where: whereConditions,
      orderBy: {
        measurementTimestamp: orderBy === 'asc' ? 'asc' : 'desc'
      },
      take: Math.min(limit, 1000), // Maksymalnie 1000 rekordów
      skip: offset,
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

    // Pobieramy statystyki
    const stats = await prisma.measurement.aggregate({
      where: whereConditions,
      _count: {
        id: true
      },
      _avg: {
        waterLevel: true,
        flowRate: true,
        temperature: true
      },
      _min: {
        waterLevel: true,
        measurementTimestamp: true
      },
      _max: {
        waterLevel: true,
        measurementTimestamp: true
      }
    });

    // Pobieramy najstarszy i najnowszy pomiar
    const [oldestMeasurement, newestMeasurement] = await Promise.all([
      prisma.measurement.findFirst({
        where: { stationId: station.id },
        orderBy: { measurementTimestamp: 'asc' },
        select: { measurementTimestamp: true }
      }),
      prisma.measurement.findFirst({
        where: { stationId: station.id },
        orderBy: { measurementTimestamp: 'desc' },
        select: { measurementTimestamp: true }
      })
    ]);

    // Grupowanie pomiarów po miesiącach (uproszczone)
    const monthlyStats: any[] = [];

    const response = {
      station: {
        id: station.id,
        stationCode: station.stationCode,
        stationName: station.stationName,
        riverName: station.riverName,
        voivodeship: station.voivodeship
      },
      measurements,
      pagination: {
        limit,
        offset,
        total: stats._count.id,
        hasMore: (offset + measurements.length) < stats._count.id
      },
      statistics: {
        totalMeasurements: stats._count.id,
        averageWaterLevel: stats._avg.waterLevel ? Math.round(stats._avg.waterLevel * 10) / 10 : null,
        averageFlowRate: stats._avg.flowRate ? Math.round(stats._avg.flowRate * 100) / 100 : null,
        averageTemperature: stats._avg.temperature ? Math.round(stats._avg.temperature * 10) / 10 : null,
        minWaterLevel: stats._min.waterLevel,
        maxWaterLevel: stats._max.waterLevel,
        dataRange: {
          oldest: oldestMeasurement?.measurementTimestamp,
          newest: newestMeasurement?.measurementTimestamp
        }
      },
      monthlyStats: [],
      filters: {
        startDate,
        endDate,
        orderBy
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching historical data:', error);
    return NextResponse.json(
      { error: 'Błąd podczas pobierania danych historycznych' },
      { status: 500 }
    );
  }
} 