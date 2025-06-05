const { PrismaClient } = require('@prisma/client');

async function findStationWithHistory() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Finding stations with most historical data...');
    
    // Znajdź stacje z największą liczbą pomiarów
    const stationsWithMeasurements = await prisma.station.findMany({
      include: {
        _count: {
          select: { measurements: true }
        },
        measurements: {
          orderBy: { measurementTimestamp: 'asc' },
          take: 1,
          select: { measurementTimestamp: true }
        }
      },
      orderBy: {
        measurements: {
          _count: 'desc'
        }
      },
      take: 10
    });
    
    console.log('\nTop 10 stations with most measurements:');
    stationsWithMeasurements.forEach((station, index) => {
      const oldestMeasurement = station.measurements[0];
      const oldestDate = oldestMeasurement ? new Date(oldestMeasurement.measurementTimestamp) : null;
      
      console.log(`${index + 1}. ${station.stationCode}: ${station.stationName}`);
      console.log(`   River: ${station.riverName || 'unknown'}`);
      console.log(`   Measurements: ${station._count.measurements}`);
      console.log(`   Oldest data: ${oldestDate ? oldestDate.toLocaleDateString('pl-PL') : 'none'}`);
      console.log('');
    });
    
    // Sprawdź najstarsze pomiary w całej bazie
    const oldestMeasurements = await prisma.measurement.findMany({
      orderBy: { measurementTimestamp: 'asc' },
      take: 5,
      include: {
        station: {
          select: {
            stationCode: true,
            stationName: true,
            riverName: true
          }
        }
      }
    });
    
    console.log('\nOldest measurements in database:');
    oldestMeasurements.forEach((measurement, index) => {
      const date = new Date(measurement.measurementTimestamp);
      console.log(`${index + 1}. ${measurement.station.stationCode}: ${measurement.station.stationName}`);
      console.log(`   Date: ${date.toLocaleString('pl-PL')}`);
      console.log(`   Water Level: ${measurement.waterLevel}cm`);
      console.log(`   Source: ${measurement.source}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error finding stations:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findStationWithHistory(); 