import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { CODEX_API } from "@/lib/config";

export function DiscordLoginButton() {
  const { loading, authenticated, canPublish, role, user, refresh } = useAuth();

  if (loading) return null;

  if (!authenticated) {
    return (
      <a
        href={`${CODEX_API}/auth/login`}
        className="flex items-center gap-2 rounded-full border border-[rgba(236,77,174,0.4)] bg-gradient-to-r from-[#520f73] to-[#6b2d60] px-5 py-2 text-[0.95rem] font-semibold text-[#fdf6ff] transition-all hover:-translate-y-px hover:shadow-[0_10px_30px_-10px_rgba(236,77,174,0.6)]"
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

  // Read left to right: who you are, then what you can do. The badge is a filled
  // surface with no hover, the actions are outlined and do respond - so it is legible
  // at a glance which of the three is a label and which two are buttons.
  return (
    <div className="flex flex-wrap items-center gap-2.5 text-[0.95rem]">
      <span className="flex items-center gap-2.5 rounded-full border border-[rgba(201,160,220,0.18)] bg-[rgba(24,17,40,0.85)] py-1 pl-1 pr-4 font-semibold text-[#e6dcef]">
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt=""
            className="h-8 w-8 rounded-full border border-[rgba(201,160,220,0.3)] object-cover"
            // Discord serves no avatar for accounts still on the default; the claim
            // then points at a file that does not exist, so fall back to the initial.
            onError={(event) => { event.currentTarget.style.display = "none"; }}
          />
        ) : (
          <span
            aria-hidden
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#520f73] to-[#6b2d60] text-xs font-bold text-[#e6dcef]"
          >
            {(user?.username ?? "?").charAt(0).toUpperCase()}
          </span>
        )}
        <span className="leading-none">{user?.username}</span>
        {role !== "none" && (
          <span className="rounded-full bg-[rgba(236,77,174,0.14)] px-2 py-0.5 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-[#ec4dae]">
            {role === "moderator" ? "Admin" : "Author"}
          </span>
        )}
      </span>

      {canPublish && (
        <Link
          to="/publish"
          className="rounded-full border border-[rgba(236,77,174,0.4)] bg-gradient-to-r from-[#520f73] to-[#6b2d60] px-5 py-2 font-semibold text-[#fdf6ff] transition-all hover:-translate-y-px hover:shadow-[0_10px_30px_-10px_rgba(236,77,174,0.6)]"
        >
          Write a guide
        </Link>
      )}

      <button
        type="button"
        onClick={logout}
        className="rounded-full border border-[rgba(201,160,220,0.3)] px-5 py-2 font-semibold text-[#c9a0dc] transition-colors hover:border-[rgba(201,160,220,0.55)] hover:bg-[rgba(201,160,220,0.08)] hover:text-[#e6dcef]"
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
