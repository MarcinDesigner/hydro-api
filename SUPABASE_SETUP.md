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