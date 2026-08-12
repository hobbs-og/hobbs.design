/* ============================================================
   contact-form.js — homepage contact form

   Submits to Web3Forms (a static-form backend: no server code,
   no API keys to run or rotate on our side, just an access key
   in the form itself). Progressive enhancement, same as sheet.js:
   the form's real method/action already work as a plain POST, so
   a visitor with JS disabled still reaches Web3Forms and sees its
   default confirmation page. This script only upgrades that into
   an inline status message without leaving the page.
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

    fetch(form.action, {
      method: 'POST',
      body: new FormData(form),
      headers: { Accept: 'application/json' }
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data.success) throw new Error(data.message || 'Something went wrong.');
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
