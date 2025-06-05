const { SmartDataService } = require('./lib/smart-data-service');

async function testSmartService() {
  try {
    console.log('🔍 Testing SmartDataService...');
    
    const smartStations = await SmartDataService.getSmartStationsData();
    console.log(`📊 SmartDataService returned ${smartStations.length} stations`);
    
    // Grupuj według źródła
    const sourceGroups = smartStations.reduce((acc, station) => {
      acc[station.source] = (acc[station.source] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nStations by source:');
    Object.entries(sourceGroups).forEach(([source, count]) => {
      console.log(`  ${source}: ${count} stations`);
    });
    
    // Sprawdź świeżość danych
    const freshnessGroups = smartStations.reduce((acc, station) => {
      acc[station.dataFreshness] = (acc[station.dataFreshness] || 0) + 1;
      return acc;
    }, {});
    
    console.log('\nData freshness:');
    Object.entries(freshnessGroups).forEach(([freshness, count]) => {
      console.log(`  ${freshness}: ${count} stations`);
    });
    
    // Pokaż przykładowe stacje
    console.log('\nSample stations:');
    smartStations.slice(0, 5).forEach(station => {
      console.log(`- ${station.id}: ${station.name} (${station.river}) - Source: ${station.source}, Fresh: ${station.dataFreshness}`);
    });
    
  } catch (error) {
    console.error('❌ Error testing SmartDataService:', error);
  }
}

testSmartService(); 