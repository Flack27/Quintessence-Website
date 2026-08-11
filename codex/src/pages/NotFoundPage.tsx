import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-32 text-center">
      <p className="bg-quint-gradient bg-clip-text font-display text-6xl font-bold text-transparent">404</p>
      <h1 className="mt-4 text-xl font-semibold text-white">This guide doesn't exist yet.</h1>
      <p className="mt-2 text-slate-400">The page you're looking for was moved, renamed, or never written.</p>
      <Link
        to="/"
        className="mt-8 inline-flex items-center rounded-xl bg-quint-cta px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-105"
      >
        Back to the Codex
      </Link>
    </div>
  );
}
