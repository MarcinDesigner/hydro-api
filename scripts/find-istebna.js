#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findIstebna() {
  try {
    await prisma.$connect();
    
    const station = await prisma.station.findFirst({
      where: {
        OR: [
          { stationCode: '149180130' },
          { id: '149180130' }
        ]
      },
      select: {
        id: true,
        stationCode: true,
        stationName: true
      }
    });
    
    console.log('🔍 Stacja Istebna:', station);
    
    if (station) {
      const measurementCount = await prisma.measurement.count({
        where: { stationId: station.id }
      });
      console.log(`📊 Pomiary dla tej stacji: ${measurementCount}`);
      
      // Sprawdźmy kilka najnowszych pomiarów
      const recentMeasurements = await prisma.measurement.findMany({
        where: { stationId: station.id },
        orderBy: { measurementTimestamp: 'desc' },
        take: 3,
        select: {
          measurementTimestamp: true,
          waterLevel: true,
          source: true
        }
      });
      
      console.log('📅 Najnowsze pomiary:');
      recentMeasurements.forEach((m, i) => {
        console.log(`   ${i+1}. ${m.measurementTimestamp.toISOString().split('T')[0]} - ${m.waterLevel}cm (${m.source})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Błąd:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findIstebna(); 