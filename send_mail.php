<?php
/* ============================================================
   send_mail.php — the contact form endpoint

   One job: email mark@hobbs.design. It uses PHP's mail() and
   nothing else — no API, no key, no library, no vendor account to
   keep verified. The web host runs a mail transfer agent; this
   hands a message to it and reports what happened.

   That replaced SendGrid, which had never once delivered from this
   host: it answered 4xx/5xx while every visitor got a dead form.
   An API that has to be configured correctly somewhere else is a
   second thing that can be broken, and this form does not need it.

   Answers in plain text with a real HTTP status, which is what
   src/js/contact-form.js reads:
     200  sent
     405  not a POST
     422  a field is empty, or the address is malformed
     502  the mail transfer agent refused the message

   One thing mail() cannot tell us: it returns true when the local
   MTA *accepts* the message, not when it is delivered. Delivery
   depends on two things outside this file, both documented at the
   send below.
   ============================================================ */

// display_errors stays off: this response body is shown to the
// visitor — inline with JS on, as the whole page body on a plain form
// POST with JS off — so a raw PHP warning would be visible to them.
// Errors go to the server log instead.
ini_set('display_errors', '0');
ini_set('log_errors', '1');
error_reporting(E_ALL);

/* With display_errors off, a fatal error ends the request as a 500
   with an empty body, and the form can only say "something went
   wrong". That is precisely how the previous version failed for two
   weeks without leaving a clue in the browser. Turn any fatal into
   the same answer the other failure paths give, and put the real
   reason in the log. */
register_shutdown_function(function () {
    $fatal = error_get_last();

    if (!$fatal || !in_array($fatal['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        return;
    }

    error_log("send_mail.php: fatal: {$fatal['message']} in {$fatal['file']}:{$fatal['line']}");

    if (!headers_sent()) {
        http_response_code(500);
    }
    echo "❌ Could not send your message right now. Please email mark@hobbs.design directly.";
});

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo "❌ Invalid request method.";
    exit;
}

// Honeypot: a field no real visitor can see or fill. A bot that fills
// every input trips it. Reply exactly like a real success so nothing
// about the trap is observable, but skip the send.
if (!empty($_POST['botcheck'])) {
    echo "✅ Your message was sent successfully!";
    exit;
}

/* Strip CR and LF from anything that goes into a header. Mail headers
   are newline-separated, so a newline in a submitted value is how you
   inject extra ones — a second Bcc, a different From. The body can
   keep its line breaks; only headers are structural.

   Note there is no mb_* call anywhere in this file. This host has no
   mbstring extension, and assuming otherwise is what made the form
   fatal with a blank 500 in the first place. */
function header_safe($value) {
    return trim(preg_replace('/[\r\n]+/', ' ', (string) $value));
}

$name    = header_safe($_POST['name'] ?? '');
$email   = header_safe($_POST['email'] ?? '');
$message = trim((string) ($_POST['message'] ?? ''));

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

$to = 'mark@hobbs.design';

/* The From is on this domain, and it has to be.
   hobbs.design publishes DMARC p=reject, so a From of
   someone@hobbs.design that fails authentication is rejected outright
   rather than filed in Junk. Two consequences worth knowing:

     - The visitor's own address cannot be the From. Their domain
       would never authorise this server to send as them, so DMARC
       would reject it. Their address is the Reply-To instead, so
       hitting reply still answers them.
     - Delivery depends on this host's outbound mail passing SPF for
       hobbs.design. The site's own A record (173.201.180.75) is not
       in GoDaddy's SPF, so if outbound mail leaves from that address
       rather than through GoDaddy's relay, DMARC will reject it. That
       is a DNS/hosting fact, not something this file can fix — see
       the note in the deploy config.

   The other prerequisite is cPanel's Email Routing. hobbs.design's MX
   is external (Proofpoint, in front of Microsoft 365), so routing must
   be Remote Mail Exchanger or Automatically Detect. Set to Local,
   Exim delivers into a local mailbox nobody reads while mail() still
   returns true and this endpoint reports success. */
$from = 'noreply@hobbs.design';

$subject = 'Contact form: ' . $name;

$headers = implode("\r\n", [
    'From: hobbs.design contact form <' . $from . '>',
    'Reply-To: ' . $email,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8'
]);

$body = "Name:  $name\n"
      . "Email: $email\n\n"
      . $message . "\n";

/* -f sets the envelope sender, which keeps bounces on this domain
   instead of the PHP user's address. Some shared hosts refuse the
   additional-parameters argument outright, so a refusal is retried
   without it: a message delivered with a mismatched envelope beats no
   message at all. */
$sent = mail($to, $subject, $body, $headers, '-f' . $from)
     || mail($to, $subject, $body, $headers);

if ($sent) {
    echo "✅ Your message was sent successfully!";
    exit;
}

// mail() returning false means the local MTA refused the message
// outright, which is a server-side problem worth a log line.
error_log('send_mail.php: mail() returned false — the MTA refused the message.');
http_response_code(502);
echo "❌ Could not send your message right now. Please email mark@hobbs.design directly.";
