#!/usr/bin/env node

/**
 * Skrypt do importu historycznych danych z MySQL do Supabase PostgreSQL
 * Obsługuje konwersję typów danych i mapowanie struktur
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

console.log('🌊 HYDRO API - Import Historycznych Danych');
console.log('=' * 60);

// Konfiguracja importu
const CONFIG = {
    batchSize: 1000,        // Liczba rekordów w jednej partii
    maxRetries: 3,          // Maksymalna liczba ponownych prób
    delayBetweenBatches: 100, // Opóźnienie między partiami (ms)
    dryRun: false           // Tryb testowy (nie zapisuje do bazy)
};

// Funkcja do parsowania pliku SQL
function parseSQLFile(filePath) {
    console.log('📖 Czytanie pliku SQL...');
    
    if (!fs.existsSync(filePath)) {
        throw new Error(`Plik nie istnieje: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const fileSize = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    
    console.log(`📊 Rozmiar pliku: ${fileSize} MB`);
    
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
    
    // Wyodrębniamy dane INSERT
    const insertRegex = /INSERT INTO\s+`(\w+)`[^(]*\(([^)]+)\)\s+VALUES\s*([\s\S]*?);/gi;
    const data = {};
    
    while ((match = insertRegex.exec(content)) !== null) {
        const tableName = match[1];
        const columnNames = match[2].split(',').map(col => col.trim().replace(/`/g, ''));
        const valuesString = match[3];
        
        if (!data[tableName]) {
            data[tableName] = { columns: columnNames, rows: [] };
        }
        
        // Parsujemy wartości
        const valueRegex = /\(([^)]+)\)/g;
        let valueMatch;
        
        while ((valueMatch = valueRegex.exec(valuesString)) !== null) {
            const values = parseValues(valueMatch[1]);
            data[tableName].rows.push(values);
        }
    }
    
    Object.entries(data).forEach(([tableName, tableData]) => {
        console.log(`📥 Tabela ${tableName}: ${tableData.rows.length} rekordów`);
    });
    
    return { tables, data };
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
            // Sprawdzamy czy to nie jest escaped quote
            if (valueString[i + 1] === quoteChar) {
                current += char;
                i++; // Pomijamy następny znak
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

// Funkcja do konwersji wartości
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

// Funkcja do mapowania typów MySQL → PostgreSQL
function mapMySQLToPostgreSQL(mysqlType) {
    const typeMap = {
        'int(11)': 'INTEGER',
        'varchar(255)': 'TEXT',
        'varchar(100)': 'TEXT',
        'varchar(50)': 'TEXT',
        'varchar(15)': 'TEXT',
        'decimal(10,6)': 'DOUBLE PRECISION',
        'tinyint(1)': 'BOOLEAN',
        'timestamp': 'TIMESTAMP WITH TIME ZONE',
        'datetime': 'TIMESTAMP WITH TIME ZONE',
        'text': 'TEXT',
        'longtext': 'TEXT'
    };
    
    // Usuwamy dodatkowe atrybuty
    const cleanType = mysqlType.split(' ')[0].toLowerCase();
    return typeMap[cleanType] || 'TEXT';
}

// Funkcja do mapowania danych stacji
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
            
            // Konwersje specjalne
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
    
    // Generujemy UUID dla nowych rekordów
    if (!mapped.id) {
        mapped.id = `station_${mapped.stationCode}`;
    }
    
    return mapped;
}

// Funkcja do mapowania danych pomiarów
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
            
            // Konwersje specjalne
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
    
    // Ustawiamy domyślne wartości
    if (!mapped.source) {
        mapped.source = 'historical';
    }
    
    return mapped;
}

// Funkcja do importu w partiach
async function importInBatches(tableName, data, mapFunction) {
    const { columns, rows } = data;
    const totalRows = rows.length;
    
    console.log(`\n📥 Import tabeli ${tableName}: ${totalRows} rekordów`);
    
    if (CONFIG.dryRun) {
        console.log('🧪 Tryb testowy - dane nie będą zapisane');
        return { success: totalRows, failed: 0 };
    }
    
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
                await prisma.measurement.createMany({
                    data: mappedBatch,
                    skipDuplicates: true
                });
            }
            
            imported += batch.length;
            console.log(`✅ Partia ${Math.floor(i / CONFIG.batchSize) + 1}: ${batch.length} rekordów`);
            
        } catch (error) {
            console.error(`❌ Błąd w partii ${Math.floor(i / CONFIG.batchSize) + 1}:`, error.message);
            failed += batch.length;
        }
        
        // Opóźnienie między partiami
        if (CONFIG.delayBetweenBatches > 0) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
        }
    }
    
    return { success: imported, failed };
}

// Główna funkcja importu
async function main() {
    try {
        const sqlFile = path.join(process.cwd(), 'deximstr_hydro.sql');
        
        console.log(`📁 Plik SQL: ${sqlFile}`);
        console.log(`⚙️  Konfiguracja: batch=${CONFIG.batchSize}, dryRun=${CONFIG.dryRun}\n`);
        
        // Parsujemy plik SQL
        const { tables, data } = parseSQLFile(sqlFile);
        
        // Sprawdzamy połączenie z bazą
        console.log('\n🔌 Sprawdzanie połączenia z bazą...');
        await prisma.$connect();
        console.log('✅ Połączono z Supabase');
        
        // Import stacji
        if (data.stations) {
            const stationResult = await importInBatches('stations', data.stations, mapStationData);
            console.log(`📊 Stacje - Sukces: ${stationResult.success}, Błędy: ${stationResult.failed}`);
        }
        
        // Import pomiarów
        if (data.measurements) {
            const measurementResult = await importInBatches('measurements', data.measurements, mapMeasurementData);
            console.log(`📊 Pomiary - Sukces: ${measurementResult.success}, Błędy: ${measurementResult.failed}`);
        }
        
        console.log('\n🎉 Import zakończony!');
        
    } catch (error) {
        console.error('❌ Błąd podczas importu:', error);
    } finally {
        await prisma.$disconnect();
    }
}

// Uruchomienie skryptu
if (require.main === module) {
    // Sprawdzamy argumenty wiersza poleceń
    const args = process.argv.slice(2);
    if (args.includes('--dry-run')) {
        CONFIG.dryRun = true;
    }
    if (args.includes('--batch-size')) {
        const batchIndex = args.indexOf('--batch-size');
        CONFIG.batchSize = parseInt(args[batchIndex + 1]) || CONFIG.batchSize;
    }
    
    main();
}

module.exports = { parseSQLFile, mapStationData, mapMeasurementData, importInBatches }; 