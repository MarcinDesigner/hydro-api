<?php
// Testowy skrypt cron dla Hydro API
// Test podstawowej funkcjonalności bez bazy danych

$url = 'https://hydro-api-ygjs.vercel.app/api/cron-test';
$token = 'hydro-cron-secret-2025';

// Przygotuj dane POST
$data = json_encode(['source' => 'cron-test']);

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
    CURLOPT_USERAGENT => 'Hydro-API-Cron-Test/1.0'
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
    echo "Details: " . json_encode($result['received']) . "\n";
    exit(0);
} else {
    echo "FAILED: " . date('Y-m-d H:i:s') . " - " . ($result['message'] ?? 'Unknown error') . "\n";
    exit(1);
}
?> 