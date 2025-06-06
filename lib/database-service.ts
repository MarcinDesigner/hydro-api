import { PrismaClient } from '@prisma/client';
import { IMGWService } from './imgw-service';

const prisma = new PrismaClient();

export class DatabaseService {
  static async syncStationsAndMeasurements(): Promise<void> {
    try {
      console.log('🔄 Starting data synchronization with Supabase...');
      
      const allStations = await IMGWService.getAllStations();
      console.log(`📊 Fetched ${allStations.length} stations from IMGW API`);

      let syncedStations = 0;
      let newMeasurements = 0;

      for (const stationData of allStations) {
        try {
          // Upsert stacji
          const station = await prisma.station.upsert({
            where: { stationCode: stationData.id },
            update: {
              stationName: stationData.name,
              riverName: stationData.river,
              voivodeship: stationData.voivodeship,
              updatedAt: new Date()
            },
            create: {
              stationCode: stationData.id,
              stationName: stationData.name,
              riverName: stationData.river,
              voivodeship: stationData.voivodeship,
              apiVisible: true
            }
          });

          // Sprawdź czy pomiar już istnieje
          const measurementTimestamp = new Date(stationData.waterLevelDate);
          const existingMeasurement = await prisma.measurement.findFirst({
            where: {
              stationId: station.id,
              measurementTimestamp: measurementTimestamp
            }
          });

          if (!existingMeasurement) {
            // Dodaj nowy pomiar
            await prisma.measurement.create({
              data: {
                stationId: station.id,
                measurementTimestamp: measurementTimestamp,
                waterLevel: stationData.waterLevel ? Math.round(stationData.waterLevel) : null,
                flowRate: stationData.flow || null,
                temperature: stationData.waterTemp || null,
                source: stationData.source || 'hydro'
              }
            });
            newMeasurements++;
          }

          syncedStations++;
        } catch (error) {
          console.error(`❌ Error syncing station ${stationData.id}:`, error);
        }
      }

      console.log(`✅ Synchronization completed:`);
      console.log(`   - Synced stations: ${syncedStations}`);
      console.log(`   - New measurements: ${newMeasurements}`);
    } catch (error) {
      console.error('❌ Error during synchronization:', error);
      throw error;
    }
  }

  static async getStationStats() {
    try {
      const [
        totalStations,
        activeStations,
        measurementsToday,
        uniqueRivers
      ] = await Promise.all([
        prisma.station.count(),
        prisma.station.count({
          where: {
            measurements: {
              some: {
                measurementTimestamp: {
                  gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
                }
              }
            }
          }
        }),
        prisma.measurement.count({
          where: {
            measurementTimestamp: {
              gte: new Date(new Date().setHours(0, 0, 0, 0))
            }
          }
        }),
        prisma.station.findMany({
          select: { riverName: true },
          distinct: ['riverName'],
          where: { riverName: { not: null } }
        })
      ]);

      return {
        total_stations: totalStations,
        active_stations_24h: activeStations,
        measurements_today: measurementsToday,
        rivers_count: uniqueRivers.length
      };
    } catch (error) {
      console.error('Error getting station stats:', error);
      throw error;
    }
  }

  static async getStationWithMeasurements(stationCode: string) {
    try {
      return await prisma.station.findUnique({
        where: { stationCode },
        include: {
          measurements: {
            orderBy: { measurementTimestamp: 'desc' },
            take: 10
          },
          alerts: {
            where: { isActive: true },
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        }
      });
    } catch (error) {
      console.error('Error getting station with measurements:', error);
      throw error;
    }
  }

  static async getAllStationsFromDB() {
    try {
      return await prisma.station.findMany({
        where: { apiVisible: true },
        include: {
          measurements: {
            orderBy: { measurementTimestamp: 'desc' },
            take: 1
          }
        },
        orderBy: { stationName: 'asc' }
      });
    } catch (error) {
      console.error('Error getting all stations from DB:', error);
      throw error;
    }
  }

  static async checkDatabaseHealth() {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', message: 'Database connection successful' };
    } catch (error) {
      return { 
        status: 'unhealthy', 
        message: error instanceof Error ? error.message : 'Database connection failed' 
      };
    }
  }
} 