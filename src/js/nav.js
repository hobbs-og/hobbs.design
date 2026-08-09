/* ============================================================
   nav.js — mobile menu

   The panel is a native <dialog>, so Escape, focus containment and
   focus restoration to the hamburger come from the platform. This
   only wires the open and close, and closes on link activation so
   the anchor scroll happens against the page rather than behind a
   full-screen overlay.

   Without JavaScript the hamburger does nothing and the links are
   still reachable: the panel's markup is a plain nav, and every
   destination is also linked from the page itself.
   ============================================================ */
(function () {
  var toggle = document.querySelector('.site-nav__toggle');
  var panel = document.querySelector('.sheet--nav');
  if (!toggle || !panel || typeof panel.showModal !== 'function') return;

  var closeBtn = panel.querySelector('.sheet__close');

  function setExpanded(open) {
    toggle.setAttribute('aria-expanded', String(open));
  }

  function openPanel() {
    panel.showModal();
    setExpanded(true);
  }

  function closePanel() {
    panel.close();
    setExpanded(false);
  }

  toggle.addEventListener('click', openPanel);
  if (closeBtn) closeBtn.addEventListener('click', closePanel);

  // Escape and any other native dismissal.
  panel.addEventListener('close', function () { setExpanded(false); });

  // Let the link do its own navigation; just get the panel out of
  // the way first so the scroll lands somewhere visible.
  panel.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a[href]')) closePanel();
  });
})();
