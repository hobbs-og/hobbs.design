/* ============================================================
   contact-form.js — the contact form on index.html and contact.html

   Submits to send_mail.php, which answers with a real HTTP status
   (200 on success, 405/422/500/502 on failure) and a plain-text
   body — no JSON to parse.

   Progressive enhancement, in two layers:

     1. No JS. The form's own method/action POST to send_mail.php,
        and the browser's native constraint validation catches an
        empty field or a malformed address before the request goes
        anywhere. This is why novalidate is set here in script and
        not in the markup: putting it in the HTML would take native
        validation away from the visitors who have nothing else.
     2. With JS. novalidate hands validation to this file, which
        shows the design system's own field error pattern inline
        (see molecules/field.css) instead of the browser's
        unstyleable bubbles, and submits without leaving the page.

   send_mail.php validates either way and is the authority. Nothing
   here is a security boundary — these checks exist to spare the
   visitor a round trip and to say what's wrong next to the field
   that's wrong, rather than as one vague line under the button.
   ============================================================ */
(function () {
  var form = document.getElementById('contactForm');
  if (!form) return;

  var status = form.querySelector('.contact__form-status');
  var button = form.querySelector('button[type="submit"]');

  // Take validation off the browser. See layer 1 above: the markup
  // deliberately doesn't carry novalidate.
  form.noValidate = true;

  /* Stricter than type="email", on purpose. Native validation accepts
     name@host with no dot in it, but the server's authority is
     filter_var/FILTER_VALIDATE_EMAIL, which rejects a bare host. A
     client check looser than the server's would wave that address
     through and answer with a server error, for something we could
     have said inline next to the field. Still deliberately simple:
     the full grammar for an address is not worth reimplementing here,
     and the server has the last word regardless. */
  var EMAIL = /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/;

  var messages = {
    name: 'Enter your name.',
    email: 'Enter your email address.',
    emailFormat: 'That doesn’t look like an email address — check for a typo.',
    message: 'Tell me a little about the work.'
  };

  function controls() {
    return [].slice.call(form.querySelectorAll('.field__control'));
  }

  function clearError(control) {
    var field = control.closest('.field');

    control.removeAttribute('aria-invalid');
    control.removeAttribute('aria-describedby');

    if (!field) return;
    field.classList.remove('field--error');

    var existing = field.querySelector('.field__error');
    if (existing) existing.remove();
  }

  function showError(control, text) {
    var field = control.closest('.field');
    if (!field) return;

    clearError(control);
    field.classList.add('field--error');
    control.setAttribute('aria-invalid', 'true');

    var error = document.createElement('p');
    error.className = 'field__error';
    error.id = control.id + '-error';
    error.textContent = text;
    field.appendChild(error);

    /* The message becomes the control's description rather than a
       live region, so a screen reader reads it when focus lands on
       the control — which is exactly where validate() sends focus
       for the first failure. Announcing every message at once would
       talk over itself on an empty form. */
    control.setAttribute('aria-describedby', error.id);
  }

  // The one place that decides whether a control is acceptable, so
  // submit and input can't drift apart on what counts as valid.
  function errorFor(control) {
    var value = control.value.trim();

    if (!value) return messages[control.name] || 'This field is required.';
    if (control.name === 'email' && !EMAIL.test(value)) return messages.emailFormat;

    return null;
  }

  function validate() {
    var firstInvalid = null;

    controls().forEach(function (control) {
      var problem = errorFor(control);

      if (problem) {
        showError(control, problem);
        if (!firstInvalid) firstInvalid = control;
      } else {
        clearError(control);
      }
    });

    // Focus the first failure: it puts the caret where the work is,
    // and it's what makes the message audible to a screen reader.
    if (firstInvalid) firstInvalid.focus();

    return !firstInvalid;
  }

  /* Clear a message as soon as its field becomes valid, so it goes
     away while the visitor is fixing it instead of surviving until
     the next submit. Nothing is validated on the way in: an error
     that appears before you've finished typing your address is noise,
     and it fires on every keystroke of a correct one. */
  form.addEventListener('input', function (e) {
    var control = e.target;

    if (control.classList.contains('field__control') &&
        control.getAttribute('aria-invalid') === 'true' &&
        !errorFor(control)) {
      clearError(control);
    }
  });

  /* send_mail.php's failure lines are written for a visitor to read,
     so show one when there is one — it's the difference between
     "something went wrong" and "mail is not configured". Guarded,
     because a failure upstream of PHP (an Apache 500, a proxy notice)
     answers with a whole HTML page, and that is not a status message.
     The ❌ it prefixes for the no-JS case is redundant next to the
     error styling here. */
  function serverText(body) {
    var raw = body || '';
    if (raw.length > 160 || raw.indexOf('<') !== -1) return '';
    return raw.replace(/^[❌✅]\s*/, '').trim();
  }

  function fail(body) {
    var text = serverText(body);
    var email = form.querySelector('[name="email"]');

    /* The server rejects some addresses this file accepts —
       filter_var is stricter about things like consecutive dots than
       a regex worth keeping readable. When that's what came back, put
       it on the field it's about instead of in the status line, so a
       422 lands the same way a local failure does. The server stays
       the authority; this only decides where its answer is shown. */
    if (email && /valid email/i.test(text)) {
      showError(email, text);
      email.focus();
      return;
    }

    status.textContent = text || 'Something went wrong. Email me directly at mark@hobbs.design.';
    status.classList.add('contact__form-status--error');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    status.textContent = '';
    status.classList.remove('contact__form-status--error');

    if (!validate()) return;

    button.disabled = true;
    button.textContent = 'Sending…';

    fetch(form.action, { method: 'POST', body: new FormData(form) })
      .then(function (res) {
        return res.text().then(function (body) {
          if (!res.ok) {
            fail(body);
            return;
          }

          form.reset();
          controls().forEach(clearError);
          status.textContent = 'Message sent — I’ll get back to you soon.';
        });
      })
      // Only a network-level failure reaches here: fail() already
      // handled every answer the server actually gave.
      .catch(function () {
        fail('');
      })
      .finally(function () {
        button.disabled = false;
        button.textContent = 'Send message';
      });
  });
})();
