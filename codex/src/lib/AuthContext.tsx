import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CODEX_API, PUBLISHING_ENABLED } from "./config";

export type GuildRole = "none" | "author" | "moderator";

export interface AuthUser {
  id: string;
  username: string;
  avatar: string | null;
}

export interface AuthState {
  loading: boolean;
  authenticated: boolean;
  /** Permission tier from the configured Discord guild. */
  role: GuildRole;
  /** Can create/edit/delete their own posts (author or moderator). */
  canPublish: boolean;
  /** Can create/edit/delete anyone's posts. */
  canModerate: boolean;
  user: AuthUser | null;
  refresh: () => void;
}

const AuthContext = createContext<AuthState>({
  loading: true,
  authenticated: false,
  role: "none",
  canPublish: false,
  canModerate: false,
  user: null,
  refresh: () => {},
});

interface MeResponse {
  authenticated: boolean;
  role: GuildRole;
  user?: AuthUser;
}

type AuthStateData = Omit<AuthState, "refresh" | "canPublish" | "canModerate">;

const LOGGED_OUT: AuthStateData = { loading: false, authenticated: false, role: "none", user: null };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthStateData>({ loading: true, authenticated: false, role: "none", user: null });
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;

    // With publishing off there is no session to look up, and `/api/auth/me`
    // isn't ours to call — see PUBLISHING_ENABLED. Settle as logged-out.
    // (DEV still calls out to dev/mock-api.ts's fake /api/auth/me so the publish
    // page and delete button stay testable locally without flipping the flag.)
    if (!PUBLISHING_ENABLED && !import.meta.env.DEV) {
      setState(LOGGED_OUT);
      return;
    }

    fetch(`${CODEX_API}/auth/me`, { credentials: "include" })
      .then((res) => res.json() as Promise<MeResponse>)
      .then((data) => {
        if (cancelled) return;
        setState({
          loading: false,
          authenticated: data.authenticated,
          role: data.role,
          user: data.user ?? null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState(LOGGED_OUT);
      });

    return () => {
      cancelled = true;
    };
  }, [version]);

  const value: AuthState = {
    ...state,
    canPublish: state.role !== "none",
    canModerate: state.role === "moderator",
    refresh: () => setVersion((v) => v + 1),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
