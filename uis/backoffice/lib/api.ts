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

async function buildApiError(res: Response): Promise<ApiError> {
  const data = await res.json().catch(() => null);
  const detail = data?.detail;

  // Errores de validación de Pydantic/FastAPI: detail es una lista de
  // { loc: ["body", "campo"], msg: "..." }
  if (Array.isArray(detail)) {
    const fields: Record<string, string> = {};
    const messages: string[] = [];
    for (const item of detail) {
      const loc = Array.isArray(item?.loc) ? item.loc : [];
      const field = String(loc[loc.length - 1] ?? "form");
      const msg = String(item?.msg ?? "Valor inválido");
      fields[field] = msg;
      messages.push(msg);
    }
    return new ApiError(res.status, messages.join(" · "), fields);
  }

  // Errores de negocio simples: detail es un string (ej. "Ese email ya está registrado")
  if (typeof detail === "string") {
    const fields = detail.toLowerCase().includes("email") ? { email: detail } : undefined;
    return new ApiError(res.status, detail, fields);
  }

  return new ApiError(res.status, `La API respondió con un error (código ${res.status}).`);
}

export { buildApiError };

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

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401 && typeof window !== "undefined") {
    clearToken();
    window.location.href = "/login";
  }

  return res;
}
