/* ============================================================
   nav.js — mobile menu

   The panel is a <dialog>, but opened with show() rather than
   showModal(): it deliberately stops below the header so the
   hamburger stays visible and doubles as the close control, and a
   modal would take the top layer and make everything outside it
   inert, including that button.

   That makes this a disclosure rather than a dialog, which is the
   more honest description anyway. The trade is that Escape and the
   focus moves are ours to handle, since only showModal() provides
   them.

   Without JavaScript the hamburger does nothing and every
   destination is still reachable from the page itself.
   ============================================================ */
(function () {
  var toggle = document.querySelector('.site-nav__toggle');
  var panel = document.querySelector('.sheet--nav');
  if (!toggle || !panel || typeof panel.show !== 'function') return;

  // Publish the header's real height so the panel can sit flush
  // beneath it. Measured rather than derived: which child is tallest
  // changes with the breakpoint, and the header may gain content.
  var header = document.querySelector('.site-nav');
  function publishHeight() {
    if (!header) return;
    var h = header.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--nav-height', h + 'px');
  }
  publishHeight();
  if ('ResizeObserver' in window && header) {
    new ResizeObserver(publishHeight).observe(header);
  } else {
    window.addEventListener('resize', publishHeight, { passive: true });
  }

  function isOpen() {
    return panel.hasAttribute('open');
  }

  function openPanel() {
    panel.show();
    toggle.setAttribute('aria-expanded', 'true');
    var first = panel.querySelector('a[href]');
    if (first) first.focus();
  }

  function closePanel(returnFocus) {
    if (!isOpen()) return;
    panel.close();
    toggle.setAttribute('aria-expanded', 'false');
    if (returnFocus) toggle.focus();
  }

  // The hamburger is the whole control: it opens, and once open it
  // is the X that closes.
  toggle.addEventListener('click', function () {
    if (isOpen()) closePanel(true);
    else openPanel();
  });

  // show() does not wire Escape the way showModal() does.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen()) closePanel(true);
  });

  // Let the link navigate; just get the panel out of the way first
  // so the anchor scroll lands somewhere visible.
  panel.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a[href]')) closePanel(false);
  });

  // Keep the toggle honest if the panel is closed by other means.
  panel.addEventListener('close', function () {
    toggle.setAttribute('aria-expanded', 'false');
  });

  // The panel is a mobile affordance; if the viewport grows past the
  // breakpoint while it is open, the desktop links take over and it
  // should not be left hanging.
  var wide = window.matchMedia('(min-width: 48rem)');
  var onChange = function (e) { if (e.matches) closePanel(false); };
  if (typeof wide.addEventListener === 'function') wide.addEventListener('change', onChange);
})();
