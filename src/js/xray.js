// X-ray view switch. Progressive enhancement: without JS the
// switch simply does nothing and the page reads normally.
(function () {
  var input = document.querySelector('[data-xray-switch]');
  if (!input) return;

  function setMode(on) {
    document.documentElement.classList.toggle('xray', on);
    input.checked = on;
  }

  input.addEventListener('change', function () {
    setMode(input.checked);
  });

  // Escape always returns to the design view.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMode(false);
  });
})();
