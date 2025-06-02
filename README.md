# Konfiguracja Supabase dla Hydro API

## 1. Utworzenie projektu Supabase

1. Idź na [supabase.com](https://supabase.com)
2. Zaloguj się i utwórz nowy projekt
3. Wybierz region (najlepiej Frankfurt dla Polski)
4. Zapisz dane projektu:
   - Project URL: `https://[YOUR_PROJECT_REF].supabase.co`
   - API Key (anon): `[YOUR_ANON_KEY]`
   - Service Role Key: `[YOUR_SERVICE_ROLE_KEY]`

## 2. Konfiguracja zmiennych środowiskowych

Utwórz plik `.env` w katalogu głównym projektu:

```env
# Database
DATABASE_URL="postgresql://postgres:[YOUR_PASSWORD]@db.[YOUR_PROJECT_REF].supabase.co:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[YOUR_PROJECT_REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"
SUPABASE_SERVICE_ROLE_KEY="[YOUR_SERVICE_ROLE_KEY]"

# API Configuration
IMGW_API_URL="https://danepubliczne.imgw.pl/api/data"
SYNC_INTERVAL_MINUTES=60
```

Zastąp:
- `[YOUR_PASSWORD]` - hasłem do bazy danych z Supabase
- `[YOUR_PROJECT_REF]` - referencją projektu z Supabase
- `[YOUR_ANON_KEY]` - kluczem anon z Supabase
- `[YOUR_SERVICE_ROLE_KEY]` - kluczem service role z Supabase

## 3. Migracja bazy danych

```bash
# Zainstaluj Prisma CLI (jeśli nie masz)
npm install -g prisma

# Wygeneruj klienta Prisma
npx prisma generate

# Uruchom migrację
npx prisma db push

# Opcjonalnie - otwórz Prisma Studio
npx prisma studio
```

## 4. Testowanie połączenia

```bash
# Sprawdź health endpoint
curl http://localhost:3000/api/health

# Uruchom synchronizację
curl -X POST http://localhost:3000/api/sync
```

## 5. Struktura bazy danych

Aplikacja utworzy następujące tabele:

### `stations`
- Informacje o stacjach hydrologicznych
- Kod stacji, nazwa, rzeka, województwo
- Współrzędne geograficzne (opcjonalne)
- Poziomy ostrzegawcze i alarmowe

### `measurements`
- Pomiary z każdej stacji
- Poziom wody, przepływ, temperatura
- Timestamp pomiaru
- Źródło danych (hydro/hydro2)

### `alerts`
- Alerty o przekroczeniu progów
- Typ alertu (warning/alarm)
- Status aktywności
- Powiązanie ze stacją i pomiarem

### `rivers_mapping`
- Mapowanie nazw rzek
- Normalizacja nazw
- Informacje o dorzeczach

## 6. Automatyczna synchronizacja

Aby skonfigurować automatyczną synchronizację:

1. **Vercel Cron Jobs** (jeśli używasz Vercel):
   ```json
   {
     "crons": [
       {
         "path": "/api/sync",
         "schedule": "0 */1 * * *"
       }
     ]
   }
   ```

2. **GitHub Actions**:
   ```yaml
   name: Sync Data
   on:
     schedule:
       - cron: '0 */1 * * *'
   jobs:
     sync:
       runs-on: ubuntu-latest
       steps:
         - name: Trigger sync
           run: |
             curl -X POST ${{ secrets.APP_URL }}/api/sync
   ```

3. **Zewnętrzny cron**:
   ```bash
   # Dodaj do crontab
   0 */1 * * * curl -X POST https://your-app.vercel.app/api/sync
   ```

## 7. Monitorowanie

- **Health check**: `GET /api/health`
- **Statystyki**: `GET /api/stats`
- **Prisma Studio**: `npx prisma studio`
- **Supabase Dashboard**: Panel administracyjny Supabase

## 8. Bezpieczeństwo

1. **Row Level Security (RLS)** w Supabase:
   ```sql
   ALTER TABLE stations ENABLE ROW LEVEL SECURITY;
   ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;
   ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
   
   -- Polityki dla odczytu publicznego
   CREATE POLICY "Allow public read" ON stations FOR SELECT USING (api_visible = true);
   CREATE POLICY "Allow public read" ON measurements FOR SELECT USING (true);
   ```

2. **API Keys**: Używaj service role key tylko dla operacji zapisu
3. **Rate limiting**: Skonfiguruj w Supabase lub Vercel

## 9. Backup i odzyskiwanie

Supabase automatycznie tworzy backupy, ale możesz też:

```bash
# Export danych
pg_dump $DATABASE_URL > backup.sql

# Import danych
psql $DATABASE_URL < backup.sql
``` 


# Przewodnik po zarządzaniu endpointami API IMGW

## Przegląd

Aplikacja Hydro API obsługuje teraz dwa różne endpointy IMGW z możliwością dynamicznego przełączania między nimi:

- **`/hydro`** - klasyczny endpoint z danymi o rzekach i województwach
- **`/hydro2`** - nowy endpoint ze współrzędnymi geograficznymi i przepływami

## Różnice między endpointami

### Endpoint `/hydro` (klasyczny)
```json
{
  "id_stacji": "151140030",
  "stacja": "Przewoźniki", 
  "rzeka": "Skroda",
  "województwo": "lubuskie",
  "stan_wody": "230",
  "stan_wody_data_pomiaru": "2025-06-02 17:10:00",
  "temperatura_wody": null,
  "zjawisko_lodowe": "0",
  "zjawisko_zarastania": "0"
}
```

**Zalety:**
- ✅ Zawiera nazwy rzek
- ✅ Zawiera województwa
- ✅ Zawiera zjawiska lodowe i zarastania
- ✅ Zawiera temperaturę wody
- ❌ Brak współrzędnych geograficznych
- ❌ Brak danych o przepływie

### Endpoint `/hydro2` (nowy)
```json
{
  "kod_stacji": "150160330",
  "nazwa_stacji": "SZCZYTNA",
  "lon": "16.443056",
  "lat": "50.415556", 
  "stan": "134",
  "stan_data": "2025-05-26 09:20:00",
  "przelyw": null,
  "przeplyw_data": null
}
```

**Zalety:**
- ✅ Zawiera współrzędne geograficzne (lon/lat)
- ✅ Zawiera dane o przepływie
- ✅ Więcej stacji (861 vs 609)
- ❌ Brak nazw rzek
- ❌ Brak województw
- ❌ Brak zjawisk lodowych/zarastania
- ❌ Brak temperatury wody

## Statystyki porównawcze

| Cecha | Hydro | Hydro2 | Połączone |
|-------|-------|--------|-----------|
| **Liczba stacji** | 609 | 861 | 872 |
| **Ze współrzędnymi** | 0 | 861 | 861 |
| **Z przepływem** | 0 | 671 | 671 |
| **Z rzekami** | 609 | 0 | 609 |
| **Wspólne stacje** | - | - | 598 |
| **Unikalne hydro** | - | - | 11 |
| **Unikalne hydro2** | - | - | 263 |

## API Endpoints

### GET `/api/config`
Pobiera aktualną konfigurację API.

**Odpowiedź:**
```json
{
  "success": true,
  "data": {
    "currentEndpoint": "hydro",
    "availableEndpoints": ["hydro", "hydro2"],
    "endpointConfigs": { ... },
    "stats": { ... }
  }
}
```

### POST `/api/config`
Przełącza endpoint API.

**Żądanie:**
```json
{
  "endpoint": "hydro2"
}
```

**Odpowiedź:**
```json
{
  "success": true,
  "message": "API endpoint switched to: hydro2",
  "data": {
    "currentEndpoint": "hydro2",
    "stats": { ... }
  }
}
```

### PUT `/api/config`
Porównuje dane z obu endpointów.

**Żądanie:**
```json
{
  "action": "compare"
}
```

**Odpowiedź:**
```json
{
  "success": true,
  "data": {
    "comparison": { ... },
    "summary": {
      "hydro": { "count": 609, "uniqueStations": 11 },
      "hydro2": { "count": 861, "uniqueStations": 263 },
      "common": 598
    }
  }
}
```

## Konfiguracja

### Zmienne środowiskowe

```bash
# Domyślny endpoint (hydro lub hydro2)
IMGW_API_ENDPOINT=hydro
```

### Przełączanie w runtime

Endpoint można przełączać dynamicznie bez restartowania aplikacji:

```bash
# Przełącz na hydro2
curl -X POST -H "Content-Type: application/json" \
  -d '{"endpoint":"hydro2"}' \
  http://localhost:3000/api/config

# Przełącz na hydro
curl -X POST -H "Content-Type: application/json" \
  -d '{"endpoint":"hydro"}' \
  http://localhost:3000/api/config
```

## Panel zarządzania w UI

W aplikacji webowej dostępny jest panel konfiguracji:

1. **Kliknij przycisk "⚙️ Pokaż konfigurację"** na stronie głównej
2. **Wybierz endpoint** - kliknij przycisk `hydro` lub `hydro2`
3. **Sprawdź statystyki** - zakładka "Statystyki"
4. **Porównaj endpointy** - zakładka "Porównanie"

## Normalizacja danych

Wszystkie dane są normalizowane do wspólnego formatu:

```typescript
interface NormalizedStationData {
  id: string;                    // ID stacji
  name: string;                  // Nazwa stacji
  waterLevel: number | null;     // Poziom wody (cm)
  waterLevelDate: string;        // Data pomiaru
  flow?: number | null;          // Przepływ (m³/s)
  flowDate?: string | null;      // Data pomiaru przepływu
  river?: string | null;         // Nazwa rzeki
  voivodeship?: string | null;   // Województwo
  longitude?: number | null;     // Długość geograficzna
  latitude?: number | null;      // Szerokość geograficzna
  icePhenom?: string | null;     // Zjawisko lodowe
  overgrowthPhenom?: string | null; // Zjawisko zarastania
  waterTemp?: number | null;     // Temperatura wody
  source: string;                // Źródło danych (hydro/hydro2)
  timestamp: string;             // Timestamp normalizacji
}
```

## Zalecenia użycia

### Kiedy używać `/hydro`:
- ✅ Potrzebujesz nazw rzek i województw
- ✅ Analizujesz zjawiska lodowe/zarastania
- ✅ Monitorujesz temperaturę wody
- ✅ Pracujesz z mniejszym zbiorem danych

### Kiedy używać `/hydro2`:
- ✅ Potrzebujesz współrzędnych geograficznych
- ✅ Analizujesz przepływy
- ✅ Potrzebujesz większej liczby stacji
- ✅ Tworzysz mapy/wizualizacje geograficzne

### Tryb kombinowany:
Możesz użyć funkcji porównania, aby uzyskać dane z obu źródeł i wybrać najlepsze dla swojego przypadku użycia.

## Przykłady użycia

### Sprawdzenie aktualnego endpointu
```bash
curl http://localhost:3000/api/config | jq '.data.currentEndpoint'
```

### Pobranie statystyk
```bash
curl http://localhost:3000/api/config | jq '.data.stats'
```

### Przełączenie i sprawdzenie liczby stacji
```bash
# Przełącz na hydro2
curl -X POST -H "Content-Type: application/json" \
  -d '{"endpoint":"hydro2"}' \
  http://localhost:3000/api/config

# Sprawdź liczbę stacji
curl http://localhost:3000/api/stations | jq 'length'
```

### Porównanie endpointów
```bash
curl -X PUT -H "Content-Type: application/json" \
  -d '{"action":"compare"}' \
  http://localhost:3000/api/config | jq '.data.summary'
``` 
 
 
 
 
 Architektura:
Vercel - hosting aplikacji Next.js + API endpoints
Supabase - baza danych PostgreSQL
Zenbox.pl - serwer z cron jobs
Jak to działa:
🕐 Cron na zenbox.pl uruchamia się co godzinę
📡 Wysyła POST do https://twoja-app.vercel.app/api/sync
🔄 Vercel API pobiera dane z IMGW i zapisuje do Supabase
📊 Użytkownicy widzą aktualne dane
Zalety tego rozwiązania:
✅ Bezpłatny hosting na Vercel
✅ Niezawodne cron jobs na zenbox.pl
✅ Skalowalna baza danych na Supabase
✅ Bezpieczne (token autoryzacji)
✅ Monitorowane (logi)
Kroki do wdrożenia:
Usuń server.js (nie potrzebny)
Deploy na Vercel z zmiennymi środowiskowymi
Skonfiguruj Supabase i skopiuj DATABASE_URL
Wgraj skrypt na zenbox.pl
Dodaj cron job na zenbox.pl
