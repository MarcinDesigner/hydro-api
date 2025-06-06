#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkHistoricalImport() {
  try {
    console.log('🎉 SPRAWDZANIE WYNIKÓW IMPORTU HISTORYCZNYCH DANYCH');
    console.log('=' * 60);
    
    await prisma.$connect();
    
    // Liczba historycznych pomiarów
    const historicalCount = await prisma.measurement.count({
      where: { source: 'historical' }
    });
    
    // Liczba testowych pomiarów
    const testCount = await prisma.measurement.count({
      where: { source: 'historical_final_test' }
    });
    
    // Łączna liczba pomiarów
    const totalCount = await prisma.measurement.count();
    
    // Zakres dat historycznych
    const dateRange = await prisma.measurement.aggregate({
      where: { source: 'historical' },
      _min: { measurementTimestamp: true },
      _max: { measurementTimestamp: true }
    });
    
    // Top 10 stacji z historycznymi danymi
    const topStations = await prisma.measurement.groupBy({
      by: ['stationId'],
      where: { source: 'historical' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10
    });
    
    console.log('📊 STATYSTYKI IMPORTU:');
    console.log(`   - Historyczne pomiary: ${historicalCount.toLocaleString()}`);
    console.log(`   - Testowe pomiary: ${testCount.toLocaleString()}`);
    console.log(`   - Łączne pomiary: ${totalCount.toLocaleString()}`);
    console.log(`   - Procent historycznych: ${((historicalCount/totalCount)*100).toFixed(1)}%`);
    
    if (dateRange._min.measurementTimestamp && dateRange._max.measurementTimestamp) {
      console.log(`📅 Zakres historycznych danych: ${dateRange._min.measurementTimestamp.toISOString().split('T')[0]} - ${dateRange._max.measurementTimestamp.toISOString().split('T')[0]}`);
    }
    
    console.log('\n📊 TOP 10 STACJI Z HISTORYCZNYMI DANYMI:');
    for (const stationData of topStations) {
      const station = await prisma.station.findUnique({
        where: { id: stationData.stationId },
        select: { stationName: true, stationCode: true }
      });
      console.log(`   - ${station?.stationName || 'Unknown'} (${station?.stationCode || stationData.stationId}): ${stationData._count.id.toLocaleString()} pomiarów`);
    }
    
    // Sprawdzenie czy import się udał
    if (historicalCount > 0) {
      console.log('\n🎉🎉🎉 IMPORT HISTORYCZNYCH DANYCH ZAKOŃCZONY SUKCESEM! 🎉🎉🎉');
      console.log('✅ Historyczne dane hydrologiczne zostały zaimportowane do bazy Supabase');
      
      console.log('\n🚀 SYSTEM GOTOWY DO UŻYCIA!');
      console.log('📋 Możesz teraz:');
      console.log('1. 🌐 Testować API endpoints z historycznymi danymi');
      console.log('2. 📊 Używać endpoint /api/stations/[id]/history');
      console.log('3. 📈 Analizować długoterminowe trendy hydrologiczne');
      console.log('4. 🔍 Porównywać dane historyczne z bieżącymi');
    } else {
      console.log('\n⚠️  Brak historycznych danych - sprawdź logi importu');
    }
    
  } catch (error) {
    console.error('❌ Błąd podczas sprawdzania:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkHistoricalImport(); 