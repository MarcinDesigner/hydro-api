#!/usr/bin/env node

/**
 * Testowa wersja skryptu importu - ograniczona liczba rekordów
 * Służy do testowania lokalnego przed pełnym importem
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

console.log('🧪 HYDRO API - Test Importu Historycznych Danych');
console.log('=' * 60);

// Konfiguracja testowa
const CONFIG = {
    maxRecordsPerTable: 100,  // Maksymalnie 100 rekordów na tabelę
    batchSize: 50,            // Mniejsze partie
    maxRetries: 3,
    delayBetweenBatches: 200,
    dryRun: false,
    testMode: true            // Tryb testowy
};

// Funkcja do parsowania pliku SQL (ograniczona wersja)
function parseSQLFileTest(filePath) {
    console.log('📖 Czytanie pliku SQL (tryb testowy)...');
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`Plik nie istnieje: ${filePath}`);
    }

    // Czytamy tylko pierwsze 5MB pliku dla testu
    const buffer = Buffer.alloc(5 * 1024 * 1024);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);
    
    const content = buffer.toString('utf8', 0, bytesRead);
    const fileSize = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    
    console.log(`📊 Rozmiar pliku: ${fileSize} MB (czytam pierwsze 5MB)`);
    
    // Wyodrębniamy struktury tabel
    const tables = {};
    const tableRegex = /CREATE TABLE\s+`(\w+)`\s*\(([\s\S]*?)\)\s*ENGINE/gi;
    
    let match;
    while ((match = tableRegex.exec(content)) !== null) {
        const tableName = match[1];
        const tableStructure = match[2];
        
        // Parsujemy kolumny
        const columns = [];
        const columnRegex = /`(\w+)`\s+([^,\n]+)/g;
        let columnMatch;
        
        while ((columnMatch = columnRegex.exec(tableStructure)) !== null) {
            columns.push({
                name: columnMatch[1],
                type: columnMatch[2].trim()
            });
        }
        
        tables[tableName] = { columns };
        console.log(`📋 Znaleziono tabelę: ${tableName} (${columns.length} kolumn)`);
    }
    
    // Wyodrębniamy dane INSERT (ograniczone)
    const insertRegex = /INSERT INTO\s+`(\w+)`[^(]*\(([^)]+)\)\s+VALUES\s*([\s\S]*?);/gi;
    const data = {};
    
    while ((match = insertRegex.exec(content)) !== null) {
        const tableName = match[1];
        const columnNames = match[2].split(',').map(col => col.trim().replace(/`/g, ''));
        const valuesString = match[3];
        
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
        }
    }
    
    Object.entries(data).forEach(([tableName, tableData]) => {
        console.log(`📥 Tabela ${tableName}: ${tableData.rows.length} rekordów (test)`);
    });
    
    return { tables, data };
}

// Funkcja do parsowania wartości SQL (kopiowana z głównego skryptu)
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

// Funkcja do mapowania danych stacji (kopiowana)
function mapStationData(row, columns) {
    const columnMap = {
        'id': 'id',
        'station_code': 'stationCode',
        'station_name': 'stationName',
        'river_name': 'riverName',
        'voivodeship': 'voivodeship',
        'longitude': 'longitude',
        'latitude': 'latitude',
        'warning_level': 'warningLevel',
        'alarm_level': 'alarmLevel',
        'api_visible': 'apiVisible',
        'created_at': 'createdAt',
        'updated_at': 'updatedAt'
    };
    
    const mapped = {};
    columns.forEach((column, index) => {
        const prismaField = columnMap[column];
        if (prismaField && row[index] !== undefined) {
            let value = row[index];
            
            if (column === 'api_visible') {
                value = Boolean(value);
            } else if (column.includes('_at')) {
                value = value ? new Date(value) : new Date();
            } else if (['longitude', 'latitude'].includes(column)) {
                value = value ? parseFloat(value) : null;
            } else if (['warning_level', 'alarm_level'].includes(column)) {
                value = value ? parseInt(value) : null;
            }
            
            mapped[prismaField] = value;
        }
    });
    
    if (!mapped.id) {
        mapped.id = `test_station_${mapped.stationCode}`;
    }
    
    return mapped;
}

// Funkcja do mapowania danych pomiarów (kopiowana)
function mapMeasurementData(row, columns) {
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
    
    // Mapowanie station_id - musimy znaleźć odpowiednią stację
    if (mapped.stationId && typeof mapped.stationId === 'number') {
        mapped.stationId = `test_station_${mapped.stationId}`;
    }
    
    return mapped;
}

// Funkcja do importu w partiach (testowa wersja)
async function importInBatchesTest(tableName, data, mapFunction) {
    const { columns, rows } = data;
    const totalRows = Math.min(rows.length, CONFIG.maxRecordsPerTable);
    
    console.log(`\n📥 Test importu tabeli ${tableName}: ${totalRows} rekordów`);
    
    let imported = 0;
    let failed = 0;
    
    for (let i = 0; i < totalRows; i += CONFIG.batchSize) {
        const batch = rows.slice(i, i + CONFIG.batchSize);
        const mappedBatch = batch.map(row => mapFunction(row, columns));
        
        try {
            if (tableName === 'stations') {
                await prisma.station.createMany({
                    data: mappedBatch,
                    skipDuplicates: true
                });
            } else if (tableName === 'measurements') {
                // Sprawdzamy czy stacje istnieją przed dodaniem pomiarów
                const validBatch = [];
                for (const measurement of mappedBatch) {
                    const stationExists = await prisma.station.findUnique({
                        where: { id: measurement.stationId }
                    });
                    if (stationExists) {
                        validBatch.push(measurement);
                    }
                }
                
                if (validBatch.length > 0) {
                    await prisma.measurement.createMany({
                        data: validBatch,
                        skipDuplicates: true
                    });
                }
            }
            
            imported += batch.length;
            console.log(`✅ Partia ${Math.floor(i / CONFIG.batchSize) + 1}: ${batch.length} rekordów`);
            
        } catch (error) {
            console.error(`❌ Błąd w partii ${Math.floor(i / CONFIG.batchSize) + 1}:`, error.message);
            failed += batch.length;
        }
        
        await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
    }
    
    return { success: imported, failed };
}

// Główna funkcja testowa
async function mainTest() {
    try {
        const sqlFile = path.join(process.cwd(), 'deximstr_hydro.sql');
        
        console.log(`📁 Plik SQL: ${sqlFile}`);
        console.log(`⚙️  Konfiguracja testowa: max=${CONFIG.maxRecordsPerTable}, batch=${CONFIG.batchSize}\n`);
        
        // Parsujemy plik SQL (wersja testowa)
        const { tables, data } = parseSQLFileTest(sqlFile);
        
        // Sprawdzamy połączenie z bazą
        console.log('\n🔌 Sprawdzanie połączenia z bazą...');
        await prisma.$connect();
        console.log('✅ Połączono z Supabase');
        
        // Zapisujemy stan przed testem
        const beforeStats = await prisma.measurement.count();
        console.log(`📊 Pomiary przed testem: ${beforeStats}`);
        
        // Import stacji (test)
        if (data.stations) {
            const stationResult = await importInBatchesTest('stations', data.stations, mapStationData);
            console.log(`📊 Stacje (test) - Sukces: ${stationResult.success}, Błędy: ${stationResult.failed}`);
        }
        
        // Import pomiarów (test)
        if (data.measurements) {
            const measurementResult = await importInBatchesTest('measurements', data.measurements, mapMeasurementData);
            console.log(`📊 Pomiary (test) - Sukces: ${measurementResult.success}, Błędy: ${measurementResult.failed}`);
        }
        
        // Sprawdzamy stan po teście
        const afterStats = await prisma.measurement.count();
        console.log(`📊 Pomiary po teście: ${afterStats} (+${afterStats - beforeStats})`);
        
        console.log('\n🎉 Test importu zakończony!');
        console.log('\n📋 Następne kroki:');
        console.log('1. Sprawdź czy dane zostały poprawnie zaimportowane');
        console.log('2. Przetestuj API endpoints');
        console.log('3. Jeśli wszystko działa - uruchom pełny import');
        
    } catch (error) {
        console.error('❌ Błąd podczas testu importu:', error);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    mainTest();
}

module.exports = { parseSQLFileTest, mapStationData, mapMeasurementData, importInBatchesTest }; 