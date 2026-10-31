/* ============================================================
   sheet-reload.js — Back from a case study reloaded out of the sheet

   The sheet's URL is a pushState entry on the index's document.
   Reloading there loads the real case study page, but Chrome still
   counts that entry as the index's document, so Back only changes
   the URL and leaves the case study on screen. This page has to do
   the load itself.

   history.state survives the reload, so only that page sets this
   up. The path check lets in-page anchors go back as usual.
   ============================================================ */
(function () {
  if (!history.state || !history.state.sheet) return;

  var path = location.pathname;

  window.addEventListener('popstate', function () {
    if (location.pathname !== path) location.reload();
  });
})();
