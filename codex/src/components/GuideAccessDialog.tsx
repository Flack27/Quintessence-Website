import { useEffect, useState } from "react";
import { CODEX_API } from "@/lib/config";

/**
 * Manages who may edit one guide.
 *
 * A guide has an owner (whoever wrote it) and a list of invited editors. Admins are
 * deliberately absent from that list: they can edit every guide by virtue of a Discord
 * role, read live on each request, so there is nothing here to add or remove for them.
 * That is also why an admin loses access the moment the role goes - if they were rows in
 * this list instead, taking the role away would leave the rows, and the access, behind.
 *
 * Only the owner and admins get this far; invited editors can edit the guide but not
 * change who else can, so access never spreads sideways without the owner knowing.
 */

export interface CodexMember {
  id: string;
  username: string;
  avatar: string | null;
  /** Holds an author role - eligible to be invited. */
  canWrite: boolean;
  /** Holds a manager role - already has access everywhere. */
  canManage: boolean;
}

interface AccessResponse {
  owner: CodexMember | null;
  editors: CodexMember[];
  canManageAccess: boolean;
}

export function GuideAccessDialog({
  slug,
  title,
  onClose,
}: {
  slug: string;
  title: string;
  onClose: () => void;
}) {
  const [access, setAccess] = useState<AccessResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CodexMember[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${CODEX_API}/guides/${encodeURIComponent(slug)}/access`, { credentials: "include" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Couldn't load who has access.");
        return data as AccessResponse;
      })
      .then((data) => { if (!cancelled) setAccess(data); })
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

  // Search runs off the typed query rather than a button: debounced so a name costs one
  // request rather than one per keystroke, and aborted on the way out so a slow earlier
  // response can't land after a newer one and overwrite it.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    setSearching(true);

    const timer = setTimeout(() => {
      fetch(`${CODEX_API}/members/search?q=${encodeURIComponent(trimmed)}`, {
        credentials: "include",
        signal: controller.signal,
      })
        .then((response) => (response.ok ? (response.json() as Promise<CodexMember[]>) : []))
        .then((data) => { setResults(data); setSearching(false); })
        .catch((err: Error) => {
          if (err.name === "AbortError") return;
          setResults([]);
          setSearching(false);
        });
    }, 250);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  async function add(member: CodexMember) {
    setBusyId(member.id);
    setError(null);

    try {
      const response = await fetch(
        `${CODEX_API}/guides/${encodeURIComponent(slug)}/access/${member.id}`,
        { method: "POST", credentials: "include" }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Couldn't give them access.");

      setAccess((prev) => (prev ? { ...prev, editors: [...prev.editors, data as CodexMember] } : prev));
      setQuery("");
      setResults(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't give them access.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(member: CodexMember) {
    setBusyId(member.id);
    setError(null);

    try {
      const response = await fetch(
        `${CODEX_API}/guides/${encodeURIComponent(slug)}/access/${member.id}`,
        { method: "DELETE", credentials: "include" }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Couldn't remove them.");

      setAccess((prev) =>
        prev ? { ...prev, editors: prev.editors.filter((e) => e.id !== member.id) } : prev
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove them.");
    } finally {
      setBusyId(null);
    }
  }

  const alreadyHasAccess = new Set(
    [access?.owner?.id, ...(access?.editors ?? []).map((e) => e.id)].filter(Boolean) as string[]
  );

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
        aria-label={`Who can edit ${title}`}
      >
        <div className="mb-1 flex items-start justify-between gap-4">
          <h2 className="font-display text-lg font-bold text-white">Who can edit this guide</h2>
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

        {!loadError && !access && <p className="text-sm text-slate-500">Loading…</p>}

        {access && (
          <>
            <ul className="space-y-2">
              {access.owner && (
                <MemberRow member={access.owner} chip="Owner" chipTitle="Created this guide - can't be removed." />
              )}
              {access.editors.map((editor) => (
                <MemberRow
                  key={editor.id}
                  member={editor}
                  chip="Editor"
                  busy={busyId === editor.id}
                  onRemove={access.canManageAccess ? () => remove(editor) : undefined}
                />
              ))}
            </ul>

            {access.editors.length === 0 && (
              <p className="mt-3 text-sm text-slate-500">No one else has been given access yet.</p>
            )}

            <p className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs leading-relaxed text-slate-500">
              Admins can edit every guide through their Discord role, so they aren't listed here.
              Removing that role is what removes their access.
            </p>

            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

            {access.canManageAccess && (
              <div className="mt-5 border-t border-white/10 pt-5">
                <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="access-search">
                  Give someone access
                </label>
                <input
                  id="access-search"
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search guild members by name…"
                  autoComplete="off"
                  className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition-colors focus:border-quint-purple/60 focus:bg-white/[0.06]"
                />

                {searching && <p className="mt-3 text-sm text-slate-500">Searching…</p>}

                {!searching && results?.length === 0 && (
                  <p className="mt-3 text-sm text-slate-500">
                    No one with a Codex role matches that. Only members who can already write guides
                    can be added.
                  </p>
                )}

                {!searching && results && results.length > 0 && (
                  <ul className="mt-3 max-h-60 space-y-2 overflow-y-auto">
                    {results.map((member) => (
                      <MemberRow
                        key={member.id}
                        member={member}
                        chip={member.canManage ? "Admin" : undefined}
                        busy={busyId === member.id}
                        note={
                          member.canManage
                            ? "Already has access"
                            : alreadyHasAccess.has(member.id)
                              ? "Already has access"
                              : undefined
                        }
                        onAdd={
                          member.canManage || alreadyHasAccess.has(member.id)
                            ? undefined
                            : () => add(member)
                        }
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function MemberRow({
  member,
  chip,
  chipTitle,
  note,
  busy,
  onAdd,
  onRemove,
}: {
  member: CodexMember;
  chip?: string;
  chipTitle?: string;
  note?: string;
  busy?: boolean;
  onAdd?: () => void;
  onRemove?: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <Avatar member={member} />
      <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{member.username}</span>

      {chip && (
        <span
          title={chipTitle}
          className="shrink-0 rounded-full bg-quint-purple/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-quint-blue"
        >
          {chip}
        </span>
      )}

      {note && <span className="shrink-0 text-xs text-slate-500">{note}</span>}

      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          disabled={busy}
          className="shrink-0 rounded-full border border-quint-purple/50 px-3 py-1 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add"}
        </button>
      )}

      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={busy}
          aria-label={`Remove ${member.username}`}
          title={`Remove ${member.username}`}
          className="shrink-0 rounded-full p-1.5 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
        >
          <CrossIcon className="h-3.5 w-3.5" />
        </button>
      )}
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
        // Discord serves nothing for accounts still on the default avatar, so the claim can
        // point at a file that isn't there; drop back to the initial rather than a broken image.
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
