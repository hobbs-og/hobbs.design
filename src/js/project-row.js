/* ============================================================
   project-row.js — whole-row click target for the work index

   The row keeps a single real, keyboard-focusable <a> (the "View
   project" CTA) rather than nesting a second link around content
   that already contains one. A click anywhere else in the row is
   forwarded to that link, so mouse users get a full-width target
   while sheet.js's own delegated listener still does the work of
   opening the case study.
   ============================================================ */
(function () {
  document.addEventListener('click', function (e) {
    var row = e.target.closest && e.target.closest('.project-row--index');
    if (!row) return;
    if (e.target.closest('a, button')) return;

    var link = row.querySelector('a[data-sheet="case"]');
    if (link) link.click();
  });
})();
