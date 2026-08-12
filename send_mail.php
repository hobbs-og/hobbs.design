<?php
// display_errors stays off: this echoes its response body directly into
// the page (see contact.html's respDiv.innerHTML = text), so a raw PHP
// warning or the raw SendGrid response would render straight to a
// visitor. Errors still go to the server log instead.
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo "❌ Invalid request method.";
    exit;
}

// Honeypot: a field no real visitor can see or fill. A bot that fills
// every input trips it. Reply exactly like a real success so nothing
// about the trap is observable, but skip the actual send.
if (!empty($_POST['botcheck'])) {
    echo "✅ Your message was sent successfully!";
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
    http_response_code(422);
    echo "❌ All fields are required.";
    exit;
}

$email = filter_var($email, FILTER_VALIDATE_EMAIL);
if (!$email) {
    http_response_code(422);
    echo "❌ Enter a valid email address.";
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
    http_response_code(500);
    echo "❌ Mail is not configured. Please email mark@hobbs.design directly.";
    exit;
}

$fromEmail = 'hobbs.design.contact@gmail.com'; // Verified Gmail in SendGrid
$toEmail = 'mark@hobbs.design';

// Build payload. Name and email are shown back inside the HTML body,
// so they're escaped the same as the message already was — otherwise
// either field is a place to inject markup into mail you trust.
$data = [
    "personalizations" => [[
        "to" => [["email" => $toEmail]],
        "subject" => "Website Contact Form Submission"
    ]],
    "from" => ["email" => $fromEmail, "name" => "hobbs.design Contact Form"],
    "reply_to" => ["email" => $email],
    "content" => [[
        "type" => "text/html",
        "value" => "<p><strong>Name:</strong> " . htmlspecialchars($name) . "</p>
                    <p><strong>Email:</strong> " . htmlspecialchars($email) . "</p>
                    <p><strong>Message:</strong><br>" . nl2br(htmlspecialchars($message)) . "</p>"
    ]]
];

// JSON encode with error checking
$jsonPayload = json_encode($data, JSON_UNESCAPED_UNICODE);
if ($jsonPayload === false) {
    error_log('send_mail.php: json_encode failed: ' . json_last_error_msg());
    http_response_code(500);
    echo "❌ Could not build the message. Please email mark@hobbs.design directly.";
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

// Return result to form. Failure detail goes to the server log, not
// the browser: the raw SendGrid response can carry account-specific
// detail that has no business being visible to a site visitor.
if ($error) {
    error_log("send_mail.php: cURL error: $error");
    http_response_code(502);
    echo "❌ Could not send your message right now. Please email mark@hobbs.design directly.";
} elseif ($httpCode >= 200 && $httpCode < 300) {
    echo "✅ Your message was sent successfully!";
} else {
    error_log("send_mail.php: SendGrid HTTP $httpCode. Response: $response");
    http_response_code(502);
    echo "❌ Could not send your message right now. Please email mark@hobbs.design directly.";
}
