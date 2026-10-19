/* Cosmetic deterrent only. Browser tools and downloaded files cannot be protected this way. */
(() => {
  function deny(event) {
    if (event.cancelable) event.preventDefault();
    event.stopImmediatePropagation();
  }
  // Capture before component listeners and include inputs/form controls.
  window.addEventListener('contextmenu', deny, { capture: true });
  window.addEventListener('dragstart', event => {
    if (event.target?.closest?.('img')) deny(event);
  }, { capture: true });
  window.addEventListener('keydown', event => {
    const key = String(event.key || '').toLowerCase();
    const inspectorShortcut = key === 'f12'
      || ((event.ctrlKey && event.shiftKey) || (event.metaKey && event.altKey))
        && ['i', 'j', 'c', 'k'].includes(key);
    const sourceShortcut = (event.ctrlKey || event.metaKey)
      && !event.shiftKey && !event.altKey && ['u', 's'].includes(key);
    if (inspectorShortcut || sourceShortcut) deny(event);
  }, { capture: true });
})();
