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

$toEmail = 'mark@hobbs.design';
$subject = 'Website Contact Form Submission';

/* Two transports, tried in order, because one of them being
   misconfigured should not be the same thing as losing the message.
   SendGrid is preferred: it reports why it refused, and it doesn't
   depend on how this host's MTA is set up. The server's own mail() is
   the fallback for exactly the situation this endpoint was in — the
   API answering 4xx or 5xx while every visitor got a dead form.

   Each returns true on success, or a string describing the failure
   for the log. The visitor never sees either string: an API response
   can carry account detail that is none of their business. */

function send_via_sendgrid($apiKey, $toEmail, $subject, $name, $email, $message) {
    if (!$apiKey) {
        return 'SENDGRID_API_KEY is not configured';
    }

    // Checked explicitly for the same reason utf8_safe() is
    // feature-detected: this host turned out not to have every
    // extension the code assumed, and a named reason in the log beats
    // inferring one from a stack trace.
    if (!function_exists('curl_init')) {
        return 'the cURL extension is not available';
    }

    /* The From has to be an identity SendGrid has verified for this
       account, which is the single most common reason it returns 403.
       It is not the visitor's address — a visitor's domain would
       never authorise this account to send as them. Their address is
       the Reply-To, so a reply goes to them. */
    $fromEmail = 'hobbs.design.contact@gmail.com';

    // Name and email are shown back inside the HTML body, so they're
    // escaped the same as the message already was — otherwise either
    // field is a place to inject markup into mail you trust.
    $data = [
        'personalizations' => [[
            'to' => [['email' => $toEmail]],
            'subject' => $subject
        ]],
        'from' => ['email' => $fromEmail, 'name' => 'hobbs.design Contact Form'],
        'reply_to' => ['email' => $email],
        'content' => [[
            'type' => 'text/html',
            'value' => '<p><strong>Name:</strong> ' . htmlspecialchars($name) . '</p>
                        <p><strong>Email:</strong> ' . htmlspecialchars($email) . '</p>
                        <p><strong>Message:</strong><br>' . nl2br(htmlspecialchars($message)) . '</p>'
        ]]
    ];

    $jsonPayload = json_encode($data, JSON_UNESCAPED_UNICODE);
    if ($jsonPayload === false) {
        return 'json_encode failed: ' . json_last_error_msg();
    }

    $ch = curl_init('https://api.sendgrid.com/v3/mail/send');
    curl_setopt_array($ch, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $jsonPayload,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer $apiKey",
            'Content-Type: application/json'
        ],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_TIMEOUT => 15
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);

    if ($error) {
        return "cURL error: $error";
    }
    if ($httpCode >= 200 && $httpCode < 300) {
        return true;
    }

    return "SendGrid HTTP $httpCode. Response: $response";
}

function send_via_mail($toEmail, $subject, $name, $email, $message) {
    if (!function_exists('mail')) {
        return 'mail() is not available';
    }

    /* The From must be on this domain. A gmail.com From handed to this
       server's MTA fails SPF and DMARC at any real recipient, which is
       the fastest way to have a message dropped rather than delivered
       — so the API's verified Gmail identity is deliberately not
       reused here. The visitor's address is the Reply-To instead. */
    $fromEmail = 'noreply@hobbs.design';

    /* filter_var already rejected any address containing a newline, so
       this can't smuggle extra headers. Stripped again anyway: header
       assembly is where injection lives, and this line should be safe
       on its own terms rather than because of a check made fifty
       lines earlier. */
    $replyTo = preg_replace('/[\r\n]+/', '', $email);
    $safeName = preg_replace('/[\r\n]+/', ' ', $name);

    $headers = implode("\r\n", [
        'From: hobbs.design Contact Form <' . $fromEmail . '>',
        'Reply-To: ' . $replyTo,
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8'
    ]);

    /* Plain text rather than the API's HTML: this path exists to get
       the words through, and text has nothing to render wrong.

       The footer names the transport on purpose. hobbs.design's MX is
       external (Proofpoint, ppe-hosted.com) while the site runs on the
       GoDaddy web host, so whether this message leaves the building at
       all depends on that account's Email Routing being Remote rather
       than Local. Set to Local, Exim would drop it in a local mailbox
       nobody reads while this endpoint reported success. If a form
       submission arrives carrying this line, the fallback works; if
       the form says sent and nothing arrives, that setting is why. */
    $body = "Name: $safeName\nEmail: $replyTo\n\n$message"
          . "\n\n---\nSent through the web server's own mail(), because the SendGrid API refused.";

    /* -f sets the envelope sender, which is what keeps the bounce
       address on this domain instead of the PHP user's. Some shared
       hosts refuse additional parameters outright, so a refusal is
       retried without it — a message delivered with a mismatched
       envelope beats no message. */
    if (mail($toEmail, $subject, $body, $headers, '-f' . $fromEmail)) {
        return true;
    }
    if (mail($toEmail, $subject, $body, $headers)) {
        return true;
    }

    return 'mail() returned false';
}

// The API key is never stored in this file. It comes from the server
// environment, or from config.local.php, which is gitignored.
$apiKey = getenv('SENDGRID_API_KEY') ?: null;

if (!$apiKey && file_exists(__DIR__ . '/config.local.php')) {
    $localConfig = require __DIR__ . '/config.local.php';
    $apiKey = $localConfig['SENDGRID_API_KEY'] ?? null;
}

$sendgrid = send_via_sendgrid($apiKey, $toEmail, $subject, $name, $email, $message);

if ($sendgrid === true) {
    echo "✅ Your message was sent successfully!";
    exit;
}

// SendGrid refused. Log why — that line is the whole diagnosis — and
// try the server's own mail before giving up on the visitor.
error_log("send_mail.php: SendGrid failed: $sendgrid");

$fallback = send_via_mail($toEmail, $subject, $name, $email, $message);

if ($fallback === true) {
    error_log('send_mail.php: delivered via mail() after SendGrid failed.');
    echo "✅ Your message was sent successfully!";
    exit;
}

error_log("send_mail.php: mail() fallback also failed: $fallback");
http_response_code(502);
echo "❌ Could not send your message right now. Please email mark@hobbs.design directly.";
