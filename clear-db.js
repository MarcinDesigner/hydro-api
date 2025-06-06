const { PrismaClient } = require('@prisma/client');

async function clearDatabase() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🗑️  Clearing database...');
    
    // Usuń wszystkie pomiary
    const deletedMeasurements = await prisma.measurement.deleteMany({});
    console.log(`Deleted ${deletedMeasurements.count} measurements`);
    
    // Usuń wszystkie alerty
    const deletedAlerts = await prisma.alert.deleteMany({});
    console.log(`Deleted ${deletedAlerts.count} alerts`);
    
    // Usuń wszystkie stacje
    const deletedStations = await prisma.station.deleteMany({});
    console.log(`Deleted ${deletedStations.count} stations`);
    
    console.log('✅ Database cleared successfully!');
    
    // Sprawdź czy faktycznie puste
    const stationCount = await prisma.station.count();
    const measurementCount = await prisma.measurement.count();
    
    console.log(`\nVerification:`);
    console.log(`Stations remaining: ${stationCount}`);
    console.log(`Measurements remaining: ${measurementCount}`);
    
  } catch (error) {
    console.error('❌ Error clearing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase(); 