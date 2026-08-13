/* ============================================================
   contact-form.js — homepage contact form

   Submits to send_mail.php, which answers with a real HTTP status
   (200 on success, 405/422/500/502 on failure) and a plain-text
   body — no JSON to parse. Progressive enhancement, same as
   sheet.js: the form's real method/action already work as a plain
   POST, so a visitor with JS disabled still reaches send_mail.php
   and sees its plain-text response. This script only upgrades that
   into an inline status message without leaving the page.
   ============================================================ */
(function () {
  var form = document.getElementById('contactForm');
  if (!form) return;

  var status = form.querySelector('.contact__form-status');
  var button = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    button.disabled = true;
    button.textContent = 'Sending…';
    status.textContent = '';
    status.classList.remove('contact__form-status--error');

    fetch(form.action, { method: 'POST', body: new FormData(form) })
      .then(function (res) {
        if (!res.ok) throw new Error('send failed');
        form.reset();
        status.textContent = 'Message sent — I’ll get back to you soon.';
      })
      .catch(function () {
        status.textContent = 'Something went wrong. Email me directly at mark@hobbs.design.';
        status.classList.add('contact__form-status--error');
      })
      .finally(function () {
        button.disabled = false;
        button.textContent = 'Send message';
      });
  });
})();
