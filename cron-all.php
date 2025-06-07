<?php
/**
 * Pełny skrypt cron dla Hydro API
 * Pobiera WSZYSTKIE 866+ stacji w jednym request
 * Uruchom co godzinę: 0 * * * * /usr/bin/php /path/to/cron-all.php
 */

$url = 'https://hydro-main.vercel.app/api/sync-all';
$token = 'hydro-cron-secret-2025';

// Przygotuj dane POST
$data = json_encode(['source' => 'cron-full']);

// Przygotuj nagłówki
$headers = [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $token,
    'Content-Length: ' . strlen($data)
];

// Inicjalizuj cURL
$ch = curl_init();

// Ustaw opcje cURL
curl_setopt_array($ch, [
    CURLOPT_URL => $url,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $data,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 60, // Zwiększony timeout dla wszystkich stacji
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_USERAGENT => 'Hydro-API-Full-Cron/1.0'
]);

// Wykonaj request
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);

curl_close($ch);

// Sprawdź wynik
if ($error) {
    echo "FAILED: " . date('Y-m-d H:i:s') . " - cURL Error: " . $error . "\n";
    exit(1);
}

if ($httpCode !== 200) {
    echo "FAILED: " . date('Y-m-d H:i:s') . " - HTTP " . $httpCode . "\n";
    if ($response) {
        echo "Response: " . $response . "\n";
    }
    exit(1);
}

// Parsuj odpowiedź JSON
$result = json_decode($response, true);

if (!$result) {
    echo "FAILED: " . date('Y-m-d H:i:s') . " - Invalid JSON response\n";
    exit(1);
}

if ($result['status'] === 'success') {
    $stats = $result['stats'];
    $perf = $result['performance'];
    
    echo "SUCCESS: " . date('Y-m-d H:i:s') . " - ALL {$stats['total_stations']} stations synchronized!\n";
    echo "Results: {$stats['new_stations']} new, {$stats['updated_stations']} updated, {$stats['synced_measurements']} measurements, {$stats['errors']} errors\n";
    echo "Performance: {$perf['total_time_ms']}ms total, {$perf['stations_per_second']} stations/sec, {$stats['success_rate']}% success rate\n";
    exit(0);
} else {
    echo "FAILED: " . date('Y-m-d H:i:s') . " - " . ($result['message'] ?? 'Unknown error') . "\n";
    exit(1);
}
?> 