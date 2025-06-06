#!/usr/bin/env node

/**
 * PEŁNY IMPORT historycznych danych hydrologicznych
 * Import wszystkich ~608,653 pomiarów z pliku deximstr_hydro.sql
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

console.log('🚀 HYDRO API - PEŁNY IMPORT HISTORYCZNYCH DANYCH');
console.log('=' * 80);

// Konfiguracja produkcyjna
const CONFIG = {
    batchSize: 1000,           // Większe partie dla wydajności
    maxRetries: 5,
    delayBetweenBatches: 500,  // Krótsze opóźnienia
    dryRun: false,
    logEveryNBatches: 10       // Loguj co 10 partii
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

// Funkcja do parsowania pełnego pliku SQL
function parseSQLFileFull(filePath) {
    console.log('📖 Czytanie pełnego pliku SQL...');
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`Plik nie istnieje: ${filePath}`);
    }

    const fileSize = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    console.log(`📊 Rozmiar pliku: ${fileSize} MB`);
    console.log('⏳ Czytanie całego pliku do pamięci...');
    
    const content = fs.readFileSync(filePath, 'utf8');
    console.log('✅ Plik załadowany do pamięci');
    
    // Wyodrębniamy dane INSERT dla measurements
    console.log('🔍 Szukanie INSERT statements dla measurements...');
    const insertRegex = /INSERT INTO `measurements`[^(]*\(([^)]+)\)\s+VALUES\s*([\s\S]*?);/gi;
    const data = {};
    
    let match;
    let totalRecords = 0;
    let insertCount = 0;
    
    while ((match = insertRegex.exec(content)) !== null) {
        insertCount++;
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
        let recordsInThisInsert = 0;
        
        while ((valueMatch = valueRegex.exec(valuesString)) !== null) {
            const values = parseValues(valueMatch[1]);
            data[tableName].rows.push(values);
            totalRecords++;
            recordsInThisInsert++;
        }
        
        if (insertCount % 100 === 0) {
            console.log(`📥 Przetworzono ${insertCount} INSERT statements, ${totalRecords} rekordów...`);
        }
    }
    
    console.log(`📥 Znaleziono ${insertCount} INSERT statements`);
    console.log(`📊 Łącznie rekordów: ${totalRecords}`);
    
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

// Funkcja mapowania pomiarów (produkcyjna wersja)
function mapMeasurementData(row, columns, historicalMapping) {
    const columnMap = {
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
        mapped.source = 'historical';
    }
    
    // Mapowanie historical_station_id → UUID
    if (mapped.stationId) {
        const historicalStationId = mapped.stationId.toString();
        const mappedUuid = historicalMapping[historicalStationId];
        
        if (mappedUuid) {
            mapped.stationId = mappedUuid;
        } else {
            return null; // Pomijamy pomiary dla nieznanych stacji
        }
    }
    
    return mapped;
}

// Funkcja do pełnego importu w partiach
async function importMeasurementsFull(data, historicalMapping) {
    const { columns, rows } = data;
    const totalRows = rows.length;
    
    console.log(`\n🚀 ROZPOCZYNAM PEŁNY IMPORT: ${totalRows.toLocaleString()} rekordów`);
    console.log(`📦 Rozmiar partii: ${CONFIG.batchSize}`);
    console.log(`⏱️  Szacowany czas: ${Math.ceil(totalRows / CONFIG.batchSize * CONFIG.delayBetweenBatches / 1000 / 60)} minut\n`);
    
    let imported = 0;
    let failed = 0;
    let skipped = 0;
    const stationStats = {};
    const startTime = Date.now();
    
    const totalBatches = Math.ceil(totalRows / CONFIG.batchSize);
    
    for (let i = 0; i < totalRows; i += CONFIG.batchSize) {
        const batchNumber = Math.floor(i / CONFIG.batchSize) + 1;
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
            if (batchNumber % CONFIG.logEveryNBatches === 0) {
                console.log(`⚠️  Partia ${batchNumber}/${totalBatches}: Wszystkie rekordy pominięte`);
            }
            continue;
        }
        
        let retryCount = 0;
        let success = false;
        
        while (retryCount < CONFIG.maxRetries && !success) {
            try {
                await prisma.measurement.createMany({
                    data: mappedBatch,
                    skipDuplicates: true
                });
                
                imported += mappedBatch.length;
                success = true;
                
                // Loguj co N partii lub na końcu
                if (batchNumber % CONFIG.logEveryNBatches === 0 || batchNumber === totalBatches) {
                    const progress = ((batchNumber / totalBatches) * 100).toFixed(1);
                    const elapsed = (Date.now() - startTime) / 1000 / 60;
                    const eta = elapsed / (batchNumber / totalBatches) - elapsed;
                    
                    console.log(`✅ Partia ${batchNumber}/${totalBatches} (${progress}%) - ${mappedBatch.length} rekordów | ETA: ${eta.toFixed(1)}min`);
                }
                
            } catch (error) {
                retryCount++;
                console.error(`❌ Błąd w partii ${batchNumber} (próba ${retryCount}/${CONFIG.maxRetries}):`, error.message);
                
                if (retryCount >= CONFIG.maxRetries) {
                    failed += mappedBatch.length;
                    console.error(`💥 Partia ${batchNumber} ostatecznie nieudana po ${CONFIG.maxRetries} próbach`);
                } else {
                    await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches * retryCount));
                }
            }
        }
        
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
    }
    
    const totalTime = (Date.now() - startTime) / 1000 / 60;
    
    return { success: imported, failed, skipped, stationStats, totalTime };
}

// Główna funkcja pełnego importu
async function mainFullImport() {
    try {
        const sqlFile = path.join(process.cwd(), 'deximstr_hydro.sql');
        
        console.log(`📁 Plik SQL: ${sqlFile}`);
        console.log(`⚙️  Konfiguracja: batch=${CONFIG.batchSize}, retry=${CONFIG.maxRetries}, delay=${CONFIG.delayBetweenBatches}ms\n`);
        
        // 1. Ładujemy mapowanie historycznych stacji
        const historicalMapping = loadHistoricalMapping();
        
        // 2. Parsujemy pełny plik SQL
        console.log('\n🔄 ETAP 1: Parsowanie pliku SQL');
        const { data } = parseSQLFileFull(sqlFile);
        
        // 3. Sprawdzamy połączenie z bazą
        console.log('\n🔄 ETAP 2: Połączenie z bazą danych');
        await prisma.$connect();
        console.log('✅ Połączono z Supabase');
        
        // 4. Zapisujemy stan przed importem
        const beforeStats = await prisma.measurement.count();
        const beforeHistoricalCount = await prisma.measurement.count({
            where: { source: 'historical' }
        });
        console.log(`📊 Pomiary przed importem: ${beforeStats.toLocaleString()} (historyczne: ${beforeHistoricalCount.toLocaleString()})`);
        
        // 5. PEŁNY IMPORT
        console.log('\n🔄 ETAP 3: PEŁNY IMPORT DANYCH');
        if (data.measurements) {
            const measurementResult = await importMeasurementsFull(data.measurements, historicalMapping);
            
            console.log(`\n🎉 WYNIKI PEŁNEGO IMPORTU:`);
            console.log(`   - ✅ Sukces: ${measurementResult.success.toLocaleString()} rekordów`);
            console.log(`   - ❌ Błędy: ${measurementResult.failed.toLocaleString()} rekordów`);
            console.log(`   - ⚠️  Pominięte: ${measurementResult.skipped.toLocaleString()} rekordów`);
            console.log(`   - 🏭 Stacje z danymi: ${Object.keys(measurementResult.stationStats).length}`);
            console.log(`   - ⏱️  Czas importu: ${measurementResult.totalTime.toFixed(1)} minut`);
            
            // Top 10 stacji z największą liczbą pomiarów
            if (Object.keys(measurementResult.stationStats).length > 0) {
                console.log('\n📊 Top 10 stacji z największą liczbą historycznych pomiarów:');
                const topStations = Object.entries(measurementResult.stationStats)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 10);
                
                for (const [stationId, count] of topStations) {
                    const station = await prisma.station.findUnique({
                        where: { id: stationId },
                        select: { stationName: true, stationCode: true }
                    });
                    console.log(`   - ${station?.stationName || 'Unknown'} (${station?.stationCode || stationId}): ${count.toLocaleString()} pomiarów`);
                }
            }
        }
        
        // 6. Sprawdzamy stan po imporcie
        const afterStats = await prisma.measurement.count();
        const afterHistoricalCount = await prisma.measurement.count({
            where: { source: 'historical' }
        });
        
        console.log(`\n📊 FINALNE STATYSTYKI:`);
        console.log(`   - Pomiary po imporcie: ${afterStats.toLocaleString()} (+${(afterStats - beforeStats).toLocaleString()})`);
        console.log(`   - Historyczne pomiary: ${afterHistoricalCount.toLocaleString()}`);
        
        if (afterStats > beforeStats) {
            console.log('\n🎉🎉🎉 PEŁNY IMPORT ZAKOŃCZONY SUKCESEM! 🎉🎉🎉');
            console.log('✅ Historyczne dane hydrologiczne zostały zaimportowane do bazy Supabase');
            
            // Sprawdzamy zakres dat
            const dateRange = await prisma.measurement.aggregate({
                where: { source: 'historical' },
                _min: { measurementTimestamp: true },
                _max: { measurementTimestamp: true }
            });
            
            if (dateRange._min.measurementTimestamp && dateRange._max.measurementTimestamp) {
                console.log(`📅 Zakres historycznych danych: ${dateRange._min.measurementTimestamp.toISOString().split('T')[0]} - ${dateRange._max.measurementTimestamp.toISOString().split('T')[0]}`);
            }
            
            console.log('\n🚀 SYSTEM GOTOWY DO UŻYCIA!');
            console.log('📋 Możesz teraz:');
            console.log('1. 🌐 Testować API endpoints z historycznymi danymi');
            console.log('2. 📊 Używać endpoint /api/stations/[id]/history');
            console.log('3. 📈 Analizować długoterminowe trendy hydrologiczne');
            console.log('4. 🔍 Porównywać dane historyczne z bieżącymi');
            
        } else {
            console.log('\n⚠️  PEŁNY IMPORT - brak nowych danych');
            console.log('Sprawdź logi powyżej aby zdiagnozować problem');
        }
        
    } catch (error) {
        console.error('❌ Błąd podczas pełnego importu:', error);
        console.error('Stack trace:', error.stack);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    mainFullImport();
}

module.exports = { parseSQLFileFull, mapMeasurementData, importMeasurementsFull }; 