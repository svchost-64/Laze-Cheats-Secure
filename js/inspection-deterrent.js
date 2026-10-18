/* Cosmetic friction only: browser DevTools and network resources remain accessible. */
(() => {
  document.addEventListener('contextmenu', event => {
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
  });
  document.addEventListener('dragstart', event => {
    if (event.target.closest('img')) event.preventDefault();
  });
  document.addEventListener('keydown', event => {
    if (event.altKey || event.metaKey) return;
    const key = event.key.toLowerCase();
    const inspectShortcut = event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(key);
    const sourceShortcut = event.ctrlKey && !event.shiftKey && ['u', 's'].includes(key);
    if (key === 'f12' || inspectShortcut || sourceShortcut) {
      event.preventDefault();
      event.stopPropagation();
    }
  });
})();
