# 📚 Hydro API - Dokumentacja

Kompletna dokumentacja API do zarządzania danymi hydrologicznymi IMGW.

## 🌐 Dostęp do dokumentacji

**Interaktywna dokumentacja:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)

**Base URL:** `http://localhost:3000` (development) / `https://hydro-api-ygjs.vercel.app` (production)

## 📊 Przegląd API

- **18 endpointów** w 10 kategoriach
- **866 stacji hydrologicznych** z całej Polski
- **7+ lat danych historycznych** (od lutego 2018)
- **Aktualizacja co godzinę** przez cron job
- **Dane w czasie rzeczywistym** z API IMGW

## 🚀 Szybki start

### 1. Pobierz listę stacji
```bash
curl "http://localhost:3000/api/stations?limit=10"
```

### 2. Sprawdź dane historyczne
```bash
curl "http://localhost:3000/api/stations/152210010/measurements?days=7"
```

### 3. Sprawdź status systemu
```bash
curl "http://localhost:3000/api/health"
```

### 4. Pobierz stacje na mapę
```bash
curl "http://localhost:3000/api/stations/map"
```

## 📂 Kategorie endpointów

### 🏭 Stacje
- `GET /api/stations` - Lista wszystkich stacji
- `GET /api/stations/{id}` - Szczegóły stacji
- `PUT /api/stations/{id}` - Aktualizacja stacji

### 📈 Pomiary
- `GET /api/stations/{id}/measurements` - Dane historyczne

### 🗺️ Mapa
- `GET /api/stations/map` - Stacje z współrzędnymi

### 🔄 Synchronizacja
- `POST /api/sync` - Synchronizacja z IMGW

### 👁️ Zarządzanie
- `GET /api/stations/visibility` - Statystyki widoczności
- `POST /api/stations/{id}/visibility` - Przełącz widoczność

### 📊 Statystyki
- `GET /api/stats` - Statystyki systemu

### 🚨 Alerty
- `GET /api/alerts` - Lista alertów
- `POST /api/alerts` - Tworzenie alertów

### ⚙️ Konfiguracja
- `GET /api/config` - Pobierz konfigurację
- `POST /api/config` - Aktualizuj konfigurację

### 🌍 Współrzędne
- `GET /api/coordinates/stats` - Statystyki współrzędnych
- `POST /api/coordinates/initialize` - Inicjalizacja współrzędnych
- `POST /api/coordinates/refresh` - Odświeżanie współrzędnych

### 🔧 System
- `GET /api/health` - Status systemu
- `GET /api/debug` - Informacje debugowania

## 💡 Przykłady zastosowań

### 📈 Monitoring poziomu wody
```bash
# Pobierz świeże dane z województwa mazowieckiego
curl "http://localhost:3000/api/stations?fresh=true&voivodeship=mazowieckie"
```

### 🚨 System alertów
```bash
# Sprawdź aktywne alerty
curl "http://localhost:3000/api/alerts"

# Utwórz nowy alert
curl -X POST "http://localhost:3000/api/alerts" \
  -H "Content-Type: application/json" \
  -d '{"stationCode": "152210010", "alertType": "warning"}'
```

### 🗺️ Aplikacje mapowe
```bash
# Pobierz wszystkie stacje z współrzędnymi
curl "http://localhost:3000/api/stations/map"
```

### 📊 Analizy historyczne
```bash
# Dane z ostatniego roku dla stacji Warszawa
curl "http://localhost:3000/api/stations/152210010/measurements?days=365"
```

## 🔧 Parametry zapytań

### Filtrowanie stacji
- `voivodeship` - Filtruj po województwie
- `river` - Filtruj po nazwie rzeki
- `limit` - Maksymalna liczba wyników
- `fresh` - Tylko świeże dane (< 24h)

### Dane historyczne
- `days` - Liczba dni wstecz (domyślnie: 30)
- `limit` - Maksymalna liczba pomiarów (domyślnie: 1000)
- `source` - Źródło danych: `hydro` lub `hydro2`

## 📋 Format odpowiedzi

Wszystkie endpointy zwracają dane w formacie JSON:

```json
{
  "status": "success",
  "data": { ... },
  "count": 123,
  "message": "Optional message"
}
```

### Kody statusu
- `200` - Sukces
- `400` - Błędne żądanie
- `404` - Nie znaleziono
- `500` - Błąd serwera

## 🔐 Autoryzacja

Większość endpointów jest publicznych. Endpointy administracyjne wymagają tokenu:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" "http://localhost:3000/api/sync"
```

## 🕐 Limity i cache

- **Rate limiting:** 100 żądań/minutę
- **Cache:** Dane są cache'owane przez 5 minut
- **Timeout:** 30 sekund na żądanie

## 🔄 Synchronizacja danych

System automatycznie synchronizuje dane z API IMGW:
- **Częstotliwość:** Co godzinę
- **Źródła:** hydro.imgw.pl i hydro2.imgw.pl
- **Cron job:** Uruchamiany z zewnętrznego hostingu

## 📞 Wsparcie

- **Dashboard:** [http://localhost:3000](http://localhost:3000)
- **Dokumentacja:** [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Status systemu:** [http://localhost:3000/api/health](http://localhost:3000/api/health)

## 🏗️ Architektura

- **Frontend:** Next.js 14 + TypeScript
- **Backend:** Next.js API Routes
- **Baza danych:** PostgreSQL + Prisma ORM
- **Hosting:** Vercel (production)
- **Cron:** Zewnętrzny hosting z PHP

## 📈 Statystyki

- **866 stacji** hydrologicznych
- **560+ stacji** w bazie danych
- **7+ lat** danych historycznych
- **Co godzinę** nowe pomiary
- **98%+ uptime** systemu 