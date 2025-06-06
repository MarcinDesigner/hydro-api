const { PrismaClient } = require('@prisma/client');

async function checkMeasurements() {
  const prisma = new PrismaClient();
  
  try {
    console.log('📊 Checking measurements in database...');
    
    // Sprawdź ogólne statystyki
    const [totalMeasurements, totalStations, uniqueDates] = await Promise.all([
      prisma.measurement.count(),
      prisma.station.count(),
      prisma.measurement.findMany({
        select: { measurementTimestamp: true },
        distinct: ['measurementTimestamp'],
        orderBy: { measurementTimestamp: 'desc' },
        take: 10
      })
    ]);
    
    console.log(`\nGeneral statistics:`);
    console.log(`Total measurements: ${totalMeasurements}`);
    console.log(`Total stations: ${totalStations}`);
    console.log(`Average measurements per station: ${Math.round(totalMeasurements / totalStations * 100) / 100}`);
    
    console.log(`\nRecent measurement timestamps:`);
    uniqueDates.forEach((measurement, index) => {
      const date = new Date(measurement.measurementTimestamp);
      console.log(`${index + 1}. ${date.toLocaleString('pl-PL')}`);
    });
    
    // Sprawdź przykładową stację z wieloma pomiarami
    const stationWithMostMeasurements = await prisma.station.findFirst({
      include: {
        measurements: {
          orderBy: { measurementTimestamp: 'desc' },
          take: 10
        }
      },
      orderBy: {
        measurements: {
          _count: 'desc'
        }
      }
    });
    
    if (stationWithMostMeasurements) {
      console.log(`\nStation with most measurements: ${stationWithMostMeasurements.stationName} (${stationWithMostMeasurements.stationCode})`);
      console.log(`Number of measurements: ${stationWithMostMeasurements.measurements.length}`);
      console.log(`Recent measurements:`);
      
      stationWithMostMeasurements.measurements.forEach((measurement, index) => {
        const date = new Date(measurement.measurementTimestamp);
        console.log(`  ${index + 1}. ${date.toLocaleString('pl-PL')} - Water Level: ${measurement.waterLevel}cm, Source: ${measurement.source}`);
      });
    }
    
    // Sprawdź zakres dat
    const [oldestMeasurement, newestMeasurement] = await Promise.all([
      prisma.measurement.findFirst({
        orderBy: { measurementTimestamp: 'asc' },
        select: { measurementTimestamp: true }
      }),
      prisma.measurement.findFirst({
        orderBy: { measurementTimestamp: 'desc' },
        select: { measurementTimestamp: true }
      })
    ]);
    
    if (oldestMeasurement && newestMeasurement) {
      const oldestDate = new Date(oldestMeasurement.measurementTimestamp);
      const newestDate = new Date(newestMeasurement.measurementTimestamp);
      const daysDiff = Math.floor((newestDate - oldestDate) / (1000 * 60 * 60 * 24));
      
      console.log(`\nData range:`);
      console.log(`Oldest measurement: ${oldestDate.toLocaleString('pl-PL')}`);
      console.log(`Newest measurement: ${newestDate.toLocaleString('pl-PL')}`);
      console.log(`Days covered: ${daysDiff} days`);
    }
    
    // Sprawdź czy są duplikaty (ta sama stacja, ten sam timestamp)
    const duplicates = await prisma.measurement.groupBy({
      by: ['stationId', 'measurementTimestamp', 'source'],
      _count: {
        id: true
      },
      having: {
        id: {
          _count: {
            gt: 1
          }
        }
      }
    });
    
    console.log(`\nDuplicate measurements: ${duplicates.length}`);
    
  } catch (error) {
    console.error('❌ Error checking measurements:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMeasurements(); 