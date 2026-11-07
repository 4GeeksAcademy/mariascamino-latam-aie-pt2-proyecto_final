/**
 * Shared language persistence for every HealthCore page.
 * Previously duplicated in index.html (inline script) and validation.js.
 * Exposes window.HealthCoreLang.read() / .save(lang).
 */
window.HealthCoreLang = (() => {
  const STORAGE_KEY = "healthcoreLang";
  const SUPPORTED = ["es", "en"];

  const read = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return SUPPORTED.includes(saved) ? saved : null;
    } catch {
      return null; // Storage blocked (private mode, disabled cookies).
    }
  };

  const save = (lang) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors (private mode or blocked storage).
    }
  };

  return { read, save };
})();
