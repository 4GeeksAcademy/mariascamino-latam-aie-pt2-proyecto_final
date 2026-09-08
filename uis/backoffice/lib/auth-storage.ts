/**
 * Acceso al token de sesión guardado en localStorage.
 *
 * Todas las funciones son seguras de llamar durante el render en el servidor
 * (Next.js): si `window` no existe, o si localStorage lanza un error (modo
 * privado, storage deshabilitado, etc.), simplemente se comportan como si no
 * hubiera token.
 */

const TOKEN_KEY = "healthcore_backoffice_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage no disponible (modo privado, cuota llena, etc.) — no hay
    // nada razonable que hacer aquí salvo no romper el flujo de login.
  }
}

export function clearToken(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ver comentario de arriba
  }
}
