import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface AuthUser {
  id: string;
  username: string;
  avatar: string | null;
}

export interface AuthState {
  loading: boolean;
  authenticated: boolean;
  /** Has the required Discord role — the only flag that should gate publishing. */
  authorized: boolean;
  user: AuthUser | null;
  refresh: () => void;
}

const AuthContext = createContext<AuthState>({
  loading: true,
  authenticated: false,
  authorized: false,
  user: null,
  refresh: () => {},
});

interface MeResponse {
  authenticated: boolean;
  authorized: boolean;
  user?: AuthUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<AuthState, "refresh">>({
    loading: true,
    authenticated: false,
    authorized: false,
    user: null,
  });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/me")
      .then((res) => res.json() as Promise<MeResponse>)
      .then((data) => {
        if (cancelled) return;
        setState({
          loading: false,
          authenticated: data.authenticated,
          authorized: data.authorized,
          user: data.user ?? null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({ loading: false, authenticated: false, authorized: false, user: null });
      });

    return () => {
      cancelled = true;
    };
  }, [version]);

  return (
    <AuthContext.Provider value={{ ...state, refresh: () => setVersion((v) => v + 1) }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
