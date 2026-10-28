/* theme.js: dark-mode switch.
   Sets data-theme on <html> (the token CSS already keys off it) and
   remembers the choice. With no stored choice the page follows the OS
   via prefers-color-scheme. Loaded in <head> so the theme is set before
   first paint. */
(function () {
  var root = document.documentElement;
  var KEY = 'hobbs-theme';
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}
  if (stored === 'light' || stored === 'dark') root.setAttribute('data-theme', stored);

  function current() {
    var t = root.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function sync() {
    var dark = current() === 'dark';
    document.querySelectorAll('[data-theme-switch]').forEach(function (i) { i.checked = dark; });
  }

  document.addEventListener('change', function (e) {
    var i = e.target.closest('[data-theme-switch]');
    if (!i) return;
    var t = i.checked ? 'dark' : 'light';
    root.setAttribute('data-theme', t);
    try { localStorage.setItem(KEY, t); } catch (err) {}
    sync();
  });

  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', sync);
  document.addEventListener('DOMContentLoaded', sync);
})();
