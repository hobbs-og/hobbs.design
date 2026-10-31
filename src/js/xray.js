// X-ray view switch. Progressive enhancement: without JS the
// switch simply does nothing and the page reads normally. There is
// one switch in the header and one in the phone menu; both stay in sync.
(function () {
  var inputs = document.querySelectorAll('[data-xray-switch]');
  if (!inputs.length) return;

  function setMode(on) {
    document.documentElement.classList.toggle('xray', on);
    inputs.forEach(function (i) { i.checked = on; });
  }

  inputs.forEach(function (input) {
    input.addEventListener('change', function () {
      setMode(input.checked);
    });
  });

  // Escape always returns to the design view.
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMode(false);
  });
})();
