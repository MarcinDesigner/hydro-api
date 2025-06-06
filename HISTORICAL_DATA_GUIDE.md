# 🌊 Przewodnik po Danych Historycznych - Hydro API

## 📋 Przegląd

Ten przewodnik opisuje jak zaimportować i wykorzystać historyczne dane pomiarów hydrologicznych w systemie Hydro API.

## 🏗️ Struktura Danych

### Kompatybilność MySQL → PostgreSQL

| MySQL | PostgreSQL | Opis |
|-------|------------|------|
| `int(11)` | `INTEGER` | Liczby całkowite |
| `varchar(255)` | `TEXT` | Tekst |
| `decimal(10,6)` | `DOUBLE PRECISION` | Współrzędne GPS |
| `tinyint(1)` | `BOOLEAN` | Wartości logiczne |
| `timestamp` | `TIMESTAMP WITH TIME ZONE` | Daty z strefą czasową |

### Mapowanie Tabel

#### Tabela `stations`
```sql
-- MySQL
CREATE TABLE `stations` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `station_code` varchar(15) NOT NULL,
  `station_name` varchar(100) NOT NULL,
  `river_name` varchar(100) DEFAULT NULL,
  `voivodeship` varchar(50) DEFAULT NULL,
  `longitude` decimal(10,6) NOT NULL,
  `latitude` decimal(10,6) NOT NULL,
  `warning_level` int(11) DEFAULT NULL,
  `alarm_level` int(11) DEFAULT NULL,
  `api_visible` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- PostgreSQL (Supabase)
CREATE TABLE stations (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    station_code TEXT UNIQUE NOT NULL,
    station_name TEXT NOT NULL,
    river_name TEXT,
    voivodeship TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    warning_level INTEGER,
    alarm_level INTEGER,
    api_visible BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

#### Tabela `measurements` (historyczne pomiary)
```sql
-- Oczekiwana struktura MySQL
CREATE TABLE `measurements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `station_id` int(11) NOT NULL,
  `measurement_timestamp` timestamp NOT NULL,
  `water_level` int(11) DEFAULT NULL,
  `flow_rate` decimal(10,3) DEFAULT NULL,
  `temperature` decimal(5,2) DEFAULT NULL,
  `source` varchar(50) DEFAULT 'historical',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- PostgreSQL (Supabase)
CREATE TABLE measurements (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    station_id TEXT NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    measurement_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    water_level INTEGER,
    flow_rate DOUBLE PRECISION,
    temperature DOUBLE PRECISION,
    source TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

## 🛠️ Proces Importu

### Krok 1: Analiza Struktury

```bash
# Umieść plik deximstr_hydro.sql w katalogu głównym
cp /path/to/deximstr_hydro.sql ./

# Uruchom analizę struktury
node scripts/analyze-historical-db.js
```

**Oczekiwany wynik:**
```
🌊 HYDRO API - Analiza Historycznej Bazy Danych
============================================================
📁 Szukam pliku: /path/to/hydro-api/deximstr_hydro.sql

📊 Rozmiar pliku: 52.34 MB

🏗️  ANALIZA STRUKTURY:
==================================================

📋 Znalezione tabele: 2
1. stations
   - id: int(11) NOT NULL AUTO_INCREMENT
   - station_code: varchar(15) NOT NULL
   - station_name: varchar(100) NOT NULL
   - river_name: varchar(100) DEFAULT NULL
   - voivodeship: varchar(50) DEFAULT NULL
   - longitude: decimal(10,6) NOT NULL
   - latitude: decimal(10,6) NOT NULL
   - warning_level: int(11) DEFAULT NULL
   - alarm_level: int(11) DEFAULT NULL

2. measurements
   - id: int(11) NOT NULL AUTO_INCREMENT
   - station_id: int(11) NOT NULL
   - measurement_timestamp: timestamp NOT NULL
   - water_level: int(11) DEFAULT NULL
   - flow_rate: decimal(10,3) DEFAULT NULL
   - temperature: decimal(5,2) DEFAULT NULL

📥 Znalezione INSERT statements: 1247

🌊 Zawiera pomiary historyczne: ✅ TAK

🔄 KOMPATYBILNOŚĆ Z SUPABASE:
==================================================

📋 Tabela 'stations': ✅ ISTNIEJE
   - id: ✅
   - station_code: ✅
   - station_name: ✅
   - river_name: ✅
   - voivodeship: ✅
   - latitude: ✅
   - longitude: ✅
   - warning_level: ✅
   - alarm_level: ✅

📋 Tabela 'measurements': ✅ ISTNIEJE
   - id: ✅
   - station_id: ✅
   - measurement_timestamp: ✅
   - water_level: ✅
   - flow_rate: ✅
   - temperature: ✅
   - source: ❌
```

### Krok 2: Import Testowy (Dry Run)

```bash
# Uruchom import w trybie testowym
node scripts/import-historical-data.js --dry-run

# Lub z mniejszymi partiami
node scripts/import-historical-data.js --dry-run --batch-size 500
```

### Krok 3: Import Produkcyjny

```bash
# Import rzeczywisty
node scripts/import-historical-data.js

# Z konfiguracją
node scripts/import-historical-data.js --batch-size 1000
```

**Oczekiwany wynik:**
```
🌊 HYDRO API - Import Historycznych Danych
============================================================
📁 Plik SQL: /path/to/hydro-api/deximstr_hydro.sql
⚙️  Konfiguracja: batch=1000, dryRun=false

