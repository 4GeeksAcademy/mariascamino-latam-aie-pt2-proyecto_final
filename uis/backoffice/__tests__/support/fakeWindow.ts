/**
 * Minimal in-memory `window` for tests that run in Jest's node environment
 * (where fetch/Response/Headers exist, but there is no browser).
 */
export function installFakeWindow() {
  const store = new Map<string, string>();
  const location = { href: "/current-page" };

  const localStorage = {
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    setItem: (key: string, value: string) => void store.set(key, String(value)),
    removeItem: (key: string) => void store.delete(key),
    clear: () => store.clear(),
  };

  (globalThis as unknown as { window: unknown }).window = { localStorage, location };
  return { localStorage, location };
}

export function removeFakeWindow() {
  delete (globalThis as unknown as { window?: unknown }).window;
}
