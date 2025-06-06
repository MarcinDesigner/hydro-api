#!/usr/bin/env node

/**
 * Skrypt do stworzenia mapowania historycznych station_id → UUID
 * Parsuje historyczne dane stations i tworzy mapowanie na istniejące UUID
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

console.log('🗺️  HYDRO API - Mapowanie Historycznych Stacji');
console.log('=' * 60);

// Funkcja do parsowania historycznych stacji z SQL
function parseHistoricalStations(filePath) {
    console.log('📖 Parsowanie historycznych stacji...');
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Znajdź INSERT INTO stations
    const stationsInsertRegex = /INSERT INTO `stations`[^(]*\(([^)]+)\)\s+VALUES\s*([\s\S]*?);/gi;
    
    let match;
    const historicalStations = [];
    
    while ((match = stationsInsertRegex.exec(content)) !== null) {
        const columnNames = match[1].split(',').map(col => col.trim().replace(/`/g, ''));
        const valuesString = match[2];
        
        console.log('📊 Kolumny w historycznej tabeli stations:');
        columnNames.forEach((col, index) => {
            console.log(`   ${index + 1}. ${col}`);
        });
        
        // Parsuj wartości
        const valueRegex = /\(([^)]+)\)/g;
        let valueMatch;
        
        while ((valueMatch = valueRegex.exec(valuesString)) !== null) {
            const values = parseValues(valueMatch[1]);
            
            // Mapuj na obiekt
            const station = {};
            columnNames.forEach((column, index) => {
                station[column] = values[index];
            });
            
            historicalStations.push(station);
        }
        
        break; // Bierzemy tylko pierwszy INSERT
    }
    
    console.log(`📋 Znaleziono ${historicalStations.length} historycznych stacji`);
    
    // Pokaż przykłady
    console.log('\n📊 Przykłady historycznych stacji:');
    historicalStations.slice(0, 10).forEach(station => {
        console.log(`   ID: ${station.id} → Code: ${station.station_code} (${station.station_name})`);
    });
    
    return historicalStations;
}

// Funkcja do parsowania wartości SQL
function parseValues(valueString) {
    const values = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';
    
    for (let i = 0; i < valueString.length; i++) {
        const char = valueString[i];
        
        if (!inQuotes && (char === "'" || char === '"')) {
            inQuotes = true;
            quoteChar = char;
        } else if (inQuotes && char === quoteChar) {
            if (valueString[i + 1] === quoteChar) {
                current += char;
                i++;
            } else {
                inQuotes = false;
                quoteChar = '';
            }
        } else if (!inQuotes && char === ',') {
            values.push(parseValue(current.trim()));
            current = '';
        } else {
            current += char;
        }
    }
    
    if (current.trim()) {
        values.push(parseValue(current.trim()));
    }
    
    return values;
}

function parseValue(value) {
    if (value === 'NULL') return null;
    if (value.startsWith("'") && value.endsWith("'")) {
        return value.slice(1, -1).replace(/''/g, "'");
    }
    if (value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1).replace(/""/g, '"');
    }
    if (/^\d+$/.test(value)) return parseInt(value);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
    return value;
}

// Główna funkcja mapowania
async function createHistoricalMapping() {
    try {
        const sqlFile = path.join(process.cwd(), 'deximstr_hydro.sql');
        
        if (!fs.existsSync(sqlFile)) {
            throw new Error('Plik deximstr_hydro.sql nie istnieje');
        }
        
        // 1. Parsuj historyczne stacje
        const historicalStations = parseHistoricalStations(sqlFile);
        
        // 2. Pobierz istniejące stacje z bazy
        console.log('\n🔌 Łączenie z bazą Supabase...');
        await prisma.$connect();
        console.log('✅ Połączono z bazą');
        
        const currentStations = await prisma.station.findMany({
            select: {
                id: true,           // UUID
                stationCode: true   // Kod stacji
            }
        });
        
        console.log(`📊 Znaleziono ${currentStations.length} stacji w obecnej bazie`);
        
        // 3. Stwórz mapowanie station_code → UUID
        const codeToUuidMap = {};
        currentStations.forEach(station => {
            codeToUuidMap[station.stationCode] = station.id;
        });
        
        // 4. Stwórz mapowanie historical_id → UUID
        const historicalIdToUuidMap = {};
        const historicalIdToCodeMap = {};
        let matchedStations = 0;
        let unmatchedStations = 0;
        
        historicalStations.forEach(historicalStation => {
            const historicalId = historicalStation.id;
            const stationCode = historicalStation.station_code;
            
            // Mapuj historical_id → station_code
            historicalIdToCodeMap[historicalId] = stationCode;
            
            // Sprawdź czy station_code istnieje w obecnej bazie
            const uuid = codeToUuidMap[stationCode];
            if (uuid) {
                historicalIdToUuidMap[historicalId] = uuid;
                matchedStations++;
            } else {
                unmatchedStations++;
                console.log(`⚠️  Nie znaleziono stacji ${stationCode} w obecnej bazie (historical_id: ${historicalId})`);
            }
        });
        
        // 5. Zapisz mapowania
        const historicalMappingFile = path.join(process.cwd(), 'historical-station-mapping.json');
        fs.writeFileSync(historicalMappingFile, JSON.stringify(historicalIdToUuidMap, null, 2));
        console.log(`💾 Zapisano mapowanie historyczne do: ${historicalMappingFile}`);
        
        const detailedMappingFile = path.join(process.cwd(), 'historical-station-mapping-detailed.json');
        const detailedMapping = historicalStations.map(station => ({
            historicalId: station.id,
            stationCode: station.station_code,
            stationName: station.station_name,
            uuid: historicalIdToUuidMap[station.id] || null,
            matched: !!historicalIdToUuidMap[station.id]
        }));
        fs.writeFileSync(detailedMappingFile, JSON.stringify(detailedMapping, null, 2));
        console.log(`💾 Zapisano szczegóły do: ${detailedMappingFile}`);
        
        // 6. Statystyki
        console.log('\n📈 Statystyki mapowania:');
        console.log(`   - Historyczne stacje: ${historicalStations.length}`);
        console.log(`   - Obecne stacje: ${currentStations.length}`);
        console.log(`   - Dopasowane: ${matchedStations}`);
        console.log(`   - Niedopasowane: ${unmatchedStations}`);
        console.log(`   - Procent dopasowania: ${((matchedStations / historicalStations.length) * 100).toFixed(1)}%`);
        
        // 7. Przykłady mapowania
        console.log('\n📊 Przykłady mapowania (pierwsze 10 dopasowanych):');
        const matchedExamples = detailedMapping.filter(s => s.matched).slice(0, 10);
        matchedExamples.forEach(station => {
            console.log(`   ${station.historicalId} → ${station.stationCode} → ${station.uuid} (${station.stationName})`);
        });
        
        return historicalIdToUuidMap;
        
    } catch (error) {
        console.error('❌ Błąd podczas tworzenia mapowania:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

// Funkcja testowa
async function testHistoricalMapping() {
    try {
        const mappingFile = path.join(process.cwd(), 'historical-station-mapping.json');
        
        if (!fs.existsSync(mappingFile)) {
            console.log('❌ Plik mapowania nie istnieje. Uruchom najpierw createHistoricalMapping()');
            return;
        }
        
        const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
        
        console.log('\n🧪 Test mapowania historycznego:');
        console.log(`📊 Załadowano ${Object.keys(mapping).length} mapowań`);
        
        // Test przykładowych pomiarów
        const testMeasurements = [
            { station_id: 1, water_level: 45 },
            { station_id: 2, water_level: 67 },
            { station_id: 3, water_level: 89 }
        ];
        
        console.log('\n📋 Test mapowania pomiarów:');
        testMeasurements.forEach(measurement => {
            const mappedUuid = mapping[measurement.station_id.toString()];
            if (mappedUuid) {
                console.log(`   ✅ station_id ${measurement.station_id} → ${mappedUuid}`);
            } else {
                console.log(`   ❌ station_id ${measurement.station_id} → NIE ZNALEZIONO`);
            }
        });
        
    } catch (error) {
        console.error('❌ Błąd podczas testowania mapowania:', error);
    }
}

// Główna funkcja
async function main() {
    const args = process.argv.slice(2);
    
    if (args.includes('--test')) {
        await testHistoricalMapping();
    } else {
        const mapping = await createHistoricalMapping();
        console.log('\n🎉 Mapowanie historyczne utworzone pomyślnie!');
        console.log('\n📋 Następne kroki:');
        console.log('1. Sprawdź plik historical-station-mapping.json');
        console.log('2. Uruchom test: node scripts/create-historical-mapping.js --test');
        console.log('3. Użyj mapowania w skrypcie importu pomiarów');
    }
}

if (require.main === module) {
    main();
}

module.exports = { createHistoricalMapping, testHistoricalMapping }; 