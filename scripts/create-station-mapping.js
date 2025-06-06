#!/usr/bin/env node

/**
 * Skrypt do stworzenia mapowania station_code → UUID-like ID
 * Potrzebne do poprawnego importu historycznych pomiarów
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

console.log('🗺️  HYDRO API - Tworzenie Mapowania Stacji');
console.log('=' * 50);

async function createStationMapping() {
    try {
        console.log('🔌 Łączenie z bazą Supabase...');
        await prisma.$connect();
        console.log('✅ Połączono z bazą');

        // Pobieramy wszystkie stacje z bazy
        console.log('\n📊 Pobieranie wszystkich stacji...');
        const stations = await prisma.station.findMany({
            select: {
                id: true,           // UUID-like
                stationCode: true,  // Kod numeryczny
                stationName: true,
                _count: {
                    select: {
                        measurements: true
                    }
                }
            },
            orderBy: {
                stationCode: 'asc'
            }
        });

        console.log(`📋 Znaleziono ${stations.length} stacji w bazie`);

        // Tworzymy mapowanie station_code → UUID ID
        const mapping = {};
        const mappingArray = [];

        stations.forEach(station => {
            mapping[station.stationCode] = station.id;
            mappingArray.push({
                stationCode: station.stationCode,
                id: station.id,
                name: station.stationName,
                measurementsCount: station._count.measurements
            });
        });

        // Zapisujemy mapowanie do pliku JSON
        const mappingFile = path.join(process.cwd(), 'station-mapping.json');
        fs.writeFileSync(mappingFile, JSON.stringify(mapping, null, 2));
        console.log(`💾 Zapisano mapowanie do: ${mappingFile}`);

        // Zapisujemy szczegółowe informacje
        const detailedFile = path.join(process.cwd(), 'station-mapping-detailed.json');
        fs.writeFileSync(detailedFile, JSON.stringify(mappingArray, null, 2));
        console.log(`💾 Zapisano szczegóły do: ${detailedFile}`);

        // Wyświetlamy przykłady mapowania
        console.log('\n📊 Przykłady mapowania (pierwsze 10):');
        mappingArray.slice(0, 10).forEach(station => {
            console.log(`   ${station.stationCode} → ${station.id} (${station.name}) - ${station.measurementsCount} pomiarów`);
        });

        // Statystyki
        console.log('\n📈 Statystyki:');
        console.log(`   - Łączna liczba stacji: ${stations.length}`);
        console.log(`   - Stacje z pomiarami: ${stations.filter(s => s._count.measurements > 0).length}`);
        console.log(`   - Stacje bez pomiarów: ${stations.filter(s => s._count.measurements === 0).length}`);

        // Sprawdzamy przykładowe kody z historycznych danych
        const historicalCodes = ['149180130', '150210110', '150190080', '153200070', '150220080'];
        console.log('\n🔍 Sprawdzanie przykładowych kodów historycznych:');
        
        historicalCodes.forEach(code => {
            if (mapping[code]) {
                const station = mappingArray.find(s => s.stationCode === code);
                console.log(`   ✅ ${code} → ${mapping[code]} (${station.name})`);
            } else {
                console.log(`   ❌ ${code} → NIE ZNALEZIONO`);
            }
        });

        return mapping;

    } catch (error) {
        console.error('❌ Błąd podczas tworzenia mapowania:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Funkcja do testowania mapowania
async function testMapping() {
    try {
        const mappingFile = path.join(process.cwd(), 'station-mapping.json');
        
        if (!fs.existsSync(mappingFile)) {
            console.log('❌ Plik mapowania nie istnieje. Uruchom najpierw createStationMapping()');
            return;
        }

        const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
        
        console.log('\n🧪 Test mapowania:');
        console.log(`📊 Załadowano ${Object.keys(mapping).length} mapowań`);

        // Test przykładowego pomiaru
        const testMeasurement = {
            station_id: 149180130,  // Kod z historycznych danych
            water_level: 45,
            measurement_timestamp: '2018-02-12 10:10:00'
        };

        console.log('\n📋 Przykładowy pomiar historyczny:');
        console.log(`   station_id: ${testMeasurement.station_id}`);
        
        const mappedId = mapping[testMeasurement.station_id.toString()];
        if (mappedId) {
            console.log(`   ✅ Zmapowane na: ${mappedId}`);
            
            // Sprawdzamy czy stacja istnieje
            await prisma.$connect();
            const station = await prisma.station.findUnique({
                where: { id: mappedId },
                select: { id: true, stationName: true, stationCode: true }
            });
            
            if (station) {
                console.log(`   ✅ Stacja istnieje: ${station.stationName} (${station.stationCode})`);
            } else {
                console.log(`   ❌ Stacja nie istnieje w bazie`);
            }
            
            await prisma.$disconnect();
        } else {
            console.log(`   ❌ Nie znaleziono mapowania dla kodu ${testMeasurement.station_id}`);
        }

    } catch (error) {
        console.error('❌ Błąd podczas testowania mapowania:', error);
    }
}

// Główna funkcja
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--test')) {
        await testMapping();
    } else {
        const mapping = await createStationMapping();
        console.log('\n🎉 Mapowanie utworzone pomyślnie!');
        console.log('\n📋 Następne kroki:');
        console.log('1. Sprawdź plik station-mapping.json');
        console.log('2. Uruchom test: node scripts/create-station-mapping.js --test');
        console.log('3. Użyj mapowania w skrypcie importu');
    }
}

if (require.main === module) {
    main();
}

module.exports = { createStationMapping, testMapping }; 