const { PrismaClient } = require('@prisma/client');

async function checkDatabase() {
  const prisma = new PrismaClient();
  
  try {
    const stationCount = await prisma.station.count();
    const measurementCount = await prisma.measurement.count();
    
    console.log(`Stations in database: ${stationCount}`);
    console.log(`Measurements in database: ${measurementCount}`);
    
    if (stationCount > 0) {
      const sampleStations = await prisma.station.findMany({
        take: 5,
        select: {
          stationCode: true,
          stationName: true,
          riverName: true,
          createdAt: true
        }
      });
      
      console.log('\nSample stations:');
      sampleStations.forEach(station => {
        console.log(`- ${station.stationCode}: ${station.stationName} (${station.riverName}) - Created: ${station.createdAt}`);
      });
    }
  } catch (error) {
    console.error('Database error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase(); 