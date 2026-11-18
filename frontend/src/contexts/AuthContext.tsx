import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import api, { setTokens, clearTokens, getAccessToken } from "@/lib/api";
import type { User } from "@/types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  register: (email: string, name: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      api.get<User>("/users/me")
        .then(({ data }) => setUser(data))
        .catch(() => clearTokens())
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string, totpCode?: string) => {
    const { data } = await api.post("/auth/login", { email, password, totp_code: totpCode });
    setTokens(data.access_token, data.refresh_token);
    const { data: me } = await api.get<User>("/users/me");
    setUser(me);
  };

  const register = async (email: string, name: string, password: string) => {
    const { data } = await api.post("/auth/register", { email, name, password });
    setTokens(data.access_token, data.refresh_token);
    const { data: me } = await api.get<User>("/users/me");
    setUser(me);
  };

  const logout = async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (refresh) {
      await api.post("/auth/logout", { refresh_token: refresh }).catch(() => {});
    }
    clearTokens();
    setUser(null);
  };

  const refreshUser = async () => {
    const { data } = await api.get<User>("/users/me");
    setUser(data);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
