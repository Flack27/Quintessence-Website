import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { CODEX_API } from "@/lib/config";

export function DiscordLoginButton() {
  const { loading, authenticated, canPublish, user, refresh } = useAuth();

  if (loading) return null;

  if (!authenticated) {
    return (
      <a
        href={`${CODEX_API}/auth/login`}
        className="flex items-center gap-2 rounded-full bg-quint-cta px-5 py-2.5 text-[1.0625rem] font-semibold text-white shadow-glow transition-transform hover:scale-[1.03] hover:opacity-95"
      >
        <DiscordIcon className="h-4 w-4" />
        Log in with Discord
      </a>
    );
  }

  async function logout() {
    await fetch(`${CODEX_API}/auth/logout`, { method: "POST", credentials: "include" });
    refresh();
  }

  return (
    <div className="flex items-center gap-3 text-[1.0625rem]">
      {canPublish && (
        <Link
          to="/publish"
          className="rounded-full border border-[rgba(201,160,220,0.26)] px-4 py-1.5 font-semibold text-[#9c8fae] transition-colors hover:border-[rgba(201,160,220,0.5)] hover:text-[#e6dcef]"
        >
          Publish
        </Link>
      )}
      <span className="rounded-full border border-[rgba(201,160,220,0.13)] bg-white/[0.03] px-3 py-1.5 text-[#9c8fae]">
        {user?.username}
      </span>
      <button
        type="button"
        onClick={logout}
        className="rounded-full border border-white/15 px-4 py-1.5 font-semibold text-slate-300 transition-colors hover:border-quint-pink/50 hover:text-white"
      >
        Log out
      </button>
    </div>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128q.19-.142.362-.28a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009q.171.14.36.281a.077.077 0 0 1-.006.128 12.3 12.3 0 0 1-1.873.891.076.076 0 0 0-.04.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.029 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.028M8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.42 0 1.333-.955 2.418-2.157 2.418m7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418" />
    </svg>
  );
}
