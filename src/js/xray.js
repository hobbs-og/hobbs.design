// X-ray view toggle. Progressive enhancement: without JS the
// toggle simply does nothing and the page reads normally.
(function () {
  var toggle = document.querySelector('.xray-toggle');
  if (!toggle) return;

  var buttons = toggle.querySelectorAll('button');

  function setMode(on) {
    document.documentElement.classList.toggle('xray', on);
    buttons.forEach(function (b) {
      b.setAttribute('aria-pressed', String((b.dataset.mode === 'xray') === on));
    });
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      setMode(b.dataset.mode === 'xray');
    });
  });

  // Escape always returns to the design view.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMode(false);
  });
})();
