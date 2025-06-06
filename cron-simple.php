<?php
/**
 * Prosty skrypt cron dla Hydro API
 * Używa uproszczonego endpointu sync-simple (10 stacji na raz)
 * Umieść na hostingu i skonfiguruj cron: 0 * * * * /usr/bin/php /path/to/cron-simple.php
 */

$url = 'https://hydro-api-ygjs.vercel.app/api/sync-simple';
$token = 'hydro-cron-secret-2025';

// Przygotuj dane POST
$data = json_encode(['source' => 'cron']);

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
    CURLOPT_TIMEOUT => 30,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_USERAGENT => 'Hydro-API-Cron/1.0'
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
    echo "SUCCESS: " . date('Y-m-d H:i:s') . " - " . $result['message'] . "\n";
    if (isset($result['stats'])) {
        $stats = $result['stats'];
        echo "Stats: {$stats['processed_stations']} processed, {$stats['synced_stations']} new, {$stats['synced_measurements']} measurements, {$stats['errors']} errors\n";
    }
    exit(0);
} else {
    echo "FAILED: " . date('Y-m-d H:i:s') . " - " . ($result['message'] ?? 'Unknown error') . "\n";
    exit(1);
}
?> 