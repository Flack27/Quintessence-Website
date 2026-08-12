import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { GameDropdown } from "./GameDropdown";
import { DiscordLoginButton } from "./DiscordLoginButton";
import { PUBLISHING_ENABLED } from "@/lib/config";

// Matches the Angular navbar spec: 62px tall, 34px mark, 16px links, violet hairline.
// See CODEX-PLAN.md - the two navbars are meant to be indistinguishable.
export function Navbar() {
  return (
    <header className="sticky top-0 z-40 h-[62px] border-b border-[rgba(201,160,220,0.26)] bg-gradient-to-r from-[rgba(11,8,18,0.92)] to-[rgba(82,15,115,0.36)] backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-6xl items-center gap-7 px-6">
        <div className="mr-auto flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3">
            <Logo className="h-[34px] w-[34px]" />
            <span className="font-display text-[15px] font-bold uppercase tracking-[0.16em] text-[#efe7f5]">
              Quintessence <span className="font-normal text-[#6c6179]">Codex</span>
            </span>
          </Link>
          <div className="hidden h-6 w-px bg-white/10 md:block" />
          <div className="hidden md:block">
            <GameDropdown />
          </div>
        </div>

        {/* Same five destinations as the Angular navbar, so the two halves of the site
            navigate identically. These are plain hrefs, not react-router Links: every
            one except Guides lives in the Angular app, so they must be real page loads. */}
        <nav className="hidden items-center gap-[26px] text-base font-semibold text-[#9c8fae] sm:flex">
          <a href="/" className="transition-colors hover:text-[#e6dcef]">Home</a>
          <a href="https://qutie.app/g/1137802734284832910/apply" target="_blank" rel="noopener"
             className="transition-colors hover:text-[#e6dcef]">Apply</a>
          <a href="/games" className="transition-colors hover:text-[#e6dcef]">Games</a>
          <a href="/roster" className="transition-colors hover:text-[#e6dcef]">Roster</a>
          <Link to="/" className="border-b-2 border-quint-pink pb-1 text-white transition-colors">Guides</Link>
        </nav>

        <div className="flex items-center justify-end">
          {PUBLISHING_ENABLED && <DiscordLoginButton />}
        </div>
      </div>
    </header>
  );
}
