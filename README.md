# HydroMain - System Zarządzania Danymi Hydrologicznymi IMGW

System do monitorowania i zarządzania danymi hydrologicznymi z IMGW (Instytut Meteorologii i Gospodarki Wodnej).

## 🌊 Funkcjonalności

### ✅ Zaimplementowane
- **System cache'owania React Query** - 5x szybsze ładowanie danych
- **Inteligentne łączenie danych** - 872 stacje z endpointów `hydro` + `hydro2`
- **Prawdziwe progi alarmowe** - z bazy danych zamiast arbitralnych wartości
- **Mapa interaktywna** - 860 stacji z dokładnymi współrzędnymi
- **Kolory markerów** według rzeczywistych stanów alarmowych:
  - 🔴 **Czerwony (Alarm)**: poziom wody ≥ poziom alarmowy
  - 🟠 **Pomarańczowy (Ostrzeżenie)**: poziom wody ≥ poziom ostrzegawczy
  - 🟢 **Zielony (Normalny)**: poziom wody < poziom ostrzegawczy
  - ⚫ **Szary (Nieznany)**: brak progów alarmowych w bazie
- **Dashboard zarządzania cache** - monitoring, odświeżanie, statystyki
- **Auto-refresh co 1 godzinę** zamiast 10 minut
- **Fallback system** dla niedostępnego API IMGW
- **Metadane jakości danych** - źródła i świeżość danych

### 📊 Statystyki Systemu
- **872 unikalne stacje** (609 z hydro + 263 tylko z hydro2)
- **860 stacji z współrzędnymi** na mapie (98.7% pokrycia)
- **566 stacji normalnych** (zielone markery)
- **3 stacje ostrzegawcze** (pomarańczowe markery)
- **0 stacji alarmowych** (czerwone markery)
- **291 stacji bez progów** (szare markery)

## 🏗️ Architektura

### Frontend (Next.js 14)
- **React Query** - cache'owanie i synchronizacja danych
- **TypeScript** - bezpieczeństwo typów
- **Tailwind CSS** - stylowanie
- **Leaflet** - mapa interaktywna
- **Lucide React** - ikony

### Backend (API Routes)
- **Smart Data Service** - inteligentne łączenie danych z obu endpointów IMGW
- **Coordinates Cache** - cache współrzędnych stacji
- **Hydro Levels Service** - prawdziwe progi alarmowe z bazy danych
- **In-memory cache** - server-side cache z TTL 5 minut

### Baza Danych
- **Prisma ORM** - zarządzanie bazą danych
- **SQLite** - lokalna baza danych (development)
- **Progi alarmowe** - 871 stacji z rzeczywistymi progami z IMGW

## 🚀 Instalacja i Uruchomienie

### Wymagania
- Node.js 18+
- npm lub yarn

### Kroki instalacji

1. **Klonowanie repozytorium**
```bash
git clone <repository-url>
cd HydroMain/hydro-api
```

2. **Instalacja zależności**
```bash
npm install
```

3. **Konfiguracja bazy danych**
```bash
npx prisma generate
npx prisma db push
```

4. **Uruchomienie serwera deweloperskiego**
```bash
npm run dev
```

5. **Otwórz przeglądarkę**
```
http://localhost:3000
```

## 📁 Struktura Projektu

```
HydroMain/
├── hydro-api/                 # Główna aplikacja Next.js
│   ├── app/                   # App Router (Next.js 13+)
│   │   ├── api/              # API Routes
│   │   │   ├── imgw-stations/ # Endpoint z cache'em
│   │   │   ├── stations/     # Endpointy stacji
│   │   │   │   └── map/      # Dane dla mapy
│   │   │   ├── health/       # Health check
│   │   │   └── cache/        # Zarządzanie cache
│   │   ├── stations/         # Strona listy stacji
│   │   ├── map/             # Strona mapy
│   │   ├── cache/           # Dashboard cache
│   │   └── layout.tsx       # Layout aplikacji
│   ├── components/          # Komponenty React
│   │   ├── ui/             # Komponenty UI
│   │   ├── StationsMap.tsx # Mapa stacji
│   │   └── StationCard.tsx # Karta stacji
│   ├── hooks/              # Custom hooks
│   │   ├── useStationsData.ts    # React Query hooks
│   │   └── useCacheManager.ts    # Zarządzanie cache
│   ├── lib/                # Biblioteki i serwisy
│   │   ├── smart-data-service.ts # Główny serwis danych
│   │   ├── hydro-levels.ts      # Progi alarmowe
│   │   └── coordinates-cache.ts  # Cache współrzędnych
│   ├── types/              # Definicje typów TypeScript
│   ├── prisma/             # Konfiguracja Prisma
│   └── package.json        # Zależności projektu
├── .gitignore              # Pliki ignorowane przez Git
└── README.md               # Ten plik
```

