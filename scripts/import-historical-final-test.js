#!/usr/bin/env node

/**
 * FINALNY test importu historycznych danych
 * Używa poprawnego mapowania historical_station_id → UUID
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

console.log('🎯 HYDRO API - FINALNY Test Importu Historycznych Danych');
console.log('=' * 70);

// Konfiguracja testowa
const CONFIG = {
    maxRecordsPerTable: 100,  // Zwiększamy dla lepszego testu
    batchSize: 50,            
    maxRetries: 3,
    delayBetweenBatches: 300,
    dryRun: false,
    testMode: true
};

// Ładowanie mapowania historycznych stacji
function loadHistoricalMapping() {
    const mappingFile = path.join(process.cwd(), 'historical-station-mapping.json');
    
    if (!fs.existsSync(mappingFile)) {
        throw new Error('Plik mapowania nie istnieje. Uruchom najpierw: node scripts/create-historical-mapping.js');
    }
    
    const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
    console.log(`🗺️  Załadowano mapowanie dla ${Object.keys(mapping).length} historycznych stacji`);
    
    return mapping;
}

// Funkcja do parsowania pliku SQL (ulepszona wersja)
function parseSQLFileTest(filePath) {
    console.log('📖 Czytanie pliku SQL (tryb testowy)...');
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`Plik nie istnieje: ${filePath}`);
    }

    // Czytamy większy fragment dla lepszego testu
    const buffer = Buffer.alloc(15 * 1024 * 1024); // 15MB
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    
    const content = buffer.toString('utf8', 0, bytesRead);
    const fileSize = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    
    console.log(`📊 Rozmiar pliku: ${fileSize} MB (czytam pierwsze 15MB)`);
    
    // Wyodrębniamy dane INSERT dla measurements
    const insertRegex = /INSERT INTO `measurements`[^(]*\(([^)]+)\)\s+VALUES\s*([\s\S]*?);/gi;
    const data = {};
    
    let match;
    let totalRecords = 0;
    
    while ((match = insertRegex.exec(content)) !== null && totalRecords < CONFIG.maxRecordsPerTable) {
        const tableName = 'measurements';
        const columnNames = match[1].split(',').map(col => col.trim().replace(/`/g, ''));
        const valuesString = match[2];
        
        if (!data[tableName]) {
            data[tableName] = { columns: columnNames, rows: [] };
            console.log('📊 Kolumny w tabeli measurements:');
            columnNames.forEach((col, index) => {
                console.log(`   ${index + 1}. ${col}`);
            });
        }
        
        // Parsujemy wartości
        const valueRegex = /\(([^)]+)\)/g;
        let valueMatch;
        
        while ((valueMatch = valueRegex.exec(valuesString)) !== null && totalRecords < CONFIG.maxRecordsPerTable) {
            const values = parseValues(valueMatch[1]);
            data[tableName].rows.push(values);
            totalRecords++;
        }
        
        if (totalRecords >= CONFIG.maxRecordsPerTable) {
            console.log(`⚠️  Ograniczono do ${CONFIG.maxRecordsPerTable} rekordów (tryb testowy)`);
            break;
        }
    }
    
    Object.entries(data).forEach(([tableName, tableData]) => {
        console.log(`📥 Tabela ${tableName}: ${tableData.rows.length} rekordów (test)`);
    });
    
    return { data };
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

// FINALNA funkcja mapowania pomiarów z historycznym mapowaniem
function mapMeasurementData(row, columns, historicalMapping) {
    const columnMap = {
        // 'id': 'id',  // USUNIĘTE - Prisma automatycznie wygeneruje UUID
        'station_id': 'stationId',
        'measurement_timestamp': 'measurementTimestamp',
        'water_level': 'waterLevel',
        'flow_rate': 'flowRate',
        'temperature': 'temperature',
        'source': 'source',
        'created_at': 'createdAt'
    };
    
    const mapped = {};
    columns.forEach((column, index) => {
        const prismaField = columnMap[column];
        if (prismaField && row[index] !== undefined) {
            let value = row[index];
            
            if (column.includes('timestamp') || column.includes('_at')) {
                value = value ? new Date(value) : new Date();
            } else if (['water_level'].includes(column)) {
                value = value ? parseInt(value) : null;
            } else if (['flow_rate', 'temperature'].includes(column)) {
                value = value ? parseFloat(value) : null;
            }
            
            mapped[prismaField] = value;
        }
    });
    
    if (!mapped.source) {
        mapped.source = 'historical_final_test';
    }
    
    // KLUCZOWE: Używamy mapowania historical_station_id → UUID
    if (mapped.stationId) {
        const historicalStationId = mapped.stationId.toString();
        const mappedUuid = historicalMapping[historicalStationId];
        
        if (mappedUuid) {
            mapped.stationId = mappedUuid;
            // Logujemy tylko pierwsze kilka dla czytelności
            if (parseInt(historicalStationId) <= 5) {
                console.log(`🔄 Zmapowano: historical_id ${historicalStationId} → ${mappedUuid}`);
            }
        } else {
            console.log(`⚠️  Nie znaleziono mapowania dla historical_station_id: ${historicalStationId}`);
            return null; // Pomijamy pomiary dla nieznanych stacji
        }
    }
    
    return mapped;
}

// Funkcja do importu w partiach (finalna wersja)
async function importMeasurementsFinalTest(data, historicalMapping) {
    const { columns, rows } = data;
    const totalRows = Math.min(rows.length, CONFIG.maxRecordsPerTable);
    
    console.log(`\n📥 FINALNY test importu pomiarów: ${totalRows} rekordów`);
    
    let imported = 0;
    let failed = 0;
    let skipped = 0;
    const stationStats = {};
    
    for (let i = 0; i < totalRows; i += CONFIG.batchSize) {
        const batch = rows.slice(i, i + CONFIG.batchSize);
        const mappedBatch = [];
        
        // Mapujemy każdy rekord
        for (const row of batch) {
            const mapped = mapMeasurementData(row, columns, historicalMapping);
            if (mapped) {
                mappedBatch.push(mapped);
                
                // Statystyki stacji
                const stationId = mapped.stationId;
                stationStats[stationId] = (stationStats[stationId] || 0) + 1;
            } else {
                skipped++;
            }
        }
        
        if (mappedBatch.length === 0) {
            console.log(`⚠️  Partia ${Math.floor(i / CONFIG.batchSize) + 1}: Wszystkie rekordy pominięte`);
            continue;
        }
        
        try {
            await prisma.measurement.createMany({
                data: mappedBatch,
                skipDuplicates: true
            });
            
            imported += mappedBatch.length;
            console.log(`✅ Partia ${Math.floor(i / CONFIG.batchSize) + 1}: ${mappedBatch.length} rekordów zaimportowanych`);
            
        } catch (error) {
            console.error(`❌ Błąd w partii ${Math.floor(i / CONFIG.batchSize) + 1}:`, error.message);
            failed += mappedBatch.length;
        }
        
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
    }
    
    return { success: imported, failed, skipped, stationStats };
}

// Główna funkcja testowa
async function mainFinalTest() {
    try {
        const sqlFile = path.join(process.cwd(), 'deximstr_hydro.sql');
        
        console.log(`📁 Plik SQL: ${sqlFile}`);
        console.log(`⚙️  Konfiguracja testowa: max=${CONFIG.maxRecordsPerTable}, batch=${CONFIG.batchSize}\n`);
        
        // 1. Ładujemy mapowanie historycznych stacji
        const historicalMapping = loadHistoricalMapping();
        
        // 2. Parsujemy plik SQL
        const { data } = parseSQLFileTest(sqlFile);
        
        // 3. Sprawdzamy połączenie z bazą
        console.log('\n🔌 Sprawdzanie połączenia z bazą...');
        await prisma.$connect();
        console.log('✅ Połączono z Supabase');
        
        // 4. Zapisujemy stan przed testem
        const beforeStats = await prisma.measurement.count();
        const beforeHistoricalCount = await prisma.measurement.count({
            where: { source: 'historical_final_test' }
        });
        console.log(`📊 Pomiary przed testem: ${beforeStats} (historyczne testowe: ${beforeHistoricalCount})`);
        
        // 5. Import pomiarów (finalny test)
        if (data.measurements) {
            const measurementResult = await importMeasurementsFinalTest(data.measurements, historicalMapping);
            
            console.log(`\n📊 WYNIKI FINALNEGO TESTU:`);
            console.log(`   - ✅ Sukces: ${measurementResult.success}`);
            console.log(`   - ❌ Błędy: ${measurementResult.failed}`);
            console.log(`   - ⚠️  Pominięte: ${measurementResult.skipped}`);
            
            // Statystyki stacji
            const stationCount = Object.keys(measurementResult.stationStats).length;
            console.log(`   - 🏭 Stacje z danymi: ${stationCount}`);
            
            if (stationCount > 0) {
                console.log('\n📊 Top 5 stacji z największą liczbą pomiarów:');
                const topStations = Object.entries(measurementResult.stationStats)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5);
                
                for (const [stationId, count] of topStations) {
                    const station = await prisma.station.findUnique({
                        where: { id: stationId },
                        select: { stationName: true, stationCode: true }
                    });
                    console.log(`   - ${station?.stationName || 'Unknown'} (${station?.stationCode || stationId}): ${count} pomiarów`);
                }
            }
        }
        
        // 6. Sprawdzamy stan po teście
        const afterStats = await prisma.measurement.count();
        const afterHistoricalCount = await prisma.measurement.count({
            where: { source: 'historical_final_test' }
        });
        console.log(`\n📊 Pomiary po teście: ${afterStats} (+${afterStats - beforeStats})`);
        console.log(`📊 Historyczne testowe: ${afterHistoricalCount}`);
        
        if (afterStats > beforeStats) {
            console.log('\n🎉 FINALNY TEST ZAKOŃCZONY SUKCESEM! 🎉');
            console.log('✅ Historyczne dane zostały poprawnie zaimportowane');
            
            // Sprawdzamy przykładowy zaimportowany pomiar
            const sampleMeasurement = await prisma.measurement.findFirst({
                where: { source: 'historical_final_test' },
                include: {
                    station: {
                        select: { stationName: true, stationCode: true }
                    }
                },
                orderBy: { measurementTimestamp: 'asc' }
            });
            
            if (sampleMeasurement) {
                console.log('\n📋 Przykładowy zaimportowany pomiar:');
                console.log(`   - Stacja: ${sampleMeasurement.station.stationName} (${sampleMeasurement.station.stationCode})`);
                console.log(`   - Poziom wody: ${sampleMeasurement.waterLevel} cm`);
                console.log(`   - Data: ${sampleMeasurement.measurementTimestamp}`);
                console.log(`   - Źródło: ${sampleMeasurement.source}`);
            }
            
            console.log('\n🚀 GOTOWE DO PEŁNEGO IMPORTU!');
            console.log('📋 Następne kroki:');
            console.log('1. ✅ Test przeszedł pomyślnie');
            console.log('2. 🔄 Uruchom pełny import (bez limitu rekordów)');
            console.log('3. 🌐 Przetestuj API endpoints z historycznymi danymi');
            console.log('4. 📊 Sprawdź endpoint /api/stations/[id]/history');
            
        } else {
            console.log('\n⚠️  FINALNY TEST - brak nowych danych');
            console.log('Sprawdź logi powyżej aby zdiagnozować problem');
        }
        
    } catch (error) {
        console.error('❌ Błąd podczas finalnego testu importu:', error);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    mainFinalTest();
}

module.exports = { parseSQLFileTest, mapMeasurementData, importMeasurementsFinalTest }; 