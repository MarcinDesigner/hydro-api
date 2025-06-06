#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSources() {
  try {
    console.log('📊 SPRAWDZANIE ŹRÓDEŁ DANYCH W BAZIE');
    console.log('=' * 40);
    
    await prisma.$connect();
    
    const sources = await prisma.measurement.groupBy({
      by: ['source'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } }
    });
    
    console.log('📊 ŹRÓDŁA DANYCH:');
    sources.forEach(s => {
      console.log(`   - ${s.source}: ${s._count.id.toLocaleString()} pomiarów`);
    });
    
    // Sprawdźmy też najstarsze i najnowsze pomiary dla każdego źródła
    console.log('\n📅 ZAKRESY DAT DLA KAŻDEGO ŹRÓDŁA:');
    for (const source of sources) {
      const dateRange = await prisma.measurement.aggregate({
        where: { source: source.source },
        _min: { measurementTimestamp: true },
        _max: { measurementTimestamp: true }
      });
      
      if (dateRange._min.measurementTimestamp && dateRange._max.measurementTimestamp) {
        console.log(`   - ${source.source}: ${dateRange._min.measurementTimestamp.toISOString().split('T')[0]} - ${dateRange._max.measurementTimestamp.toISOString().split('T')[0]}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Błąd:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSources(); 