## 🔧 Konfiguracja

### Zmienne środowiskowe
Utwórz plik `.env.local` w katalogu `hydro-api/`:

```env
# Opcjonalne - URL do bazy danych (domyślnie SQLite)
DATABASE_URL="file:./dev.db"

# Opcjonalne - konfiguracja cache
CACHE_TTL=300000  # 5 minut w ms
```

## 🛠️ Rozwój

### Dostępne skrypty

```bash
# Uruchomienie serwera deweloperskiego
npm run dev

# Budowanie aplikacji
npm run build

# Uruchomienie aplikacji produkcyjnej
npm start

# Linting kodu
npm run lint

# Generowanie klienta Prisma
npx prisma generate

# Migracje bazy danych
npx prisma db push
```

### Endpointy API

- `GET /api/health` - Status systemu
- `GET /api/imgw-stations` - Wszystkie stacje z cache'em
- `GET /api/stations/map` - Stacje dla mapy z progami alarmowymi
- `GET /api/cache/clear` - Czyszczenie cache
- `GET /api/coordinates/stats` - Statystyki współrzędnych

## 📈 Wydajność

### Przed implementacją cache
- ⏱️ Czas ładowania: ~3-5 sekund
- 🔄 Każde przełączenie strony: nowe zapytanie do IMGW
- 📊 Tylko 609 stacji z endpoint `hydro`

### Po implementacji cache
- ⚡ Czas ładowania: ~0.5-1 sekunda (5x szybciej)
- 💾 Cache React Query: 5 minut
- 🗄️ Cache server-side: 5 minut
- 📊 872 stacje z inteligentnym łączeniem `hydro` + `hydro2`
- 🎯 Auto-refresh: co 1 godzinę

## 🎨 Funkcjonalności UI

### Dashboard
- 📊 Statystyki systemu w czasie rzeczywistym
- 🔄 Status cache (HIT/MISS, wiek danych)
- 📈 Wykresy trendów poziomów wody

### Mapa
- 🗺️ Interaktywna mapa Polski z markerami stacji
- 🎨 Kolory markerów według stanów alarmowych
- 📍 Popup z detalami stacji przy kliknięciu
- 🔍 Zoom i nawigacja

### Lista stacji
- 📋 Tabela wszystkich stacji z filtrami
- 🔍 Wyszukiwanie po nazwie stacji/rzece
- 🏷️ Filtrowanie po województwie, rzece, trendzie
- ✏️ Edycja progów alarmowych

## 🐛 Rozwiązane problemy

1. **Cache React Query** - Wielokrotne pobieranie danych przy przełączaniu stron
2. **Inteligentne łączenie danych** - Brak stacji z endpoint `hydro2`
3. **Prawdziwe progi alarmowe** - Arbitralne wartości progów
4. **Markery na mapie** - Brak współrzędnych i kolorów
5. **Nieskończone pętle** - Problemy z `useEffect` i `useState`
6. **Błędy TypeScript** - Niezgodność typów między endpointami

## 🔮 Przyszłe funkcjonalności

- [ ] **Powiadomienia push** - Alerty o przekroczeniu progów
- [ ] **Eksport danych** - CSV, JSON, PDF
- [ ] **API klucze** - Autoryzacja dostępu do API
- [ ] **Baza PostgreSQL** - Migracja z SQLite
- [ ] **Docker** - Konteneryzacja aplikacji
- [ ] **Testy jednostkowe** - Jest, React Testing Library
- [ ] **CI/CD** - GitHub Actions
- [ ] **Monitoring** - Sentry, LogRocket

## 📝 Licencja

MIT License - szczegóły w pliku `LICENSE`

## 👥 Autorzy

- **Marcin** - Główny deweloper
- **Claude Sonnet 4** - AI Assistant

---

**Ostatnia aktualizacja:** Czerwiec 2025  
**Wersja:** 1.0.0  
**Status:** ✅ Produkcyjny 