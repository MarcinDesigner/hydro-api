#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkMeasurements() {
    try {
        console.log('🔍 Sprawdzanie pomiarów w bazie Supabase...\n');

        // Sprawdzamy liczbę pomiarów
        const measurementCount = await prisma.measurement.count();
        console.log(`📊 Łączna liczba pomiarów: ${measurementCount}`);

        if (measurementCount === 0) {
            console.log('❌ Brak pomiarów w bazie - dane historyczne nie zostały zaimportowane');
            return;
        }

        // Sprawdzamy najstarszy i najnowszy pomiar
        const [oldest, newest] = await Promise.all([
            prisma.measurement.findFirst({
                orderBy: { measurementTimestamp: 'asc' },
                select: { measurementTimestamp: true, source: true }
            }),
            prisma.measurement.findFirst({
                orderBy: { measurementTimestamp: 'desc' },
                select: { measurementTimestamp: true, source: true }
            })
        ]);

        console.log(`📅 Najstarszy pomiar: ${oldest?.measurementTimestamp} (${oldest?.source})`);
        console.log(`📅 Najnowszy pomiar: ${newest?.measurementTimestamp} (${newest?.source})`);

        // Sprawdzamy źródła danych
        const sources = await prisma.measurement.groupBy({
            by: ['source'],
            _count: { source: true }
        });

        console.log('\n📋 Źródła danych:');
        sources.forEach(source => {
            console.log(`   - ${source.source}: ${source._count.source} pomiarów`);
        });

        // Sprawdzamy przykładowe stacje z pomiarami
        const stationsWithMeasurements = await prisma.station.findMany({
            where: {
                measurements: {
                    some: {}
                }
            },
            take: 5,
            select: {
                stationCode: true,
                stationName: true,
                _count: {
                    select: { measurements: true }
                }
            }
        });

        console.log('\n🏭 Przykładowe stacje z pomiarami:');
        stationsWithMeasurements.forEach(station => {
            console.log(`   - ${station.stationCode} (${station.stationName}): ${station._count.measurements} pomiarów`);
        });

        // Sprawdzamy czy są pomiary historyczne (starsze niż 30 dni)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const historicalCount = await prisma.measurement.count({
            where: {
                measurementTimestamp: {
                    lt: thirtyDaysAgo
                }
            }
        });

        console.log(`\n📈 Pomiary historyczne (starsze niż 30 dni): ${historicalCount}`);

        if (historicalCount > 0) {
            console.log('✅ Dane historyczne są dostępne w bazie!');
        } else {
            console.log('⚠️  Brak danych historycznych - tylko bieżące pomiary z IMGW API');
        }

    } catch (error) {
        console.error('❌ Błąd:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkMeasurements(); 