import { clearToken, getToken } from "./auth-storage";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

/**
 * Error lanzado cuando la API responde con un código distinto de 2xx.
 *
 * `fields` viene poblado cuando la API devuelve errores de validación de
 * Pydantic (422): un objeto { nombre_del_campo: mensaje } para que los
 * formularios puedan mostrar el error junto al input correspondiente.
 */
export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(status: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fields = fields;
  }
}

/** Mensaje legible según el código HTTP. Nunca mostramos códigos ni texto técnico. */
export function friendlyMessage(status: number): string {
  if (status === 0) {
    return "No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.";
  }
  if (status === 403) return "No tienes permiso para realizar esta acción.";
  if (status === 404) return "No encontramos lo que buscabas. Puede que ya no exista.";
  if (status === 408 || status === 429) {
    return "Hay demasiadas solicitudes en este momento. Espera un momento e inténtalo de nuevo.";
  }
  if (status >= 500) {
    return "Algo salió mal de nuestro lado. Inténtalo de nuevo en unos minutos.";
  }
  return "No pudimos completar la acción. Revisa los datos e inténtalo de nuevo.";
}

/**
 * Construye un ApiError a partir de una respuesta no exitosa. Para errores de
 * servidor (5xx) ignora el cuerpo y usa un mensaje genérico, así un detalle
 * interno nunca llega a la pantalla.
 */
async function buildApiError(res: Response): Promise<ApiError> {
  if (res.status >= 500) {
    return new ApiError(res.status, friendlyMessage(res.status));
  }

  const data = await res.json().catch(() => null);
  const detail = data?.detail;

  // Errores de validación (422): detail es una lista de { loc: [...], msg: "..." }
  if (Array.isArray(detail)) {
    const fields: Record<string, string> = {};
    const messages: string[] = [];
    for (const item of detail) {
      const loc = Array.isArray(item?.loc) ? item.loc : [];
      const field = String(loc[loc.length - 1] ?? "form");
      const msg = String(item?.msg ?? "Valor no válido.");
      fields[field] = msg;
      messages.push(msg);
    }
    return new ApiError(res.status, messages.join(" · ") || friendlyMessage(res.status), fields);
  }

  // Errores de negocio simples: detail es un string (ej. "Ese email ya está registrado")
  if (typeof detail === "string" && detail.trim() !== "") {
    const fields = detail.toLowerCase().includes("email") ? { email: detail } : undefined;
    return new ApiError(res.status, detail, fields);
  }

  return new ApiError(res.status, friendlyMessage(res.status));
}

export { buildApiError };

/**
 * fetch() que convierte los fallos de red (servidor caído, sin internet,
 * CORS) en un ApiError con un mensaje legible. El try/catch cubre SOLO la
 * llamada de red.
 */
export async function safeFetch(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(url, options);
  } catch {
    throw new ApiError(0, friendlyMessage(0));
  }
}

/**
 * Fetch autenticado: agrega el header Authorization con el token guardado en
 * localStorage (si existe) y, si la API responde 401, borra el token y manda
 * al usuario a /login — esto cubre el caso "token inválido o expirado" para
 * cualquier llamada protegida, sin tener que repetir la lógica en cada vista.
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body && typeof options.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await safeFetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    clearToken();
    window.location.href = "/login";
  }

  return res;
}

/** Lee el cuerpo JSON de una respuesta exitosa; si no es JSON válido lanza un ApiError legible. */
export async function readJson<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    throw new ApiError(res.status, "Recibimos una respuesta inesperada del servidor. Inténtalo de nuevo.");
  }
}

/**
 * Llamada autenticada que devuelve el JSON ya parseado. Cualquier fallo
 * (red, estado no 2xx, JSON inválido) sale como ApiError con mensaje legible,
 * así cada pantalla solo necesita un try/catch/finally alrededor de esta línea.
 */
export async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await apiFetch(path, options);
  if (!res.ok) {
    throw await buildApiError(res);
  }
  return readJson<T>(res);
}

/** Texto seguro para mostrar al usuario a partir de cualquier error capturado. */
export function getErrorMessage(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}
