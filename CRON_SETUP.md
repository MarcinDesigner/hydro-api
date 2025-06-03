# 🕐 Konfiguracja Cron Job dla Hydro API

## 📋 Przegląd

Hydro API wymaga regularnej synchronizacji danych z API IMGW. Ponieważ Vercel ma ograniczenia dla cron jobs, używamy zewnętrznego hostingu do wywoływania endpointu synchronizacji co godzinę.

## 🎯 Endpoint do wywołania

**URL:** `https://hydro-api-ygjs.vercel.app/api/sync`  
**Metoda:** `POST`  
**Autoryzacja:** `Bearer hydro-cron-secret-2025`  
**Content-Type:** `application/json`

## 📁 Pliki do przesłania na hosting

### 1. `cron-sync.php` (Wersja PHP)
```php
// Gotowy skrypt PHP z logowaniem i obsługą błędów
```

### 2. `cron-sync.sh` (Wersja Bash)
```bash
#!/bin/bash
# Gotowy skrypt bash z logowaniem i obsługą błędów
```

## ⚙️ Konfiguracja na różnych hostingach

### 🔧 Zenbox.pl
1. **Prześlij pliki** na serwer (np. do `/home/username/cron/`)
2. **Ustaw uprawnienia** dla bash script:
   ```bash
   chmod +x cron-sync.sh
   ```
3. **Skonfiguruj cron job** w panelu administracyjnym:
   ```
   0 * * * * /usr/bin/php /home/username/cron/cron-sync.php
   ```
   lub
   ```
   0 * * * * /home/username/cron/cron-sync.sh
   ```

### 🔧 home.pl
1. **Panel administracyjny** → Cron
2. **Dodaj zadanie:**
   - **Częstotliwość:** Co godzinę (0 * * * *)
   - **Komenda:** `/usr/bin/php /home/username/domains/domain.com/cron/cron-sync.php`

### 🔧 OVH
1. **Panel klienta** → Hosting → Zadania automatyczne
2. **Utwórz zadanie:**
   - **Częstotliwość:** Co godzinę
   - **Język:** PHP 8.1+
   - **Plik:** `/cron/cron-sync.php`

### 🔧 Uniwersalna konfiguracja crontab
```bash
# Edytuj crontab
crontab -e

# Dodaj linię (co godzinę o pełnej godzinie)
0 * * * * /usr/bin/php /path/to/cron-sync.php >> /path/to/cron.log 2>&1

# Lub dla bash script
0 * * * * /path/to/cron-sync.sh >> /path/to/cron.log 2>&1
```

## 🧪 Testowanie

### Ręczne uruchomienie PHP:
```bash
php cron-sync.php
```

### Ręczne uruchomienie Bash:
```bash
./cron-sync.sh
```

### Test przez curl:
```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer hydro-cron-secret-2025" \
  -d '{"source":"manual"}' \
  https://hydro-api-ygjs.vercel.app/api/sync
```

## 📊 Monitorowanie

### Logi
- **PHP:** `cron-sync.log` w tym samym folderze co skrypt
- **Bash:** `cron-sync.log` w tym samym folderze co skrypt

### Przykład logów:
```
[2025-06-03 10:00:01] === Hydro API Cron Job Started ===
[2025-06-03 10:00:01] 💚 API is healthy
[2025-06-03 10:00:02] 🔄 Starting Hydro API synchronization...
[2025-06-03 10:00:05] ✅ Synchronization successful (3247ms)
[2025-06-03 10:00:05] 📊 Response: Data synchronized successfully with Supabase
[2025-06-03 10:00:05] === Cron Job Completed Successfully ===
```

### Health Check
Sprawdź status API przed synchronizacją:
```bash
curl https://hydro-api-ygjs.vercel.app/api/health
```

## 🔐 Bezpieczeństwo

1. **Token autoryzacji** jest wymagany dla endpointu `/api/sync`
2. **Logi** nie zawierają wrażliwych danych
3. **Timeout** ustawiony na 60 sekund
4. **User-Agent** identyfikuje źródło requestów

## ⏰ Harmonogram

- **Częstotliwość:** Co godzinę (0 * * * *)
- **Czas wykonania:** ~3-10 sekund
- **Retry:** Brak (następna próba za godzinę)
- **Timeout:** 60 sekund

## 🚨 Rozwiązywanie problemów

### Problem: HTTP 401 Unauthorized
**Rozwiązanie:** Sprawdź token autoryzacji w zmiennych środowiskowych Vercel

### Problem: HTTP 500 Internal Server Error
**Rozwiązanie:** Sprawdź logi Vercel i połączenie z bazą danych

### Problem: Timeout
**Rozwiązanie:** Zwiększ timeout w skrypcie lub sprawdź wydajność API

### Problem: Brak logów
**Rozwiązanie:** Sprawdź uprawnienia do zapisu w folderze ze skryptem

## 📞 Wsparcie

W przypadku problemów sprawdź:
1. **Logi cron job** (`cron-sync.log`)
2. **Status API** (`/api/health`)
3. **Logi Vercel** (dashboard Vercel)
4. **Konfigurację cron** na hostingu

---

**Ostatnia aktualizacja:** 2025-06-03  
**Wersja:** 1.0.0 