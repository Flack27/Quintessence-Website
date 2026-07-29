interface TagPillProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function TagPill({ label, active, onClick }: TagPillProps) {
  const interactive = typeof onClick === "function";

  return (
    <span
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={(event) => {
        if (interactive && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          onClick?.();
        }
      }}
      className={[
        "inline-flex select-none items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide transition-colors",
        interactive ? "cursor-pointer" : "",
        active
          ? "border-transparent bg-quint-cta text-white shadow-glow"
          : "border-white/10 bg-white/[0.03] text-slate-400 hover:border-quint-purple/50 hover:text-white",
      ].join(" ")}
    >
      {label}
    </span>
  );
}
