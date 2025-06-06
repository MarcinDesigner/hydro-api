#!/usr/bin/env node

/**
 * Skrypt do analizy struktury historycznej bazy danych deximstr_hydro.sql
 * Sprawdza kompatybilność z aktualną strukturą Supabase
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Analiza struktury historycznej bazy danych...\n');

// Funkcja do analizy pliku SQL
function analyzeSQLFile(filePath) {
    if (!fs.existsSync(filePath)) {
        console.log('❌ Plik nie został znaleziony:', filePath);
        console.log('📝 Instrukcje:');
        console.log('1. Umieść plik deximstr_hydro.sql w katalogu głównym projektu');
        console.log('2. Uruchom ponownie: node scripts/analyze-historical-db.js');
        return;
    }

    const fileSize = fs.statSync(filePath).size;
    console.log(`📊 Rozmiar pliku: ${(fileSize / 1024 / 1024).toFixed(2)} MB`);

    // Czytamy pierwsze 50KB pliku do analizy struktury
    const buffer = Buffer.alloc(50 * 1024);
    const fd = fs.openSync(filePath, 'r');
    const bytesRead = fs.readSync(fd, buffer, 0, buffer.length, 0);
    fs.closeSync(fd);

    const content = buffer.toString('utf8', 0, bytesRead);
    
    console.log('\n🏗️  ANALIZA STRUKTURY:');
    console.log('=' * 50);

    // Szukamy definicji tabel
    const tableMatches = content.match(/CREATE TABLE[^;]+;/gi) || [];
    console.log(`\n📋 Znalezione tabele: ${tableMatches.length}`);
    
    tableMatches.forEach((table, index) => {
        const tableName = table.match(/CREATE TABLE\s+`?(\w+)`?/i)?.[1];
        console.log(`${index + 1}. ${tableName}`);
        
        // Analizujemy kolumny
        const columns = table.match(/`(\w+)`\s+([^,\n]+)/g) || [];
        columns.forEach(col => {
            const [, name, type] = col.match(/`(\w+)`\s+([^,\n]+)/) || [];
            if (name && type) {
                console.log(`   - ${name}: ${type.trim()}`);
            }
        });
        console.log('');
    });

    // Szukamy INSERT statements
    const insertMatches = content.match(/INSERT INTO[^;]+;/gi) || [];
    console.log(`📥 Znalezione INSERT statements: ${insertMatches.length}`);

    // Sprawdzamy czy są dane pomiarów
    const measurementKeywords = ['measurement', 'water_level', 'flow', 'timestamp', 'date'];
    const hasMeasurements = measurementKeywords.some(keyword => 
        content.toLowerCase().includes(keyword)
    );
    
    console.log(`\n🌊 Zawiera pomiary historyczne: ${hasMeasurements ? '✅ TAK' : '❌ NIE'}`);

    // Analiza kompatybilności
    console.log('\n🔄 KOMPATYBILNOŚĆ Z SUPABASE:');
    console.log('=' * 50);
    
    const supabaseStructure = {
        stations: ['id', 'station_code', 'station_name', 'river_name', 'voivodeship', 'latitude', 'longitude', 'warning_level', 'alarm_level'],
        measurements: ['id', 'station_id', 'measurement_timestamp', 'water_level', 'flow_rate', 'temperature', 'source'],
        alerts: ['id', 'station_id', 'alert_type', 'message', 'water_level', 'threshold_level']
    };

    Object.entries(supabaseStructure).forEach(([tableName, expectedColumns]) => {
        const tableExists = content.toLowerCase().includes(`create table \`${tableName}\``);
        console.log(`\n📋 Tabela '${tableName}': ${tableExists ? '✅ ISTNIEJE' : '❌ BRAK'}`);
        
        if (tableExists) {
            expectedColumns.forEach(column => {
                const columnExists = content.toLowerCase().includes(`\`${column}\``);
                console.log(`   - ${column}: ${columnExists ? '✅' : '❌'}`);
            });
        }
    });

    return {
        fileSize,
        tableCount: tableMatches.length,
        insertCount: insertMatches.length,
        hasMeasurements,
        tables: tableMatches.map(t => t.match(/CREATE TABLE\s+`?(\w+)`?/i)?.[1]).filter(Boolean)
    };
}

// Funkcja do generowania planu migracji
function generateMigrationPlan(analysis) {
    console.log('\n📋 PLAN MIGRACJI:');
    console.log('=' * 50);
    
    console.log('\n1. 🔍 ANALIZA SZCZEGÓŁOWA:');
    console.log('   - Sprawdź pełną strukturę tabel w pliku SQL');
    console.log('   - Zidentyfikuj mapowanie kolumn MySQL → PostgreSQL');
    console.log('   - Sprawdź typy danych i ograniczenia');
    
    console.log('\n2. 🛠️  PRZYGOTOWANIE:');
    console.log('   - Utwórz skrypt konwersji MySQL → PostgreSQL');
    console.log('   - Przygotuj mapowanie ID stacji');
    console.log('   - Zaplanuj import w partiach (chunking)');
    
    console.log('\n3. 📥 IMPORT:');
    console.log('   - Import stacji (jeśli nowe)');
    console.log('   - Import pomiarów historycznych');
    console.log('   - Weryfikacja integralności danych');
    
    console.log('\n4. ✅ WERYFIKACJA:');
    console.log('   - Sprawdź liczbę zaimportowanych rekordów');
    console.log('   - Przetestuj API z historycznymi danymi');
    console.log('   - Sprawdź wydajność zapytań');
}

// Główna funkcja
function main() {
    const sqlFile = path.join(process.cwd(), 'deximstr_hydro.sql');
    
    console.log('🌊 HYDRO API - Analiza Historycznej Bazy Danych');
    console.log('=' * 60);
    console.log(`📁 Szukam pliku: ${sqlFile}\n`);
    
    const analysis = analyzeSQLFile(sqlFile);
    
    if (analysis) {
        generateMigrationPlan(analysis);
        
        console.log('\n🎯 NASTĘPNE KROKI:');
        console.log('=' * 50);
        console.log('1. Umieść plik deximstr_hydro.sql w katalogu głównym');
        console.log('2. Uruchom: node scripts/analyze-historical-db.js');
        console.log('3. Przejrzyj szczegółową analizę struktury');
        console.log('4. Uruchom import: node scripts/import-historical-data.js');
    }
}

if (require.main === module) {
    main();
}

module.exports = { analyzeSQLFile, generateMigrationPlan }; 