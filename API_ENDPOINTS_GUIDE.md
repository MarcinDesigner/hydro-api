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

## Zarządzanie widocznością stacji

### GET `/api/stations/visibility`
Pobiera statystyki widoczności stacji.

**Odpowiedź:**
```json
{
  "status": "success",
  "data": {
    "totalStations": 609,
    "visibleStations": 605,
    "hiddenStations": 4,
    "hiddenStationsList": [
      {
        "stationId": "150160330",
        "isVisible": false,
        "hiddenAt": "2024-01-15T10:30:00.000Z",
        "hiddenBy": "API User",
        "reason": "Station maintenance"
      }
    ]
  }
}
```

### POST `/api/stations/visibility`
Ustawia widoczność stacji.

**Żądanie:**
```json
{
  "stationId": "150160330",
  "isVisible": false,
  "reason": "Station maintenance"
}
```

### GET `/api/stations/{id}/visibility`
Sprawdza widoczność konkretnej stacji.

### POST `/api/stations/{id}/visibility`
Przełącza widoczność stacji.

**Żądanie:**
```json
{
  "reason": "Toggle from map"
}
```

### PUT `/api/stations/{id}/visibility`
Ustawia konkretną widoczność stacji.

**Żądanie:**
```json
{
  "isVisible": true,
  "reason": "Station back online"
}
```

## Panel zarządzania widocznością

Dostępny pod adresem `/stations/visibility`:

1. **Statystyki** - liczba widocznych/ukrytych stacji
2. **Lista wszystkich stacji** - z możliwością ukrywania/pokazywania
3. **Przycisk "Pokaż wszystkie"** - przywraca widoczność wszystkich stacji
4. **Historia ukryć** - data i powód ukrycia stacji

## Ukrywanie stacji z mapy

Na mapie stacji (`/map`) każda stacja ma przycisk "Ukryj stację w API":

1. **Kliknij marker stacji** na mapie
2. **Kliknij "Ukryj stację w API"** w popup
3. **Stacja zostanie ukryta** we wszystkich endpointach API
4. **Mapa się odświeży** automatycznie

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