# 🌊 Hydro API Dashboard - Kompletny Kontekst Projektu

## 📋 Przegląd Projektu

**Hydro API Dashboard** to aplikacja Next.js 14 z TypeScript, która dostarcza API do monitorowania stacji hydrologicznych w Polsce. Aplikacja pobiera dane z publicznego API IMGW (Instytut Meteorologii i Gospodarki Wodnej) i udostępnia je przez własne REST API endpoints.

## 🏗️ Architektura Techniczna

### Stack Technologiczny
- **Frontend/Backend**: Next.js 14 (App Router)
- **Język**: TypeScript
- **Baza danych**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Hosting**: Vercel (planowane)
- **Zewnętrzne API**: IMGW API (hydro/hydro2 endpoints)

### Struktura Projektu
```
hydro-api/
├── app/
│   ├── api/                    # API Routes (Next.js App Router)
│   │   ├── alerts/            # Alerty hydrologiczne
│   │   ├── config/            # Konfiguracja API
│   │   ├── health/            # Health check
│   │   ├── station/[id]/      # Pojedyncza stacja
│   │   ├── stations/          # Lista stacji
│   │   ├── stats/             # Statystyki
│   │   └── sync/              # Synchronizacja danych
│   ├── stations/              # Strony frontend
│   └── alerts/                # Strony alertów
├── components/                 # Komponenty React
├── lib/                       # Biblioteki i serwisy
│   ├── imgw-service.ts        # Serwis IMGW API
│   ├── api-config.ts          # Konfiguracja API
│   ├── database-service.ts    # Serwis bazy danych
│   └── prisma.ts              # Klient Prisma
├── prisma/                    # Schema i migracje
├── types/                     # Definicje TypeScript
└── utils/                     # Narzędzia pomocnicze
```

## 🔌 API Endpoints

### Główne Endpoints
1. **GET /api/stations** - Lista wszystkich stacji
   - Query params: `voivodeship`, `river`, `limit`
   - Zwraca: Array stacji z danymi hydrologicznymi

2. **GET /api/station/[id]** - Szczegóły pojedynczej stacji
   - Params: `id` (ID stacji)
   - Zwraca: Pełne dane stacji

3. **GET /api/stats** - Statystyki API
   - Zwraca: Liczba stacji, rzek, aktywnych pomiarów

4. **GET /api/health** - Status aplikacji
   - Zwraca: Status bazy danych i API IMGW

5. **POST /api/sync** - Synchronizacja danych
   - Pobiera najnowsze dane z IMGW

6. **GET /api/config** - Konfiguracja API
   - Zarządzanie endpointami IMGW

7. **GET /api/alerts** - Alerty hydrologiczne
   - Zwraca: Stacje z wysokim stanem wody

## 🌐 Integracja z IMGW API

### Dual Endpoint Support
Aplikacja obsługuje dwa endpointy IMGW:
- **hydro**: `/api/data/hydro` - podstawowe dane hydrologiczne
- **hydro2**: `/api/data/hydro2` - rozszerzone dane z współrzędnymi

### Normalizacja Danych
Wszystkie dane są normalizowane do jednolitego formatu:
```typescript
interface NormalizedStationData {
  id: string;
  name: string;
  waterLevel: number | null;
  waterLevelDate: string;
  flow?: number | null;
  river?: string | null;
  voivodeship?: string | null;
  longitude?: number | null;
  latitude?: number | null;
  source: string;
  timestamp: string;
}
```

## 🗄️ Baza Danych

### Konfiguracja
- **Provider**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Migracje**: Automatyczne przez Prisma

### Główne Tabele
- `stations` - Stacje hydrologiczne
- `measurements` - Pomiary (planowane)
- `alerts` - Alerty (planowane)

## 🔧 Konfiguracja Środowiska

### Zmienne Środowiskowe (.env)
```bash
# Database
DATABASE_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# API Configuration
IMGW_API_URL="https://danepubliczne.imgw.pl/api/data"
IMGW_API_ENDPOINT="hydro"
SYNC_INTERVAL_MINUTES=60

# Prisma
PRISMA_CLIENT_ENGINE_TYPE="binary"
PGOPTIONS='--client-min-messages=warning'
```

## 🚀 Status Rozwoju

### ✅ Gotowe Funkcjonalności
- [x] Podstawowa struktura Next.js 14
- [x] API endpoints dla stacji hydrologicznych
- [x] Integracja z IMGW API (dual endpoint)
- [x] Normalizacja danych
- [x] Health check endpoint
- [x] Statystyki API
- [x] Konfiguracja TypeScript
- [x] Tailwind CSS setup
- [x] Prisma ORM setup
- [x] Supabase integration
- [x] Git repository (GitHub)

### 🔄 W Trakcie
- [ ] Frontend UI components
- [ ] Dashboard interface
- [ ] Alerting system
- [ ] Data visualization

### 📋 Planowane
- [ ] Deployment na Vercel
- [ ] Cron jobs dla synchronizacji
- [ ] Monitoring i logi
- [ ] API rate limiting
- [ ] Caching
- [ ] Tests

## 🛠️ Komendy Deweloperskie

```bash
# Rozwój
npm run dev              # Start dev server (port 3001)
npm run build           # Build production
npm run start           # Start production

# Baza danych
npm run db:generate     # Generate Prisma client
npm run db:push         # Push schema to DB
npm run db:migrate      # Run migrations

# Linting
npm run lint            # ESLint check
```

## 🔍 Testowanie API

### Przykłady Requestów
```bash
# Lista stacji (limit 5)
curl "http://localhost:3001/api/stations?limit=5"

# Stacja po ID
curl "http://localhost:3001/api/station/151140030"

# Stacje z województwa
curl "http://localhost:3001/api/stations?voivodeship=mazowieckie"

# Statystyki
curl "http://localhost:3001/api/stats"

# Health check
curl "http://localhost:3001/api/health"
```

## 🎯 Kluczowe Pliki do Zrozumienia

1. **lib/imgw-service.ts** - Główny serwis do komunikacji z IMGW
2. **lib/api-config.ts** - Konfiguracja i mapowanie pól API
3. **app/api/stations/route.ts** - Endpoint listy stacji
4. **app/api/station/[id]/route.ts** - Endpoint pojedynczej stacji
5. **prisma/schema.prisma** - Schema bazy danych
6. **types/hydro.ts** - Definicje typów TypeScript

## 🔐 Bezpieczeństwo

- Plik `.env` jest ignorowany przez git
- Klucze API są bezpiecznie przechowywane
- Supabase RLS (Row Level Security) skonfigurowane
- CORS headers ustawione dla API

## 📊 Metryki Projektu

- **Stacje**: ~609 (endpoint hydro) / ~861 (endpoint hydro2)
- **Województwa**: 16
- **Rzeki**: ~279
- **API Response Time**: <500ms
- **Uptime**: 99.9% (docelowo)

---

**Ostatnia aktualizacja**: 2025-06-02
**Wersja**: 1.0.0
**Status**: Development Ready 