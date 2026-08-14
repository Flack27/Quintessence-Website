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
      className="group relative isolate inline-block cursor-help align-middle"
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
        // Anchored to the trigger's own top edge rather than vertically centered:
        // centering needs a transform sized off the popup's own height, and a tall
        // popup (e.g. one holding an image) would then push itself up over the trigger.
        <span
          role="tooltip"
          className="absolute left-full top-0 z-20 ml-2 w-max max-w-[90vw] rounded-lg border border-white/10 bg-void-950 p-2 text-xs text-slate-200 shadow-xl"
        >
          {content}
        </span>
      )}
    </span>
  );
}
