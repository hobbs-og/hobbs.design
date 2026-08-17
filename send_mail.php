<?php
// display_errors stays off: this response body is shown to the visitor
// — as an inline status message with JS on, and as the whole page body
// on a plain form POST with JS off — so a raw PHP warning or the raw
// SendGrid response would be visible to them, and both can carry
// server and account detail. Errors go to the server log instead.
ini_set('display_errors', '0');
ini_set('display_startup_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

// With display_errors off, a fatal error ends the request as a 500
// with an empty body — which is exactly what made the missing-mbstring
// bug below invisible from the browser: the form could only report a
// generic failure, with no clue what broke. Turn any fatal into the
// same plain-text answer the other failure paths give, and put the
// real reason where it belongs, in the server error log.
register_shutdown_function(function () {
    $fatal = error_get_last();
    $fatalTypes = [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR];

    if (!$fatal || !in_array($fatal['type'], $fatalTypes, true)) {
        return;
    }

    error_log("send_mail.php: fatal: {$fatal['message']} in {$fatal['file']}:{$fatal['line']}");

    if (!headers_sent()) {
        http_response_code(500);
    }
    echo "❌ Could not send your message right now. Please email mark@hobbs.design directly.";
});

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

// Scrub anything that isn't well-formed UTF-8, so json_encode() below
// can't refuse the payload.
//
// This used to call mb_convert_encoding() unconditionally. mbstring is
// not available on this host, so that was a call to an undefined
// function: a PHP fatal, which with display_errors off ends the
// request as a 500 with an empty body and tells the visitor nothing.
// Each strategy below is feature-detected, and the last one needs no
// extension at all.
function utf8_safe($str) {
    $str = trim((string) $str);

    if (function_exists('mb_convert_encoding')) {
        return mb_convert_encoding($str, 'UTF-8', 'UTF-8');
    }

    if (function_exists('iconv')) {
        $converted = iconv('UTF-8', 'UTF-8//IGNORE', $str);
        if ($converted !== false) {
            return $converted;
        }
    }

    // No extension available. An empty pattern still makes PCRE
    // validate the subject against /u: it matches when the string is
    // well-formed UTF-8 and returns false when it isn't.
    if (preg_match('//u', $str) === 1) {
        return $str;
    }

    // Malformed bytes, and nothing to transcode with. Drop everything
    // above ASCII rather than hand invalid UTF-8 to json_encode().
    return preg_replace('/[\x80-\xFF]/', '', $str) ?? '';
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

// Send email via cURL. Checked explicitly for the same reason
// utf8_safe() is feature-detected: this host turned out not to have
// every extension the code assumed, and a named reason in the log
// beats inferring one from a stack trace.
if (!function_exists('curl_init')) {
    error_log('send_mail.php: the cURL extension is not available.');
    http_response_code(500);
    echo "❌ Mail is not configured. Please email mark@hobbs.design directly.";
    exit;
}

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
