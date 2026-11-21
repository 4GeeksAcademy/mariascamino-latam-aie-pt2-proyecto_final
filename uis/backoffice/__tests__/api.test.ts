/**
 * lib/api.ts — error translation and authenticated requests.
 * The rule under test: whatever the server or the network does, the user only
 * ever sees a readable message (never a status code, stack trace or JSON error).
 */
import {
  ApiError,
  apiFetch,
  buildApiError,
  friendlyMessage,
  getErrorMessage,
  readJson,
  requestJson,
  safeFetch,
} from "../lib/api";
import { getToken, setToken } from "../lib/auth-storage";
import { installFakeWindow, removeFakeWindow } from "./support/fakeWindow";

function mockFetchOnce(status: number, body: unknown, rawBody?: string) {
  const response = new Response(rawBody ?? JSON.stringify(body), { status });
  global.fetch = jest.fn().mockResolvedValue(response);
}

let fakeWindow: ReturnType<typeof installFakeWindow>;

beforeEach(() => {
  fakeWindow = installFakeWindow();
});

afterEach(() => {
  removeFakeWindow();
  jest.restoreAllMocks();
});

describe("friendlyMessage", () => {
  test("gives a plain-language sentence for the common statuses", () => {
    expect(friendlyMessage(0)).toMatch(/conectar con el servidor/i);
    expect(friendlyMessage(403)).toMatch(/permiso/i);
    expect(friendlyMessage(404)).toMatch(/no encontramos/i);
    expect(friendlyMessage(500)).toMatch(/nuestro lado/i);
  });

  test("never includes the numeric status code", () => {
    for (const status of [0, 400, 403, 404, 408, 429, 500, 502, 503]) {
      expect(friendlyMessage(status)).not.toMatch(/\d{3}/);
    }
  });
});

describe("buildApiError", () => {
  test("validation list (422) becomes per-field errors", async () => {
    const res = new Response(
      JSON.stringify({ detail: [{ loc: ["body", "email"], msg: "Ingresa un email válido." }] }),
      { status: 422 }
    );

    const error = await buildApiError(res);

    expect(error.fields).toEqual({ email: "Ingresa un email válido." });
    expect(error.message).toBe("Ingresa un email válido.");
  });

  test("a plain business message is kept, and an email message is tied to the email field", async () => {
    const res = new Response(JSON.stringify({ detail: "Ese email ya está registrado" }), { status: 400 });

    const error = await buildApiError(res);

    expect(error.message).toBe("Ese email ya está registrado");
    expect(error.fields).toEqual({ email: "Ese email ya está registrado" });
  });

  test("server errors hide whatever the body says", async () => {
    const res = new Response(JSON.stringify({ detail: "Traceback: secret path /etc/passwd" }), { status: 500 });

    const error = await buildApiError(res);

    expect(error.message).toBe(friendlyMessage(500));
    expect(error.message).not.toMatch(/traceback|passwd/i);
  });

  test("an unreadable error body falls back to a generic message", async () => {
    const res = new Response("<html>Bad gateway</html>", { status: 400 });

    const error = await buildApiError(res);

    expect(error.message).toBe(friendlyMessage(400));
    expect(error.message).not.toMatch(/html/i);
  });
});

describe("readJson and getErrorMessage", () => {
  test("parses a valid JSON body", async () => {
    await expect(readJson<{ ok: boolean }>(new Response('{"ok":true}'))).resolves.toEqual({ ok: true });
  });

  test("invalid JSON becomes a readable ApiError, not a SyntaxError", async () => {
    await expect(readJson(new Response("not json"))).rejects.toBeInstanceOf(ApiError);
    await expect(readJson(new Response("not json"))).rejects.toThrow(/respuesta inesperada/i);
  });

  test("getErrorMessage uses ApiError text but hides unknown errors behind the fallback", () => {
    expect(getErrorMessage(new ApiError(400, "Texto claro"), "fallback")).toBe("Texto claro");
    expect(getErrorMessage(new TypeError("Failed to fetch"), "fallback")).toBe("fallback");
    expect(getErrorMessage("boom", "fallback")).toBe("fallback");
  });
});

describe("safeFetch / apiFetch / requestJson", () => {
  test("a network failure becomes a readable ApiError with status 0", async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(safeFetch("http://x")).rejects.toMatchObject({ status: 0, message: friendlyMessage(0) });
  });

  test("apiFetch sends the saved token as a Bearer header", async () => {
    setToken("my-token");
    mockFetchOnce(200, {});

    await apiFetch("/suppliers");

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect((options.headers as Headers).get("Authorization")).toBe("Bearer my-token");
  });

  test("apiFetch sends no Authorization header when there is no session", async () => {
    mockFetchOnce(200, {});

    await apiFetch("/suppliers");

    const [, options] = (global.fetch as jest.Mock).mock.calls[0];
    expect((options.headers as Headers).has("Authorization")).toBe(false);
  });

  test("a 401 response clears the saved token and sends the user to /login (expired session)", async () => {
    setToken("expired-token");
    mockFetchOnce(401, { detail: "No se pudo validar el token" });

    await apiFetch("/auth/me");

    expect(getToken()).toBeNull();
    expect(fakeWindow.location.href).toBe("/login");
  });

  test("other error statuses do not log the user out", async () => {
    setToken("still-valid");
    mockFetchOnce(500, { detail: "boom" });

    await apiFetch("/suppliers");

    expect(getToken()).toBe("still-valid");
    expect(fakeWindow.location.href).toBe("/current-page");
  });

  test("requestJson returns parsed data on success", async () => {
    mockFetchOnce(200, [{ id: 1 }]);

    await expect(requestJson("/suppliers")).resolves.toEqual([{ id: 1 }]);
  });

  test("requestJson turns a failed response into an ApiError with a friendly message", async () => {
    mockFetchOnce(500, { detail: "database exploded" });

    await expect(requestJson("/suppliers")).rejects.toMatchObject({
      status: 500,
      message: friendlyMessage(500),
    });
  });
});
