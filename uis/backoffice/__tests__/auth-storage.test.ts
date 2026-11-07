/**
 * @jest-environment jsdom
 */
/**
 * Token storage helpers (lib/auth-storage.ts).
 * They must never throw: the app should keep working when localStorage is
 * unavailable (private mode, blocked storage).
 */
import { clearToken, getToken, setToken } from "../lib/auth-storage";

beforeEach(() => {
  window.localStorage.clear();
  jest.restoreAllMocks();
});

describe("token storage", () => {
  // happy path
  test("a saved token can be read back and then cleared", () => {
    setToken("abc.def.ghi");
    expect(getToken()).toBe("abc.def.ghi");

    clearToken();
    expect(getToken()).toBeNull();
  });

  // edge cases
  test("returns null when nothing was ever saved", () => {
    expect(getToken()).toBeNull();
  });

  test("saving a new token replaces the previous one", () => {
    setToken("first");
    setToken("second");
    expect(getToken()).toBe("second");
  });

  // failure mode: storage blocked by the browser
  test("does not throw when localStorage is unavailable", () => {
    jest.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    jest.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    jest.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });

    expect(() => setToken("x")).not.toThrow();
    expect(() => clearToken()).not.toThrow();
    expect(getToken()).toBeNull(); // behaves as "no session", not as a crash
  });
});
