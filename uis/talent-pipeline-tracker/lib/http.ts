const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_BASE_URL) {
  // Falla fuerte y temprano en vez de mandar requests silenciosos a "undefined/records".
  throw new Error(
    "Missing NEXT_PUBLIC_API_URL. Define it in .env.local (see .env.example)."
  );
}

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body?.detail === "string") return body.detail;
    if (Array.isArray(body?.detail)) {
      return body.detail.map((d: { msg?: string }) => d.msg).join(", ");
    }
  } catch {
    // El cuerpo de la respuesta no era JSON (o estaba vacío) — usamos el fallback de abajo.
  }
  return `Request failed with status ${response.status} (${response.statusText})`;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await parseErrorMessage(response);
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    // Los endpoints DELETE devuelven "204 No Content" — no hay cuerpo que parsear.
    return undefined as T;
  }

  return response.json() as Promise<T>;
}