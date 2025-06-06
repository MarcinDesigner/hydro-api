#!/usr/bin/env node

/**
 * Poprawiony testowy skrypt importu historycznych danych
 * Używa mapowania station_code → UUID-like ID
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

console.log('🧪 HYDRO API - Test Importu z Mapowaniem');
console.log('=' * 60);

// Konfiguracja testowa
const CONFIG = {
    maxRecordsPerTable: 50,   // Jeszcze mniej dla testu
    batchSize: 25,            // Mniejsze partie
    maxRetries: 3,
    delayBetweenBatches: 200,
    dryRun: false,
    testMode: true
};

// Ładowanie mapowania stacji
function loadStationMapping() {
    const mappingFile = path.join(process.cwd(), 'station-mapping.json');
    
    if (!fs.existsSync(mappingFile)) {
        throw new Error('Plik mapowania nie istnieje. Uruchom najpierw: node scripts/create-station-mapping.js');
    }
    
    const mapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
    console.log(`🗺️  Załadowano mapowanie dla ${Object.keys(mapping).length} stacji`);
    
    return mapping;
}

// Funkcja do parsowania pliku SQL (ograniczona wersja)
function parseSQLFileTest(filePath) {
    console.log('📖 Czytanie pliku SQL (tryb testowy)...');
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`Plik nie istnieje: ${filePath}`);
    }

    // Czytamy tylko pierwsze 10MB pliku dla testu
    const buffer = Buffer.alloc(10 * 1024 * 1024);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    
    const content = buffer.toString('utf8', 0, bytesRead);
    const fileSize = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    
    console.log(`📊 Rozmiar pliku: ${fileSize} MB (czytam pierwsze 10MB)`);
    
    // Wyodrębniamy dane INSERT (ograniczone)
    const insertRegex = /INSERT INTO `measurements`[^(]*\(([^)]+)\)\s+VALUES\s*([\s\S]*?);/gi;
    const data = {};
    
    let match;
    while ((match = insertRegex.exec(content)) !== null) {
        const tableName = 'measurements';
        const columnNames = match[1].split(',').map(col => col.trim().replace(/`/g, ''));
        const valuesString = match[2];
        
        if (!data[tableName]) {
            data[tableName] = { columns: columnNames, rows: [] };
        }
        
        // Parsujemy wartości (ograniczone do CONFIG.maxRecordsPerTable)
        const valueRegex = /\(([^)]+)\)/g;
        let valueMatch;
        let recordCount = 0;
        
        while ((valueMatch = valueRegex.exec(valuesString)) !== null && recordCount < CONFIG.maxRecordsPerTable) {
            const values = parseValues(valueMatch[1]);
            data[tableName].rows.push(values);
            recordCount++;
        }
        
        if (recordCount >= CONFIG.maxRecordsPerTable) {
            console.log(`⚠️  Ograniczono tabelę ${tableName} do ${CONFIG.maxRecordsPerTable} rekordów (tryb testowy)`);
            break; // Przerywamy po pierwszym INSERT
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

// Poprawiona funkcja mapowania pomiarów z użyciem mapowania stacji
function mapMeasurementData(row, columns, stationMapping) {
    const columnMap = {
        'id': 'id',
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
        mapped.source = 'historical_test';
    }
    
    // KLUCZOWA ZMIANA: Używamy mapowania station_code → UUID
    if (mapped.stationId) {
        const originalStationId = mapped.stationId.toString();
        const mappedStationId = stationMapping[originalStationId];
        
        if (mappedStationId) {
            mapped.stationId = mappedStationId;
            console.log(`🔄 Zmapowano stację: ${originalStationId} → ${mappedStationId}`);
        } else {
            console.log(`⚠️  Nie znaleziono mapowania dla stacji: ${originalStationId}`);
            return null; // Pomijamy pomiary dla nieznanych stacji
        }
    }
    
    return mapped;
}

// Funkcja do importu w partiach (testowa wersja z mapowaniem)
async function importMeasurementsTest(data, stationMapping) {
    const { columns, rows } = data;
    const totalRows = Math.min(rows.length, CONFIG.maxRecordsPerTable);
    
    console.log(`\n📥 Test importu pomiarów: ${totalRows} rekordów`);
    
    let imported = 0;
    let failed = 0;
    let skipped = 0;
    
    for (let i = 0; i < totalRows; i += CONFIG.batchSize) {
        const batch = rows.slice(i, i + CONFIG.batchSize);
        const mappedBatch = [];
        
        // Mapujemy każdy rekord
        for (const row of batch) {
            const mapped = mapMeasurementData(row, columns, stationMapping);
            if (mapped) {
                mappedBatch.push(mapped);
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
    
    return { success: imported, failed, skipped };
}

// Główna funkcja testowa
async function mainTest() {
    try {
        const sqlFile = path.join(process.cwd(), 'deximstr_hydro.sql');
        
        console.log(`📁 Plik SQL: ${sqlFile}`);
        console.log(`⚙️  Konfiguracja testowa: max=${CONFIG.maxRecordsPerTable}, batch=${CONFIG.batchSize}\n`);
        
        // 1. Ładujemy mapowanie stacji
        const stationMapping = loadStationMapping();
        
        // 2. Parsujemy plik SQL (wersja testowa)
        const { data } = parseSQLFileTest(sqlFile);
        
        // 3. Sprawdzamy połączenie z bazą
        console.log('\n🔌 Sprawdzanie połączenia z bazą...');
        await prisma.$connect();
        console.log('✅ Połączono z Supabase');
        
        // 4. Zapisujemy stan przed testem
        const beforeStats = await prisma.measurement.count();
        console.log(`📊 Pomiary przed testem: ${beforeStats}`);
        
        // 5. Import pomiarów (test z mapowaniem)
        if (data.measurements) {
            const measurementResult = await importMeasurementsTest(data.measurements, stationMapping);
            console.log(`\n📊 Wyniki importu pomiarów (test):`);
            console.log(`   - Sukces: ${measurementResult.success}`);
            console.log(`   - Błędy: ${measurementResult.failed}`);
            console.log(`   - Pominięte: ${measurementResult.skipped}`);
        }
        
        // 6. Sprawdzamy stan po teście
        const afterStats = await prisma.measurement.count();
        console.log(`\n📊 Pomiary po teście: ${afterStats} (+${afterStats - beforeStats})`);
        
        if (afterStats > beforeStats) {
            console.log('\n🎉 Test importu zakończony SUKCESEM!');
            console.log('✅ Historyczne dane zostały poprawnie zaimportowane');
            
            // Sprawdzamy przykładowy zaimportowany pomiar
            const sampleMeasurement = await prisma.measurement.findFirst({
                where: { source: 'historical_test' },
                include: {
                    station: {
                        select: { stationName: true, stationCode: true }
                    }
                }
            });
            
            if (sampleMeasurement) {
                console.log('\n📋 Przykładowy zaimportowany pomiar:');
                console.log(`   - Stacja: ${sampleMeasurement.station.stationName} (${sampleMeasurement.station.stationCode})`);
                console.log(`   - Poziom wody: ${sampleMeasurement.waterLevel} cm`);
                console.log(`   - Data: ${sampleMeasurement.measurementTimestamp}`);
            }
        } else {
            console.log('\n⚠️  Test importu - brak nowych danych');
            console.log('Sprawdź logi powyżej aby zdiagnozować problem');
        }
        
        console.log('\n📋 Następne kroki:');
        console.log('1. Jeśli test przeszedł - uruchom pełny import');
        console.log('2. Sprawdź API endpoints z nowymi danymi');
        console.log('3. Przetestuj endpoint /api/stations/[id]/history');
        
    } catch (error) {
        console.error('❌ Błąd podczas testu importu:', error);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    mainTest();
}

module.exports = { parseSQLFileTest, mapMeasurementData, importMeasurementsTest }; 