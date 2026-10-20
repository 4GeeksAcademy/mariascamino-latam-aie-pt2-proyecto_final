"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import { API_URL, apiFetch, buildApiError } from "./api";
import { clearToken, getToken, setToken } from "./auth-storage";

export type Profile = {
  id: number;
  user_id: number;
  name: string | null;
  phone: string | null;
  address: string | null;
};

export type CurrentUser = {
  email: string;
  role: "admin" | "manager" | "user";
  profile: Profile | null;
};

export type RegisterPayload = {
  email: string;
  password: string;
  name?: string;
  phone?: string;
  address?: string;
};

type AuthContextValue = {
  /** null mientras carga o si no hay sesión. */
  user: CurrentUser | null;
  /** true durante la comprobación inicial del token (evita parpadeos/redirects prematuros). */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => void;
  /** Vuelve a pedir GET /auth/me (útil tras editar el perfil). */
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const res = await apiFetch("/auth/me");
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data: CurrentUser = await res.json();
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Al montar el provider (una vez, en toda la app) revisamos si ya hay un
  // token guardado y, si es válido, cargamos el usuario.
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      // POST /auth/login espera OAuth2PasswordRequestForm: form-urlencoded,
      // con el email en el campo "username" (así lo define el estándar OAuth2).
      const body = new URLSearchParams();
      body.set("username", email);
      body.set("password", password);

      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });

      if (!res.ok) {
        throw await buildApiError(res);
      }

      const data: { access_token: string } = await res.json();
      setToken(data.access_token);
      await refresh();
    },
    [refresh]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const res = await fetch(`${API_URL}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw await buildApiError(res);
      }

      // El endpoint de registro solo crea la cuenta; el login (con las mismas
      // credenciales) es lo que nos da el token de sesión.
      await login(payload.email, payload.password);
    },
    [login]
  );

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
