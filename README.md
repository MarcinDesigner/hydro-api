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