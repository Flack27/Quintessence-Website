import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { GameDropdown } from "./GameDropdown";
import { DiscordLoginButton } from "./DiscordLoginButton";
import { PUBLISHING_ENABLED } from "@/lib/config";

export function Navbar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-void-950/80 backdrop-blur-md">
      <div className="h-[3px] w-full bg-quint-nav" />
      <div className="mx-auto grid max-w-6xl grid-cols-2 items-center gap-4 px-6 py-4 sm:grid-cols-[1fr_auto_1fr]">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3">
            <Logo />
            <span className="bg-quint-gradient bg-clip-text font-display text-lg font-bold uppercase tracking-wide text-transparent">
              Quintessence <span className="text-slate-400">Codex</span>
            </span>
          </Link>
          <div className="hidden h-6 w-px bg-white/10 md:block" />
          <div className="hidden md:block">
            <GameDropdown />
          </div>
        </div>

        <nav className="hidden items-center gap-8 text-sm font-medium text-slate-300 sm:flex">
          <a href="/" className="transition-colors hover:text-white">
            Home
          </a>
          <a href="#guides" className="transition-colors hover:text-white">
            Guides
          </a>
        </nav>

        <div className="flex items-center justify-end">
          {PUBLISHING_ENABLED && <DiscordLoginButton />}
        </div>
      </div>
    </header>
  );
}
