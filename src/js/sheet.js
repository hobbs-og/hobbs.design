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
  // Scoped to the case variant: the navigation panel is also a
  // .sheet, and it comes first in the document.
  var sheet = document.querySelector('.sheet--case');
  if (!sheet || typeof sheet.showModal !== 'function') return;

  var body = sheet.querySelector('.sheet__body');
  var closeBtn = sheet.querySelector('.sheet__close');
  var backBtn = sheet.querySelector('.sheet__back');

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
    // has happened. Setting it in the same tick lands short. Both
    // calls are explicitly instant: base/global.css puts smooth
    // scroll-behavior on html for in-page anchor nav, which would
    // otherwise animate this restore into a visible jump-then-glide.
    window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    requestAnimationFrame(function () {
      window.scrollTo({ top: y, left: 0, behavior: 'instant' });
    });
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

  // Swipe-to-close (mobile only — the handle is display:none above
  // that breakpoint, and the desktop sheet slides in from the side,
  // not up from the bottom, so a vertical drag wouldn't make sense
  // there). Dragging is read from the whole chrome bar, not just the
  // thin handle rule, so the hit area is generous; the close button
  // opts itself out so its own click still works.
  //
  // The sheet is dragged with an inline transform while the pointer
  // is down. On release it either springs back to open (clearing the
  // inline style lets the [open] rule's transition take over) or
  // finishes the close animation itself before handing off to
  // dismiss() — dismiss()'s own transition would otherwise start
  // from translateY(0) and jump, since it doesn't know a drag was
  // already partway there.
  var chrome = sheet.querySelector('.sheet__chrome');
  var DISMISS_DISTANCE = 120; // px dragged before it counts as intentional
  var DISMISS_VELOCITY = 0.5; // px/ms — a flick counts even if short

  function isMobileSheet() {
    return window.matchMedia('(max-width: 47.9375rem)').matches;
  }

  if (chrome && window.PointerEvent) {
    var dragging = false;
    var startY = 0;
    var lastDelta = 0;
    var startTime = 0;

    chrome.addEventListener('pointerdown', function (e) {
      if (!isOpen || !isMobileSheet()) return;
      if (e.target.closest('.sheet__close')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      dragging = true;
      startY = e.clientY;
      lastDelta = 0;
      startTime = e.timeStamp;
      sheet.style.transition = 'none';
      chrome.setPointerCapture(e.pointerId);
    });

    chrome.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var delta = e.clientY - startY;
      // Rubber-band resistance dragging upward — the sheet is
      // already fully open, there's nowhere for it to go.
      if (delta < 0) delta = delta / 3;
      lastDelta = delta;
      sheet.style.transform = 'translateY(' + delta + 'px)';
    });

    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      sheet.style.transition = '';
      // Re-enabling the transition and changing transform in the same
      // tick can get coalesced into one style recalc, which drops the
      // transition (and the transitionend it depends on below) — most
      // likely on a fast flick, where pointerup lands in the same
      // frame as the last pointermove. Forcing a flush in between
      // guarantees the transform change is seen as a genuine update.
      void sheet.offsetHeight;

      var elapsed = Math.max(1, e.timeStamp - startTime);
      var velocity = lastDelta / elapsed;
      var shouldDismiss = lastDelta > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY;

      if (!shouldDismiss) {
        sheet.style.transform = '';
        return;
      }

      // Finish the slide down under the drag's own transform, then
      // hand off to the normal close path once it's visually gone.
      // The timeout is a backstop in case transitionend never fires
      // (e.g. the transform was already at its target and no
      // transition triggers).
      var settled = false;
      function finish() {
        if (settled) return;
        settled = true;
        sheet.removeEventListener('transitionend', onDone);
        clearTimeout(fallback);
        sheet.style.transform = '';
        dismiss();
      }
      function onDone(ev) {
        if (ev.target === sheet && ev.propertyName === 'transform') finish();
      }
      sheet.addEventListener('transitionend', onDone);
      var fallback = setTimeout(finish, 400);
      sheet.style.transform = 'translateY(100%)';
    }

    chrome.addEventListener('pointerup', endDrag);
    chrome.addEventListener('pointercancel', endDrag);
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
  if (backBtn) backBtn.addEventListener('click', dismiss);

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
