<?php
/* ============================================================
   mail-check.php — TEMPORARY diagnostic. DELETE AFTER USE.

   send_mail.php reports success while nothing arrives and nothing
   appears in cPanel's Track Delivery, which means mail() is being
   accepted by something that isn't the Exim instance cPanel shows.
   Guessing at that from outside the server has cost several deploys,
   so this prints the handful of facts that decide which transport
   will actually work:

     - how PHP is configured to send mail at all
     - the server's real outbound identity, which is what SPF needs
     - whether outbound SMTP is permitted, and to where

   It takes a key in the query string. That is obscurity, not
   security — the point is only to keep it off a URL someone might
   stumble onto. It prints no credentials and sends nothing anywhere
   except one test message to mark@hobbs.design. Delete the file (and
   its line in .cpanel.yml) once we have the answer.
   ============================================================ */

if (($_GET['key'] ?? '') !== 'hd-mailcheck-8f3a91') {
    http_response_code(404);
    exit("Not found.\n");
}

header('Content-Type: text/plain; charset=UTF-8');

function line($label, $value) {
    printf("%-26s %s\n", $label . ':', $value);
}

echo "=== PHP mail configuration ===\n";
line('php version', PHP_VERSION);
line('mail() exists', function_exists('mail') ? 'yes' : 'NO');
line('sendmail_path', ini_get('sendmail_path') !== '' ? ini_get('sendmail_path') : '(empty)');
line('SMTP ini', ini_get('SMTP') !== '' ? ini_get('SMTP') : '(empty)');
line('smtp_port', ini_get('smtp_port') !== '' ? ini_get('smtp_port') : '(empty)');
line('mail.force_extra_params', ini_get('mail.force_extra_parameters') !== '' ? ini_get('mail.force_extra_parameters') : '(empty)');
line('disable_functions', ini_get('disable_functions') !== '' ? ini_get('disable_functions') : '(none)');

echo "\n=== server identity (what SPF has to authorise) ===\n";
line('hostname', php_uname('n'));
line('SERVER_ADDR', $_SERVER['SERVER_ADDR'] ?? '(unset)');
line('SERVER_NAME', $_SERVER['SERVER_NAME'] ?? '(unset)');
line('mbstring loaded', function_exists('mb_convert_encoding') ? 'yes' : 'no (as expected)');
line('curl loaded', function_exists('curl_init') ? 'yes' : 'no');
line('openssl loaded', extension_loaded('openssl') ? 'yes' : 'no');

/* Which outbound routes are open decides whether authenticated SMTP is
   even an option here. GoDaddy blocks outbound SMTP to third parties on
   some shared plans and expects its own relay instead, so both are
   tested rather than assumed. */
echo "\n=== outbound SMTP reachability (5s timeout each) ===\n";
$targets = [
    'relay-hosting.secureserver.net:25' => ['relay-hosting.secureserver.net', 25],
    'smtpout.secureserver.net:25'       => ['smtpout.secureserver.net', 25],
    'smtp.office365.com:587'            => ['smtp.office365.com', 587],
    'localhost:25'                      => ['127.0.0.1', 25],
];

foreach ($targets as $label => $t) {
    $errno = 0;
    $errstr = '';
    $fp = @fsockopen($t[0], $t[1], $errno, $errstr, 5);
    if ($fp) {
        stream_set_timeout($fp, 5);
        $banner = trim((string) fgets($fp, 512));
        fclose($fp);
        line($label, 'OPEN — ' . ($banner !== '' ? $banner : '(no banner)'));
    } else {
        line($label, "blocked//failed — $errstr ($errno)");
    }
}

echo "\n=== live mail() attempt ===\n";
$to = 'mark@hobbs.design';
$from = 'noreply@hobbs.design';
$stamp = 'MAILCHECK-' . date('His');

$headers = implode("\r\n", [
    'From: hobbs.design diagnostic <' . $from . '>',
    'Reply-To: ' . $from,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8'
]);

$ok = mail($to, 'mail-check ' . $stamp, "Diagnostic probe $stamp from mail-check.php.\n", $headers, '-f' . $from);

line('marker', $stamp);
line('mail() returned', $ok ? 'true' : 'false');

$last = error_get_last();
line('last php error', $last ? ($last['message'] . ' @ ' . basename($last['file']) . ':' . $last['line']) : '(none)');

echo "\nIf mail() returned true and nothing arrives, PHP handed the message\n";
echo "to whatever sendmail_path names above and that is where it stopped.\n";
echo "DELETE THIS FILE once the output has been read.\n";
