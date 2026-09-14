import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface HoverPopupProps {
  trigger: ReactNode;
  content: ReactNode;
}

/**
 * Wraps a trigger (a word/phrase or an image) with a floating popup shown on hover.
 * Touch devices have no hover state, so a tap toggles it instead.
 *
 * The popup renders through a portal into document.body instead of as an absolutely
 * positioned child: nested inline triggers live inside all sorts of ancestors (a
 * scrollable editor preview, a card with its own stacking context, ...), and a
 * locally-positioned popup can get clipped by an ancestor's overflow or out-stacked
 * by unrelated content no matter how high its z-index goes. A fixed-position portal
 * sidesteps both problems entirely.
 */
export function HoverPopup({ trigger, content }: HoverPopupProps) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const updatePosition = () => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (rect) setCoords({ top: rect.top, left: rect.right + 8 });
    };
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  return (
    <span
      ref={anchorRef}
      className="group inline-block cursor-help align-middle"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((prev) => !prev)}
      tabIndex={0}
      role="button"
    >
      {trigger}
      {open &&
        createPortal(
          // Anchored to the trigger's own top edge rather than vertically centered:
          // centering needs a transform sized off the popup's own height, and a tall
          // popup (e.g. one holding an image) would then push itself up over the trigger.
          <span
            role="tooltip"
            className="fixed z-[9999] w-max max-w-[90vw] rounded-lg border border-white/10 bg-void-950 p-2 text-xs text-slate-200 shadow-xl"
            style={{ top: coords.top, left: coords.left }}
          >
            {content}
          </span>,
          document.body,
        )}
    </span>
  );
}