📖 Czytanie pliku SQL...
📊 Rozmiar pliku: 52.34 MB
📋 Znaleziono tabelę: stations (12 kolumn)
📋 Znaleziono tabelę: measurements (7 kolumn)
📥 Tabela stations: 872 rekordów
📥 Tabela measurements: 125847 rekordów

🔌 Sprawdzanie połączenia z bazą...
✅ Połączono z Supabase

📥 Import tabeli stations: 872 rekordów
✅ Partia 1: 872 rekordów
📊 Stacje - Sukces: 872, Błędy: 0

📥 Import tabeli measurements: 125847 rekordów
✅ Partia 1: 1000 rekordów
✅ Partia 2: 1000 rekordów
...
✅ Partia 126: 847 rekordów
📊 Pomiary - Sukces: 125847, Błędy: 0

🎉 Import zakończony!
```

## 📊 API Endpoints dla Danych Historycznych

### GET `/api/stations/[id]/history`

Pobiera historyczne pomiary dla konkretnej stacji.

#### Parametry zapytania:
- `start_date` - Data początkowa (ISO 8601)
- `end_date` - Data końcowa (ISO 8601)
- `limit` - Liczba rekordów (max 1000, domyślnie 100)
- `offset` - Przesunięcie dla paginacji
- `order_by` - Sortowanie: `asc` lub `desc` (domyślnie `desc`)

#### Przykłady użycia:

```bash
# Ostatnie 100 pomiarów
curl "https://hydro-api.vercel.app/api/stations/150170080/history"

# Pomiary z ostatniego miesiąca
curl "https://hydro-api.vercel.app/api/stations/150170080/history?start_date=2024-05-01&end_date=2024-05-31"

# Paginacja
curl "https://hydro-api.vercel.app/api/stations/150170080/history?limit=50&offset=100"

# Chronologicznie (najstarsze pierwsze)
curl "https://hydro-api.vercel.app/api/stations/150170080/history?order_by=asc"
```

#### Przykład odpowiedzi:

```json
{
  "station": {
    "id": "station_150170080",
    "stationCode": "150170080",
    "stationName": "JARNOŁTÓWEK",
    "riverName": "Złoty Potok",
    "voivodeship": "opolskie"
  },
  "measurements": [
    {
      "id": "measurement_12345",
      "measurementTimestamp": "2024-05-15T12:00:00Z",
      "waterLevel": 125,
      "flowRate": 2.45,
      "temperature": 18.5,
      "source": "historical",
      "createdAt": "2024-05-15T12:05:00Z"
    }
  ],
  "pagination": {
    "limit": 100,
    "offset": 0,
    "total": 2847,
    "hasMore": true
  },
  "statistics": {
    "totalMeasurements": 2847,
    "averageWaterLevel": 118.7,
    "averageFlowRate": 2.12,
    "averageTemperature": 16.8,
    "minWaterLevel": 85,
    "maxWaterLevel": 245,
    "dataRange": {
      "oldest": "2023-01-01T00:00:00Z",
      "newest": "2024-05-15T12:00:00Z"
    }
  },
  "monthlyStats": [
    {
      "month": "2024-05-01T00:00:00Z",
      "count": 744,
      "avgWaterLevel": 122.5,
      "minWaterLevel": 95,
      "maxWaterLevel": 165,
      "avgFlowRate": 2.34
    }
  ],
  "filters": {
    "startDate": null,
    "endDate": null,
    "orderBy": "desc"
  },
  "timestamp": "2024-05-15T14:30:00Z"
}
```

## 🔍 Weryfikacja Importu

### Sprawdzenie liczby rekordów

```bash
# Sprawdź liczbę stacji
curl "https://hydro-api.vercel.app/api/stats" | jq '.totalStations'

# Sprawdź liczbę pomiarów
curl "https://hydro-api.vercel.app/api/database-stats" | jq '.totalMeasurements'
```

### Test konkretnej stacji

```bash
# Sprawdź czy stacja ma dane historyczne
curl "https://hydro-api.vercel.app/api/stations/150170080/history?limit=1"
```

## 🚀 Korzyści z Danych Historycznych

### 1. **Analiza Trendów**
- Długoterminowe zmiany poziomów wody
- Sezonowość i cykle hydrologiczne
- Identyfikacja anomalii

### 2. **Prognozowanie**
- Modele predykcyjne oparte na danych historycznych
- Wczesne ostrzeganie o powodziach
- Planowanie gospodarki wodnej

### 3. **Statystyki Zaawansowane**
- Percentyle i kwantyle
- Analiza częstotliwości zdarzeń ekstremalnych
- Korelacje między stacjami

### 4. **Wizualizacje**
- Wykresy czasowe
- Mapy cieplne sezonowości
- Porównania międzyroczne

## ⚠️ Uwagi Techniczne

### Wydajność
- Indeksy na `station_id` i `measurement_timestamp`
- Paginacja dla dużych zbiorów danych
- Cache dla często używanych zapytań

### Bezpieczeństwo
- Rate limiting dla API
- Walidacja parametrów wejściowych
- Sanityzacja danych SQL

### Monitoring
- Logi importu
- Metryki wydajności
- Alerty o błędach

## 🎯 Następne Kroki

1. **Umieść plik `deximstr_hydro.sql` w katalogu głównym**
2. **Uruchom analizę**: `node scripts/analyze-historical-db.js`
3. **Test import**: `node scripts/import-historical-data.js --dry-run`
4. **Import produkcyjny**: `node scripts/import-historical-data.js`
5. **Weryfikacja**: Sprawdź API endpoints
6. **Integracja**: Dodaj do dashboardu i statystyk

---

**Ostatnia aktualizacja**: 2025-06-06  
**Wersja**: 1.0.0  
**Status**: Ready for Import 