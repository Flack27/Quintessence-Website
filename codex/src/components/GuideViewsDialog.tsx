import { useEffect, useState } from "react";
import { CODEX_API } from "@/lib/config";
import type { CodexMember } from "@/components/GuideAccessDialog";

/**
 * Who has read one guide and how many times, most-read first.
 *
 * Same gate as GuideAccessDialog on the server (the guide's owner or an admin) - this is
 * administrative visibility into readership, not something an invited editor gets.
 */

interface GuideViewer {
  member: CodexMember;
  count: number;
  lastViewedUtc: string;
}

export function GuideViewsDialog({
  slug,
  title,
  onClose,
}: {
  slug: string;
  title: string;
  onClose: () => void;
}) {
  const [viewers, setViewers] = useState<GuideViewer[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${CODEX_API}/guides/${encodeURIComponent(slug)}/views`, { credentials: "include" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Couldn't load who has read this.");
        return data as GuideViewer[];
      })
      .then((data) => { if (!cancelled) setViewers(data); })
      .catch((err: Error) => { if (!cancelled) setLoadError(err.message); });

    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const totalReads = viewers?.reduce((sum, v) => sum + v.count, 0) ?? 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 py-[10vh] backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-void-950 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Who has read ${title}`}
      >
        <div className="mb-1 flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-white">Who's read this guide</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <CrossIcon className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-5 truncate text-sm text-slate-500">{title}</p>

        {loadError && <p className="text-sm text-red-400">{loadError}</p>}

        {!loadError && !viewers && <p className="text-sm text-slate-500">Loading…</p>}

        {viewers && viewers.length === 0 && (
          <p className="text-sm text-slate-500">No one has read this guide yet.</p>
        )}

        {viewers && viewers.length > 0 && (
          <>
            <p className="mb-3 text-xs text-slate-500">
              {viewers.length} reader{viewers.length === 1 ? "" : "s"} · {totalReads} read{totalReads === 1 ? "" : "s"} total
            </p>
            <ul className="max-h-96 space-y-2 overflow-y-auto">
              {viewers.map((viewer) => (
                <ViewerRow key={viewer.member.id} viewer={viewer} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function ViewerRow({ viewer }: { viewer: GuideViewer }) {
  const lastViewed = new Date(viewer.lastViewedUtc);
  const lastViewedLabel = Number.isNaN(lastViewed.getTime())
    ? null
    : lastViewed.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <Avatar member={viewer.member} />
      <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{viewer.member.username}</span>
      {lastViewedLabel && (
        <span className="shrink-0 text-xs text-slate-500" title="Last read">
          {lastViewedLabel}
        </span>
      )}
      <span
        className="shrink-0 rounded-full bg-quint-purple/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-quint-blue"
        title="Times read"
      >
        {viewer.count}×
      </span>
    </li>
  );
}

function Avatar({ member }: { member: CodexMember }) {
  if (member.avatar) {
    return (
      <img
        src={member.avatar}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full border border-white/10 object-cover"
        onError={(event) => { event.currentTarget.style.display = "none"; }}
      />
    );
  }

  return (
    <span
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-quint-gradient text-xs font-bold text-white"
    >
      {member.username.charAt(0).toUpperCase()}
    </span>
  );
}

function CrossIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden className={className}>
      <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
