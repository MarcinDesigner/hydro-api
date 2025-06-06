#!/usr/bin/env node

/**
 * Skrypt diagnostyczny do debugowania importu historycznych danych
 */

const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

console.log('🔍 HYDRO API - Diagnostyka Importu');
console.log('=' * 50);

// Funkcja do parsowania małej próbki SQL
function parseSmallSample(filePath, maxLines = 50) {
    console.log('📖 Czytanie małej próbki SQL...');
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').slice(0, maxLines);
    const sampleContent = lines.join('\n');
    
    console.log(`📊 Analizuję pierwsze ${maxLines} linii pliku`);
    
    // Szukamy INSERT INTO measurements
    const measurementInserts = sampleContent.match(/INSERT INTO `measurements`[^;]+;/g);
    
    if (measurementInserts) {
        console.log(`📥 Znaleziono ${measurementInserts.length} INSERT statements dla measurements`);
        
        // Analizujemy pierwszy INSERT
        const firstInsert = measurementInserts[0];
        console.log('\n📋 Pierwszy INSERT statement:');
        console.log(firstInsert.substring(0, 200) + '...');
        
        // Wyciągamy kolumny
        const columnMatch = firstInsert.match(/\(([^)]+)\)\s+VALUES/);
        if (columnMatch) {
            const columns = columnMatch[1].split(',').map(col => col.trim().replace(/`/g, ''));
            console.log('\n📊 Kolumny w tabeli measurements:');
            columns.forEach((col, index) => {
                console.log(`   ${index + 1}. ${col}`);
            });
        }
        
        // Wyciągamy pierwsze wartości
        const valuesMatch = firstInsert.match(/VALUES\s*\(([^)]+)\)/);
        if (valuesMatch) {
            const values = valuesMatch[1].split(',').map(val => val.trim());
            console.log('\n📊 Pierwsze wartości:');
            values.forEach((val, index) => {
                console.log(`   ${index + 1}. ${val}`);
            });
        }
    } else {
        console.log('❌ Nie znaleziono INSERT statements dla measurements');
    }
    
    // Szukamy INSERT INTO stations
    const stationInserts = sampleContent.match(/INSERT INTO `stations`[^;]+;/g);
    
    if (stationInserts) {
        console.log(`\n📥 Znaleziono ${stationInserts.length} INSERT statements dla stations`);
        
        const firstStationInsert = stationInserts[0];
        console.log('\n📋 Pierwszy INSERT statement dla stations:');
        console.log(firstStationInsert.substring(0, 200) + '...');
    } else {
        console.log('\n❌ Nie znaleziono INSERT statements dla stations');
    }
    
    return { measurementInserts, stationInserts };
}

// Funkcja do sprawdzenia istniejących stacji
async function checkExistingStations() {
    console.log('\n🏭 Sprawdzanie istniejących stacji...');
    
    const stations = await prisma.station.findMany({
        select: {
            id: true,
            stationCode: true,
            stationName: true,
            _count: {
                select: {
                    measurements: true
                }
            }
        },
        take: 10
    });
    
    console.log(`📊 Znaleziono ${stations.length} stacji (pierwsze 10):`);
    stations.forEach(station => {
        console.log(`   - ${station.id} (${station.stationCode}): ${station.stationName} - ${station._count.measurements} pomiarów`);
    });
    
    return stations;
}

// Funkcja do sprawdzenia formatu ID w historycznych danych
async function analyzeHistoricalIds() {
    console.log('\n🔍 Analiza formatów ID...');
    
    // Sprawdzamy format ID w istniejących stacjach
    const existingStations = await prisma.station.findMany({
        select: { id: true, stationCode: true },
        take: 5
    });
    
    console.log('📊 Format ID w istniejących stacjach:');
    existingStations.forEach(station => {
        console.log(`   - ID: "${station.id}" (typ: ${typeof station.id})`);
        console.log(`   - Code: "${station.stationCode}" (typ: ${typeof station.stationCode})`);
    });
    
    return existingStations;
}

// Funkcja do testowania mapowania pojedynczego rekordu
function testRecordMapping() {
    console.log('\n🧪 Test mapowania pojedynczego rekordu...');
    
    // Przykładowy rekord z SQL (symulacja)
    const sampleRow = [1, 149180130, '2018-02-12 10:10:00', 45, null, null, 'historical', '2018-02-12 10:10:00'];
    const sampleColumns = ['id', 'station_id', 'measurement_timestamp', 'water_level', 'flow_rate', 'temperature', 'source', 'created_at'];
    
    console.log('📊 Przykładowy rekord z SQL:');
    sampleColumns.forEach((col, index) => {
        console.log(`   ${col}: ${sampleRow[index]} (${typeof sampleRow[index]})`);
    });
    
    // Mapowanie
    const mapped = mapMeasurementData(sampleRow, sampleColumns);
    console.log('\n📊 Po mapowaniu:');
    Object.entries(mapped).forEach(([key, value]) => {
        console.log(`   ${key}: ${value} (${typeof value})`);
    });
    
    return mapped;
}

// Funkcja mapowania (kopiowana z głównego skryptu)
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
    
    // Mapowanie station_id - sprawdzamy różne formaty
    if (mapped.stationId) {
        console.log(`🔍 Oryginalne station_id: ${mapped.stationId} (${typeof mapped.stationId})`);
        
        if (typeof mapped.stationId === 'number') {
            // Konwertujemy na string - format używany w istniejącej bazie
            mapped.stationId = mapped.stationId.toString();
            console.log(`🔄 Przekonwertowane na: "${mapped.stationId}"`);
        }
    }
    
    return mapped;
}

// Główna funkcja diagnostyczna
async function main() {
    try {
        const sqlFile = path.join(process.cwd(), 'deximstr_hydro.sql');
        
        if (!fs.existsSync(sqlFile)) {
            console.log('❌ Plik deximstr_hydro.sql nie istnieje');
            return;
        }
        
        // 1. Parsujemy małą próbkę
        const { measurementInserts, stationInserts } = parseSmallSample(sqlFile, 100);
        
        // 2. Sprawdzamy połączenie z bazą
        console.log('\n🔌 Sprawdzanie połączenia z bazą...');
        await prisma.$connect();
        console.log('✅ Połączono z Supabase');
        
        // 3. Sprawdzamy istniejące stacje
        const existingStations = await checkExistingStations();
        
        // 4. Analizujemy formaty ID
        await analyzeHistoricalIds();
        
        // 5. Testujemy mapowanie
        const mappedRecord = testRecordMapping();
        
        // 6. Sprawdzamy czy zmapowana stacja istnieje
        if (mappedRecord.stationId) {
            console.log(`\n🔍 Sprawdzanie czy stacja ${mappedRecord.stationId} istnieje...`);
            const stationExists = await prisma.station.findUnique({
                where: { id: mappedRecord.stationId }
            });
            
            if (stationExists) {
                console.log('✅ Stacja istnieje w bazie');
            } else {
                console.log('❌ Stacja NIE istnieje w bazie');
                
                // Sprawdzamy czy istnieje stacja z podobnym kodem
                const similarStation = await prisma.station.findFirst({
                    where: {
                        stationCode: mappedRecord.stationId
                    }
                });
                
                if (similarStation) {
                    console.log(`💡 Znaleziono stację z kodem ${mappedRecord.stationId}: ${similarStation.id}`);
                } else {
                    console.log(`❌ Nie znaleziono stacji z kodem ${mappedRecord.stationId}`);
                }
            }
        }
        
        console.log('\n🎯 Podsumowanie diagnostyki:');
        console.log('1. Sprawdź czy formaty ID stacji są zgodne');
        console.log('2. Sprawdź czy stacje historyczne istnieją w bazie');
        console.log('3. Rozważ import stacji przed pomiarami');
        
    } catch (error) {
        console.error('❌ Błąd podczas diagnostyki:', error);
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    main();
} 