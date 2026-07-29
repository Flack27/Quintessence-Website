interface LogoProps {
  className?: string;
}

/**
 * Renders the guild's real flame mark from the top-level `assets/` public
 * folder (served as-is at the site root). Swap the file in `assets/` and
 * update the filename below to rebrand.
 */
export function Logo({ className = "h-9 w-9" }: LogoProps) {
  return (
    <img
      src="/logo-quintessence-v1.png"
      alt="Quintessence"
      className={`${className} object-contain drop-shadow-[0_0_12px_rgba(236,77,174,0.45)]`}
    />
  );
}
