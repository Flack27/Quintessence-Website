import { type ReactNode, useState } from "react";

interface HoverPopupProps {
  trigger: ReactNode;
  content: ReactNode;
}

/**
 * Wraps a trigger (a word/phrase or an image) with a floating popup shown on hover.
 * Touch devices have no hover state, so a tap toggles it instead.
 */
export function HoverPopup({ trigger, content }: HoverPopupProps) {
  const [open, setOpen] = useState(false);

  return (
    <span
      className="relative inline-block cursor-help"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((prev) => !prev)}
      tabIndex={0}
      role="button"
    >
      {trigger}
      {open && (
        <span
          role="tooltip"
          className="absolute left-1/2 top-full z-20 mt-2 w-max max-w-xs -translate-x-1/2 rounded-lg border border-white/10 bg-void-950 p-2 text-xs text-slate-200 shadow-xl"
        >
          {content}
        </span>
      )}
    </span>
  );
}
