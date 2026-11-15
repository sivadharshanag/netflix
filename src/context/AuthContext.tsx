import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as api from "@/services/api";

interface AuthContextValue {
  authenticated: boolean;
  loading: boolean;
  login: (password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const status = await api.getAuthStatus();
      setAuthenticated(status.authenticated);
    } catch {
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (password: string) => {
    try {
      const result = await api.login(password);
      if (result.success) setAuthenticated(true);
      return result;
    } catch (error) {
      if (error instanceof api.ApiError) {
        return { success: false, message: error.message };
      }
      return { success: false, message: "Something went wrong. Please try again." };
    }
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setAuthenticated(false);
    sessionStorage.removeItem("varunika:profileSelected");
  }, []);

  const value = useMemo(() => ({ authenticated, loading, login, logout, refresh }), [authenticated, loading, login, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
