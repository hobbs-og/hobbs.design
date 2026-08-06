<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo "❌ Invalid request method.";
    exit;
}

// UTF-8 safe function
function utf8_safe($str) {
    return mb_convert_encoding(trim($str), 'UTF-8', 'UTF-8');
}

// Sanitize inputs
$name = isset($_POST['name']) ? utf8_safe($_POST['name']) : '';
$email = isset($_POST['email']) ? utf8_safe($_POST['email']) : '';
$message = isset($_POST['message']) ? utf8_safe($_POST['message']) : '';

if (!$name || !$email || !$message) {
    echo "❌ All fields are required.";
    exit;
}

// SendGrid settings
// The API key is never stored in this file. It comes from the server
// environment, or from config.local.php, which is gitignored.
$apiKey = getenv('SENDGRID_API_KEY') ?: null;

if (!$apiKey && file_exists(__DIR__ . '/config.local.php')) {
    $localConfig = require __DIR__ . '/config.local.php';
    $apiKey = $localConfig['SENDGRID_API_KEY'] ?? null;
}

if (!$apiKey) {
    error_log('send_mail.php: SENDGRID_API_KEY is not configured.');
    echo "❌ Mail is not configured. Please email mark@hobbs.design directly.";
    exit;
}

$fromEmail = 'hobbs.design.contact@gmail.com'; // Verified Gmail in SendGrid
$toEmail = 'mark@hobbs.design';

// Build payload
$data = [
    "personalizations" => [[
        "to" => [["email" => $toEmail]],
        "subject" => "Website Contact Form Submission"
    ]],
    "from" => ["email" => $fromEmail, "name" => "hobbs.design Contact Form"],
    "reply_to" => ["email" => $email],
    "content" => [[
        "type" => "text/html",
        "value" => "<p><strong>Name:</strong> {$name}</p>
                    <p><strong>Email:</strong> {$email}</p>
                    <p><strong>Message:</strong><br>" . nl2br(htmlspecialchars($message)) . "</p>"
    ]]
];

// JSON encode with error checking
$jsonPayload = json_encode($data, JSON_UNESCAPED_UNICODE);
if ($jsonPayload === false) {
    echo "❌ JSON encode error: " . json_last_error_msg();
    exit;
}

// Send email via cURL
$ch = curl_init('https://api.sendgrid.com/v3/mail/send');
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $jsonPayload,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer $apiKey",
        "Content-Type: application/json"
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_SSL_VERIFYPEER => true
]);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

// Return result to form
if ($error) {
    echo "❌ cURL Error: $error";
} elseif ($httpCode >= 200 && $httpCode < 300) {
    echo "✅ Your message was sent successfully!";
} else {
    echo "❌ SendGrid HTTP $httpCode. Response: " . htmlspecialchars($response);
}
