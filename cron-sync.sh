#!/bin/bash

# Hydro API Cron Sync Script (Bash version)
# 
# Ten skrypt wywołuje endpoint synchronizacji na Vercel co godzinę
# Umieść go na zewnętrznym hostingu i skonfiguruj cron job
# 
# Cron job command (co godzinę):
# 0 * * * * /path/to/cron-sync.sh

# Konfiguracja
VERCEL_API_URL="https://hydro-api-ygjs.vercel.app/api/sync"
HEALTH_API_URL="https://hydro-api-ygjs.vercel.app/api/health"
CRON_SECRET_TOKEN="hydro-cron-secret-2025"
LOG_FILE="$(dirname "$0")/cron-sync.log"

# Funkcja logowania
log_message() {
    local message="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[$timestamp] $message" | tee -a "$LOG_FILE"
}

# Funkcja sprawdzania health
check_health() {
    log_message "💚 Checking API health..."
    
    local response=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$HEALTH_API_URL")
    local http_code="${response: -3}"
    
    if [ "$http_code" != "200" ]; then
        log_message "⚠️  Health check failed with HTTP $http_code"
        return 1
    fi
    
    local status=$(cat /tmp/health_response.json | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    if [ "$status" = "healthy" ]; then
        log_message "💚 API is healthy"
        return 0
    else
        log_message "⚠️  API health check returned: $status"
        log_message "Raw response: $(cat /tmp/health_response.json)"
        return 1
    fi
}

# Główna funkcja synchronizacji
sync_hydro_data() {
    log_message "🔄 Starting Hydro API synchronization..."
    
    local start_time=$(date +%s)
    
    # Wykonaj POST request z autoryzacją
    local response=$(curl -s -w "%{http_code}" \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $CRON_SECRET_TOKEN" \
        -H "User-Agent: Hydro-Cron/1.0" \
        -d '{"source":"cron"}' \
        -o /tmp/sync_response.json \
        --max-time 60 \
        "$VERCEL_API_URL")
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local http_code="${response: -3}"
    
    # Sprawdź HTTP status
    if [ "$http_code" != "200" ]; then
        log_message "❌ Request failed with HTTP $http_code"
        log_message "Response: $(cat /tmp/sync_response.json 2>/dev/null || echo 'No response')"
        return 1
    fi
    
    # Sprawdź JSON response
    local status=$(cat /tmp/sync_response.json | grep -o '"status":"[^"]*"' | head -1 | cut -d'"' -f4)
    local message=$(cat /tmp/sync_response.json | grep -o '"message":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    if [ "$status" = "success" ]; then
        log_message "✅ Synchronization successful (${duration}s)"
        log_message "📊 Response: $message"
        return 0
    else
        log_message "❌ Synchronization failed"
        log_message "📊 Response: $(cat /tmp/sync_response.json)"
        return 1
    fi
}

# Główne wykonanie
main() {
    log_message "=== Hydro API Cron Job Started ==="
    
    # Sprawdź czy curl jest dostępny
    if ! command -v curl &> /dev/null; then
        log_message "❌ curl is not installed"
        exit 1
    fi
    
    # Sprawdź health API
    if ! check_health; then
        log_message "❌ Skipping sync due to health check failure"
        exit 1
    fi
    
    # Wykonaj synchronizację
    if sync_hydro_data; then
        log_message "=== Cron Job Completed Successfully ==="
        exit 0
    else
        log_message "=== Cron Job Failed ==="
        exit 1
    fi
}

# Uruchom główną funkcję
main "$@" 