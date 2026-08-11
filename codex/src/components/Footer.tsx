export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-void-950/60 px-6 py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 text-sm text-slate-500 sm:flex-row">
        <p>© {new Date().getFullYear()} Quintessence. All guides are written and maintained by the guild.</p>
        <p className="text-slate-600">Built for the Quintessence community.</p>
      </div>
    </footer>
  );
}
