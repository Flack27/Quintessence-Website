import { Link } from "react-router-dom";
import { Logo } from "./Logo";
import { GameDropdown } from "./GameDropdown";

/**
 * Deliberately NOT styled with Tailwind. This uses the same markup and class names
 * as the Angular site's navbar, styled by the one stylesheet both apps load
 * (`shared/navbar.css`, pulled in from `src/index.css`).
 *
 * Keeping two parallel implementations in visual sync by hand did not hold - they
 * drifted on border width (0.8px vs 1px), blur radius, box-shadow and link padding.
 * If the bar needs to change, change it there and both halves follow.
 *
 * The game switcher is Codex-only and keeps its own styling. Sign-in deliberately
 * does NOT live here - it sits beside the search bar on the home page, where it is
 * actually relevant and where the signed-in state has room.
 */
export function Navbar() {
  return (
    <header className="qt-nav">
      <div className="qt-nav__inner">
        <div className="qt-nav__start">
          <Link to="/" className="qt-nav__brand">
            <Logo className="qt-nav__logo" />
            <span className="qt-nav__wordmark">
              Quintessence <span className="qt-nav__wordmark-sub">Codex</span>
            </span>
          </Link>

          <div className="hidden md:block">
            <GameDropdown />
          </div>
        </div>

        {/* Same five destinations as the Angular navbar. Plain hrefs, not router
            Links: everything except the Codex itself lives in the Angular app, so
            they have to be real page loads. */}
        <ul className="qt-nav__links">
          <li><a className="qt-nav__link" href="/">Home</a></li>
          <li>
            <a className="qt-nav__link" href="https://qutie.app/g/1137802734284832910/apply"
               target="_blank" rel="noopener">Apply</a>
          </li>
          <li><a className="qt-nav__link" href="/games">Games</a></li>
          <li><a className="qt-nav__link" href="/roster">Roster</a></li>
          <li><Link className="qt-nav__link qt-nav__link--active" to="/">Codex</Link></li>
        </ul>
      </div>
    </header>
  );
}
