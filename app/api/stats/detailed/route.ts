import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface StatsData {
  overview: {
    totalMeasurements: number;
    activeStations: number;
    averageWaterLevel: number;
    globalMinLevel: number;
    globalMaxLevel: number;
    globalRange: number;
    globalStandardDeviation: number;
  };
  riverStats: Array<{
    river: string;
    stationCount: number;
    averageLevel: number;
    minLevel: number;
    maxLevel: number;
    range: number;
    standardDeviation: number;
    variance: number;
    trend: 'rising' | 'falling' | 'stable';
  }>;
  monthlyStats: Array<{
    month: string;
    year: number;
    averageLevel: number;
    minLevel: number;
    maxLevel: number;
    measurementCount: number;
    stationsActive: number;
  }>;
  stationStats: Array<{
    stationId: string;
    stationName: string;
    river: string;
    voivodeship: string;
    averageLevel: number;
    minLevel: number;
    maxLevel: number;
    range: number;
    measurementCount: number;
    lastMeasurement: string;
    stability: 'stable' | 'variable' | 'highly_variable';
  }>;
  voivodeshipStats: Array<{
    voivodeship: string;
    stationCount: number;
    averageLevel: number;
    range: number;
  }>;
  spatialAnalysis: {
    riverFlowAnalysis: any[];
    basinAnalysis: any[];
    criticalPoints: any[];
  };
  practicalApplications: {
    floodRiskModeling: any;
    earlyWarningSystem: any;
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d';
    const river = searchParams.get('river') || 'all';

    // Oblicz datę początkową na podstawie okresu
    const now = new Date();
    let startDate = new Date();
    
    switch (period) {
      case '7d':
        startDate.setDate(now.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(now.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(now.getDate() - 90);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }

    // Pobierz pomiary z wybranego okresu
    const whereClause: any = {
      measurementTimestamp: {
        gte: startDate
      },
      waterLevel: {
        not: null
      }
    };

    // Filtruj po rzece jeśli wybrana
    if (river !== 'all') {
      whereClause.station = {
        riverName: {
          contains: river,
          mode: 'insensitive'
        }
      };
    }

    const measurements = await prisma.measurement.findMany({
      where: whereClause,
      include: {
        station: {
          select: {
            id: true,
            stationCode: true,
            stationName: true,
            riverName: true,
            voivodeship: true
          }
        }
      },
      orderBy: {
        measurementTimestamp: 'desc'
      },
      take: 50000 // Limit do 50k pomiarów aby uniknąć stack overflow
    });

    if (measurements.length === 0) {
      return NextResponse.json({
        status: 'success',
        data: {
          overview: {
            totalMeasurements: 0,
            activeStations: 0,
            averageWaterLevel: 0,
            globalMinLevel: 0,
            globalMaxLevel: 0,
            globalRange: 0,
            globalStandardDeviation: 0
          },
          riverStats: [],
          monthlyStats: [],
          stationStats: [],
          voivodeshipStats: [],
          spatialAnalysis: {
            riverFlowAnalysis: [],
            basinAnalysis: [],
            criticalPoints: []
          },
          practicalApplications: {
            floodRiskModeling: {
              stationAssessments: [],
              regionalAnalysis: [],
              summary: {
                totalStations: 0,
                highRiskStations: 0,
                avgExceedanceProb: 0,
                stationsAboveWarning: 0
              }
            },
            earlyWarningSystem: {
              activeAlerts: [],
              predictions: [],
              monitoringStations: [],
              summary: {
                totalAlerts: 0,
                criticalAlerts: 0,
                stationsMonitored: 0,
                avgTrend: 0,
                highRiskPredictions: 0
              }
            }
          }
        },
        timestamp: new Date().toISOString()
      });
    }

    // Oblicz statystyki ogólne
    const waterLevels = measurements
      .filter(m => m.waterLevel !== null)
      .map(m => m.waterLevel as number);

    const totalMeasurements = measurements.length;
    const activeStations = new Set(measurements.map(m => m.stationId)).size;
    const averageWaterLevel = waterLevels.reduce((sum, level) => sum + level, 0) / waterLevels.length;
    const globalMinLevel = Math.min(...waterLevels);
    const globalMaxLevel = Math.max(...waterLevels);
    const globalRange = globalMaxLevel - globalMinLevel;

    // Oblicz odchylenie standardowe
    const variance = waterLevels.reduce((sum, level) => {
      return sum + Math.pow(level - averageWaterLevel, 2);
    }, 0) / waterLevels.length;
    const globalStandardDeviation = Math.sqrt(variance);

    // Grupuj pomiary według rzek
    const riverGroups = new Map<string, typeof measurements>();
    measurements.forEach(measurement => {
      const riverName = measurement.station.riverName || 'Nieznana';
      if (!riverGroups.has(riverName)) {
        riverGroups.set(riverName, []);
      }
      riverGroups.get(riverName)?.push(measurement);
    });

    // Oblicz statystyki dla rzek
    const riverStats = Array.from(riverGroups.entries()).map(([riverName, riverMeasurements]) => {
      const riverWaterLevels = riverMeasurements
        .filter(m => m.waterLevel !== null)
        .map(m => m.waterLevel as number);

      if (riverWaterLevels.length === 0) {
        return {
          river: riverName,
          stationCount: new Set(riverMeasurements.map(m => m.stationId)).size,
          averageLevel: 0,
          minLevel: 0,
          maxLevel: 0,
          range: 0,
          standardDeviation: 0,
          variance: 0,
          trend: 'stable' as const
        };
      }

      const riverAverage = riverWaterLevels.reduce((sum, level) => sum + level, 0) / riverWaterLevels.length;
      const riverMin = Math.min(...riverWaterLevels);
      const riverMax = Math.max(...riverWaterLevels);
      const riverRange = riverMax - riverMin;

      const riverVariance = riverWaterLevels.reduce((sum, level) => {
        return sum + Math.pow(level - riverAverage, 2);
      }, 0) / riverWaterLevels.length;
      const riverStandardDeviation = Math.sqrt(riverVariance);

      // Oblicz trend (uproszczony)
      const sortedByTime = riverMeasurements
        .filter(m => m.waterLevel !== null)
        .sort((a, b) => a.measurementTimestamp.getTime() - b.measurementTimestamp.getTime());
      
      let trend: 'rising' | 'falling' | 'stable' = 'stable';
      if (sortedByTime.length >= 4) {
        const firstHalf = sortedByTime.slice(0, Math.floor(sortedByTime.length / 2));
        const secondHalf = sortedByTime.slice(Math.floor(sortedByTime.length / 2));
        
        const firstAvg = firstHalf.reduce((sum, m) => sum + (m.waterLevel as number), 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, m) => sum + (m.waterLevel as number), 0) / secondHalf.length;
        
        const difference = secondAvg - firstAvg;
        if (Math.abs(difference) > riverStandardDeviation * 0.5) {
          trend = difference > 0 ? 'rising' : 'falling';
        }
      }

      return {
        river: riverName,
        stationCount: new Set(riverMeasurements.map(m => m.stationId)).size,
        averageLevel: riverAverage,
        minLevel: riverMin,
        maxLevel: riverMax,
        range: riverRange,
        standardDeviation: riverStandardDeviation,
        variance: riverVariance,
        trend
      };
    }).sort((a, b) => b.stationCount - a.stationCount);

    // Grupuj pomiary według stacji
    const stationGroups = new Map<string, typeof measurements>();
    measurements.forEach(measurement => {
      const stationId = measurement.stationId;
      if (!stationGroups.has(stationId)) {
        stationGroups.set(stationId, []);
      }
      stationGroups.get(stationId)?.push(measurement);
    });

    // Oblicz statystyki dla stacji
    const stationStats = Array.from(stationGroups.entries()).map(([stationId, stationMeasurements]) => {
      const station = stationMeasurements[0]?.station;
      const stationWaterLevels = stationMeasurements
        .filter(m => m.waterLevel !== null)
        .map(m => m.waterLevel as number);

      if (stationWaterLevels.length === 0) {
        return {
          stationId,
          stationName: station.stationName,
          river: station.riverName || 'Nieznana',
          voivodeship: station.voivodeship || 'Nieznane',
          averageLevel: 0,
          minLevel: 0,
          maxLevel: 0,
          range: 0,
          measurementCount: stationMeasurements.length,
          lastMeasurement: stationMeasurements[0]?.measurementTimestamp.toISOString() || '',
          stability: 'stable' as const
        };
      }

      const stationAverage = stationWaterLevels.reduce((sum, level) => sum + level, 0) / stationWaterLevels.length;
      const stationMin = Math.min(...stationWaterLevels);
      const stationMax = Math.max(...stationWaterLevels);
      const stationRange = stationMax - stationMin;

      // Oblicz stabilność na podstawie odchylenia standardowego
      const stationVariance = stationWaterLevels.reduce((sum, level) => {
        return sum + Math.pow(level - stationAverage, 2);
      }, 0) / stationWaterLevels.length;
      const stationStandardDeviation = Math.sqrt(stationVariance);
      
      let stability: 'stable' | 'variable' | 'highly_variable' = 'stable';
      const coefficientOfVariation = stationAverage > 0 ? (stationStandardDeviation / stationAverage) : 0;
      
      if (coefficientOfVariation > 0.3) {
        stability = 'highly_variable';
      } else if (coefficientOfVariation > 0.1) {
        stability = 'variable';
      }

      return {
        stationId,
        stationName: station.stationName,
        river: station.riverName || 'Nieznana',
        voivodeship: station.voivodeship || 'Nieznane',
        averageLevel: stationAverage,
        minLevel: stationMin,
        maxLevel: stationMax,
        range: stationRange,
        measurementCount: stationMeasurements.length,
        lastMeasurement: stationMeasurements[0]?.measurementTimestamp.toISOString() || '',
        stability
      };
    }).sort((a, b) => b.measurementCount - a.measurementCount);

    // Statystyki miesięczne (uproszczone)
    const monthlyStats = [];
    for (let i = 0; i < 12; i++) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthMeasurements = measurements.filter(m => 
        m.measurementTimestamp >= monthStart && m.measurementTimestamp <= monthEnd
      );
      
      if (monthMeasurements.length > 0) {
        const monthWaterLevels = monthMeasurements
          .filter(m => m.waterLevel !== null)
          .map(m => m.waterLevel as number);
        
        monthlyStats.push({
          month: monthStart.toLocaleDateString('pl-PL', { month: 'long' }),
          year: monthStart.getFullYear(),
          averageLevel: monthWaterLevels.reduce((sum, level) => sum + level, 0) / monthWaterLevels.length,
          minLevel: Math.min(...monthWaterLevels),
          maxLevel: Math.max(...monthWaterLevels),
          measurementCount: monthMeasurements.length,
          stationsActive: new Set(monthMeasurements.map(m => m.stationId)).size
        });
      }
    }

    // Statystyki województw
    const voivodeshipGroups = new Map<string, typeof measurements>();
    measurements.forEach(measurement => {
      const voivodeship = measurement.station.voivodeship || 'Nieznane';
      if (!voivodeshipGroups.has(voivodeship)) {
        voivodeshipGroups.set(voivodeship, []);
      }
      voivodeshipGroups.get(voivodeship)?.push(measurement);
    });

    const voivodeshipStats = Array.from(voivodeshipGroups.entries()).map(([voivodeship, voivMeasurements]) => {
      const voivWaterLevels = voivMeasurements
        .filter(m => m.waterLevel !== null)
        .map(m => m.waterLevel as number);

      return {
        voivodeship,
        stationCount: new Set(voivMeasurements.map(m => m.stationId)).size,
        averageLevel: voivWaterLevels.length > 0 
          ? voivWaterLevels.reduce((sum, level) => sum + level, 0) / voivWaterLevels.length 
          : 0,
        range: voivWaterLevels.length > 0 
          ? Math.max(...voivWaterLevels) - Math.min(...voivWaterLevels) 
          : 0
      };
    }).sort((a, b) => b.stationCount - a.stationCount);

    const statsData: StatsData = {
      overview: {
        totalMeasurements,
        activeStations,
        averageWaterLevel,
        globalMinLevel,
        globalMaxLevel,
        globalRange,
        globalStandardDeviation
      },
      riverStats,
      monthlyStats,
      stationStats,
      voivodeshipStats,
      spatialAnalysis: {
        riverFlowAnalysis: [],
        basinAnalysis: [],
        criticalPoints: []
      },
      practicalApplications: {
        floodRiskModeling: {
          stationAssessments: [],
          regionalAnalysis: [],
          summary: {
            totalStations: activeStations,
            highRiskStations: 0,
            avgExceedanceProb: 0,
            stationsAboveWarning: 0
          }
        },
        earlyWarningSystem: {
          activeAlerts: [],
          predictions: [],
          monitoringStations: [],
          summary: {
            totalAlerts: 0,
            criticalAlerts: 0,
            stationsMonitored: activeStations,
            avgTrend: 0,
            highRiskPredictions: 0
          }
        }
      }
    };

    return NextResponse.json({
      status: 'success',
      data: statsData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error getting detailed stats:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 