/* ============================================================
   sheet.js — case study overlay router

   Opens a case study as a sheet over the work index instead of
   navigating away, so closing returns the visitor to the exact
   row they clicked. Without JavaScript every link still works as
   an ordinary page load, which is the whole point of wiring it
   this way round.

   Mechanics worth knowing:
   - the page is pinned with position:fixed and a negative top
     offset while the sheet is open, which is the only reliable
     way to stop background scroll on iOS without losing place
   - opening pushes a history entry, so Back closes the sheet
     rather than leaving the site
   - focus moves into the sheet and returns to the trigger on
     close; Tab is trapped while it is open
   ============================================================ */
(function () {
  var scrim = document.querySelector('.sheet-scrim');
  var sheet = document.querySelector('.sheet');
  if (!scrim || !sheet) return;

  var body = sheet.querySelector('.sheet__body');
  var closeBtn = sheet.querySelector('.sheet__close');
  var main = document.querySelector('main');
  var siteNav = document.querySelector('.site-nav');

  var cache = {};        // url -> html
  var inFlight = {};     // url -> promise
  var savedScrollY = 0;
  var lastTrigger = null;
  var isOpen = false;
  var currentUrl = null;

  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]),' +
    ' select, textarea, [tabindex]:not([tabindex="-1"])';

  function isCaseLink(a) {
    return a && a.dataset && a.dataset.sheet === 'case';
  }

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
    document.body.style.inlineSize = '100%';
  }

  function unlockScroll() {
    document.body.style.position = '';
    document.body.style.insetInlineStart = '';
    document.body.style.insetInlineEnd = '';
    document.body.style.insetBlockStart = '';
    document.body.style.inlineSize = '';
    window.scrollTo(0, savedScrollY);
  }

  // Hide the page behind from assistive tech while the sheet owns
  // the screen. `inert` where supported, aria-hidden as the floor.
  function setBackgroundHidden(hidden) {
    [main, siteNav].forEach(function (el) {
      if (!el) return;
      if (hidden) {
        el.setAttribute('aria-hidden', 'true');
        if ('inert' in HTMLElement.prototype) el.inert = true;
      } else {
        el.removeAttribute('aria-hidden');
        if ('inert' in HTMLElement.prototype) el.inert = false;
      }
    });
  }

  function populate(html, url) {
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var incoming = doc.querySelector('main');
    if (!incoming) return false;

    body.innerHTML = '';
    while (incoming.firstChild) body.appendChild(incoming.firstChild);
    body.scrollTop = 0;

    var title = doc.querySelector('title');
    sheet.setAttribute('aria-label', title ? title.textContent : 'Case study');
    currentUrl = url;
    return true;
  }

  function open(url, trigger) {
    if (isOpen) return swap(url);
    lastTrigger = trigger || null;

    lockScroll();
    isOpen = true;
    scrim.classList.add('is-open');
    sheet.classList.add('is-open');
    sheet.setAttribute('aria-busy', 'true');
    setBackgroundHidden(true);

    history.pushState({ sheet: url }, '', url);

    fetchCase(url).then(function (html) {
      if (!isOpen) return;
      populate(html, url);
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
      populate(html, url);
      sheet.removeAttribute('aria-busy');
      history.replaceState({ sheet: url }, '', url);
      body.focus();
    });
  }

  function close(fromPopstate) {
    if (!isOpen) return;
    isOpen = false;

    scrim.classList.remove('is-open');
    sheet.classList.remove('is-open');
    setBackgroundHidden(false);
    unlockScroll();

    if (!fromPopstate) history.back();

    // Clear content only once the panel has slid away, so the
    // sheet doesn't visibly empty itself mid-animation.
    var wait = parseFloat(getComputedStyle(sheet).transitionDuration) * 1000 || 0;
    window.setTimeout(function () {
      if (!isOpen) body.innerHTML = '';
    }, wait);

    if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus();
    lastTrigger = null;
    currentUrl = null;
  }

  // Open from the work index.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[data-sheet="case"]');
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    open(a.getAttribute('href'), a);
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
    if (isCaseLink(a) || /terafina|fabrication|proof|rumi|frictionless/.test(href)) {
      swap(href);
    } else {
      window.location.href = href;
    }
  });

  // Prefetch on intent, so the content is usually ready before
  // the slide finishes.
  ['mouseenter', 'touchstart', 'focusin'].forEach(function (evt) {
    document.addEventListener(evt, function (e) {
      var a = e.target.closest && e.target.closest('a[data-sheet="case"]');
      if (a) fetchCase(a.getAttribute('href'));
    }, { capture: true, passive: true });
  });

  scrim.addEventListener('click', function () { close(); });
  if (closeBtn) closeBtn.addEventListener('click', function () { close(); });

  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { close(); return; }
    if (e.key !== 'Tab') return;

    var items = Array.prototype.filter.call(
      sheet.querySelectorAll(FOCUSABLE),
      function (el) { return el.offsetParent !== null; }
    );
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  });

  // Back button closes; forward re-opens.
  window.addEventListener('popstate', function (e) {
    if (isOpen) {
      close(true);
    } else if (e.state && e.state.sheet) {
      open(e.state.sheet, null);
    }
  });
})();
