/* ============================================================
   sheet.js — case study overlay router

   Opens a case study as a sheet over the work index instead of
   navigating away, so closing returns the visitor to the exact
   row they clicked. Without JavaScript every link still works as
   an ordinary page load, which is the point of wiring it this way
   round.

   The panel is a native <dialog> opened with showModal(), so the
   platform provides focus containment, Escape, focus restoration
   to the trigger, the backdrop, and inerting of the page behind.
   None of that is reimplemented here.

   What is left for us:
   - pinning the page with position:fixed and a negative offset,
     the only reliable way to hold scroll position on iOS, and
     restoring it on close
   - a history entry, so Back closes the sheet rather than leaving
     the site
   - fetching and swapping case study content
   ============================================================ */
(function () {
  var sheet = document.querySelector('.sheet');
  if (!sheet || typeof sheet.showModal !== 'function') return;

  var body = sheet.querySelector('.sheet__body');
  var closeBtn = sheet.querySelector('.sheet__close');

  var cache = {};
  var inFlight = {};
  var savedScrollY = 0;
  var isOpen = false;
  var suppressHistory = false;

  // Closing the sheet pops a history entry, and the browser would
  // restore its own idea of the scroll position on that navigation,
  // overriding ours. We own the restore, so take it off the browser.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  function fetchCase(url) {
    if (cache[url]) return Promise.resolve(cache[url]);
    if (inFlight[url]) return inFlight[url];
    inFlight[url] = fetch(url)
      .then(function (r) { return r.text(); })
      .then(function (html) { cache[url] = html; return html; });
    return inFlight[url];
  }

  function lockScroll() {
    savedScrollY = window.pageYOffset;
    document.body.style.position = 'fixed';
    document.body.style.insetInlineStart = '0';
    document.body.style.insetInlineEnd = '0';
    document.body.style.insetBlockStart = -savedScrollY + 'px';
  }

  function unlockScroll() {
    var y = savedScrollY;
    document.body.style.position = '';
    document.body.style.insetInlineStart = '';
    document.body.style.insetInlineEnd = '';
    document.body.style.insetBlockStart = '';
    // After the pin is removed the page regains its full height, so
    // the scroll has to be set on the next frame, once that layout
    // has happened. Setting it in the same tick lands short.
    window.scrollTo(0, y);
    requestAnimationFrame(function () { window.scrollTo(0, y); });
  }

  function populate(html) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var incoming = doc.querySelector('main');
    if (!incoming) return false;

    body.innerHTML = '';
    while (incoming.firstChild) body.appendChild(incoming.firstChild);
    body.scrollTop = 0;

    var title = doc.querySelector('title');
    sheet.setAttribute('aria-label', title ? title.textContent : 'Case study');
    return true;
  }

  // `restoring` is set when the sheet is being reopened by a Forward
  // navigation, where the history entry already exists.
  function open(url, restoring) {
    if (isOpen) return swap(url);

    lockScroll();
    isOpen = true;
    sheet.setAttribute('aria-busy', 'true');
    sheet.showModal();

    if (!restoring) history.pushState({ sheet: url }, '', url);

    fetchCase(url).then(function (html) {
      if (!isOpen) return;
      populate(html);
      sheet.removeAttribute('aria-busy');
      body.focus();
    });
  }

  // Navigating between case studies while the sheet is already up:
  // replace content and the history entry, no slide.
  function swap(url) {
    sheet.setAttribute('aria-busy', 'true');
    fetchCase(url).then(function (html) {
      if (!isOpen) return;
      populate(html);
      sheet.removeAttribute('aria-busy');
      history.replaceState({ sheet: url }, '', url);
      body.focus();
    });
  }

  // Everything that has to happen when the sheet goes away, in one
  // place and safe to call twice. Escape and the close button reach
  // it by different routes, and `cancel` fires before `close`, so the
  // isOpen guard is what keeps it from running to completion twice.
  function teardown() {
    if (!isOpen) return;
    isOpen = false;

    unlockScroll();

    if (!suppressHistory) history.back();
    suppressHistory = false;

    body.innerHTML = '';
  }

  // Close the dialog and tear down. Used by every explicit exit.
  function dismiss() {
    if (!isOpen) return;
    sheet.close();
    teardown();
  }

  // Native exits: Escape fires cancel then close. Listening to both
  // means teardown still runs on engines that skip one of them.
  sheet.addEventListener('cancel', teardown);
  sheet.addEventListener('close', teardown);

  // Open from the work index.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-sheet="case"]');
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    open(a.getAttribute('href'));
  });

  // Follow links inside the sheet without leaving it.
  body.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#' || /^https?:/i.test(href)) return;
    if (!/\.html$/.test(href)) return;
    e.preventDefault();
    if (/terafina|fabrication|proof|rumi|frictionless/.test(href)) {
      swap(href);
    } else {
      window.location.href = href;
    }
  });

  // Prefetch on intent, so content is usually ready before the slide
  // finishes.
  ['mouseenter', 'touchstart', 'focusin'].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      var a = e.target.closest && e.target.closest('a[data-sheet="case"]');
      if (a) fetchCase(a.getAttribute('href'));
    }, { capture: true, passive: true });
  });

  // Clicking the backdrop targets the dialog itself.
  sheet.addEventListener('click', function (e) {
    if (e.target === sheet) dismiss();
  });

  if (closeBtn) closeBtn.addEventListener('click', dismiss);

  // Back closes without pushing another entry; Forward re-opens.
  window.addEventListener('popstate', function (e) {
    if (isOpen) {
      suppressHistory = true;
      dismiss();
    } else if (e.state && e.state.sheet) {
      open(e.state.sheet, true);
    }
  });
})();
