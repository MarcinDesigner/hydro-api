<?php
/**
 * Hydro API Cron Sync Script
 * 
 * Ten skrypt wywołuje endpoint synchronizacji na Vercel co godzinę
 * Umieść go na zewnętrznym hostingu (np. zenbox.pl) i skonfiguruj cron job
 * 
 * Cron job command (co godzinę):
 * 0 * * * * /usr/bin/php /path/to/cron-sync.php
 */

// Konfiguracja
$VERCEL_API_URL = 'https://hydro-api-ygjs.vercel.app/api/sync';
$CRON_SECRET_TOKEN = 'hydro-cron-secret-2025';
$LOG_FILE = __DIR__ . '/cron-sync.log';

// Funkcja logowania
function writeLog($message) {
    global $LOG_FILE;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message" . PHP_EOL;
    file_put_contents($LOG_FILE, $logMessage, FILE_APPEND | LOCK_EX);
    echo $logMessage;
}

// Główna funkcja synchronizacji
function syncHydroData() {
    global $VERCEL_API_URL, $CRON_SECRET_TOKEN;
    
    writeLog("🔄 Starting Hydro API synchronization...");
    
    // Przygotuj request
    $headers = [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $CRON_SECRET_TOKEN,
        'User-Agent: Hydro-Cron/1.0'
    ];
    
    $context = stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => implode("\r\n", $headers),
            'content' => json_encode(['source' => 'cron']),
            'timeout' => 300
        ]
    ]);
    
    // Wykonaj request
    $startTime = microtime(true);
    $response = @file_get_contents($VERCEL_API_URL, false, $context);
    $endTime = microtime(true);
    $duration = round(($endTime - $startTime) * 1000, 2);
    
    // Sprawdź odpowiedź
    if ($response === false) {
        $error = error_get_last();
        writeLog("❌ Request failed: " . ($error['message'] ?? 'Unknown error'));
        return false;
    }
    
    // Parsuj JSON response
    $data = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        writeLog("❌ Invalid JSON response: " . json_last_error_msg());
        writeLog("Raw response: " . substr($response, 0, 500));
        return false;
    }
    
    // Sprawdź status
    if (isset($data['status']) && $data['status'] === 'success') {
        writeLog("✅ Synchronization successful ({$duration}ms)");
        writeLog("📊 Response: " . $data['message']);
        return true;
    } else {
        writeLog("❌ Synchronization failed");
        writeLog("📊 Response: " . json_encode($data));
        return false;
    }
}

// Funkcja sprawdzania health
function checkHealth() {
    global $VERCEL_API_URL;
    
    $healthUrl = str_replace('/sync', '/health', $VERCEL_API_URL);
    $response = @file_get_contents($healthUrl);
    
    if ($response === false) {
        writeLog("⚠️  Health check failed");
        return false;
    }
    
    $data = json_decode($response, true);
    if (isset($data['status']) && $data['status'] === 'healthy') {
        writeLog("💚 API is healthy");
        return true;
    }
    
    writeLog("⚠️  API health check returned: " . ($data['status'] ?? 'unknown'));
    return false;
}

// Główne wykonanie
try {
    writeLog("=== Hydro API Cron Job Started ===");
    
    // Sprawdź health API
    if (!checkHealth()) {
        writeLog("❌ Skipping sync due to health check failure");
        exit(1);
    }
    
    // Wykonaj synchronizację
    $success = syncHydroData();
    
    if ($success) {
        writeLog("=== Cron Job Completed Successfully ===");
        exit(0);
    } else {
        writeLog("=== Cron Job Failed ===");
        exit(1);
    }
    
} catch (Exception $e) {
    writeLog("❌ Fatal error: " . $e->getMessage());
    exit(1);
}
?> 