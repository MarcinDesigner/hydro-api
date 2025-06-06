const { PrismaClient } = require('@prisma/client');

async function checkAlarmLevels() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🔍 Checking alarm levels in database...');
    
    // Sprawdź stacje z poziomami alarmowymi
    const stationsWithLevels = await prisma.station.findMany({
      where: {
        AND: [
          { warningLevel: { not: null } },
          { alarmLevel: { not: null } }
        ]
      },
      select: {
        stationCode: true,
        stationName: true,
        riverName: true,
        warningLevel: true,
        alarmLevel: true,
      },
      take: 10
    });
    
    console.log('\nStations WITH alarm levels:');
    stationsWithLevels.forEach(station => {
      console.log(`- ${station.stationCode}: ${station.stationName}`);
      console.log(`  River: ${station.riverName || 'null'}`);
      console.log(`  Warning Level: ${station.warningLevel}`);
      console.log(`  Alarm Level: ${station.alarmLevel}`);
      console.log('');
    });
    
    // Sprawdź ile stacji ma ustawione poziomy alarmowe
    const [totalStations, withWarning, withAlarm, withBoth] = await Promise.all([
      prisma.station.count(),
      prisma.station.count({ where: { warningLevel: { not: null } } }),
      prisma.station.count({ where: { alarmLevel: { not: null } } }),
      prisma.station.count({ 
        where: { 
          AND: [
            { warningLevel: { not: null } },
            { alarmLevel: { not: null } }
          ]
        } 
      })
    ]);
    
    console.log(`\nAlarm levels statistics:`);
    console.log(`Total stations: ${totalStations}`);
    console.log(`With warning level: ${withWarning}`);
    console.log(`With alarm level: ${withAlarm}`);
    console.log(`With both levels: ${withBoth}`);
    
  } catch (error) {
    console.error('❌ Error checking alarm levels:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAlarmLevels(); 