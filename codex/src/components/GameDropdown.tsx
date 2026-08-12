import { useEffect, useRef, useState } from "react";
import { publicAsset } from "@/lib/assets";

/**
 * Game switcher, styled after questlog.gg's navbar dropdown. The Codex only
 * covers Aion 2 today, so this is a placeholder shell: it shows Aion 2 as the
 * selected game and leaves room to list more games here once they exist.
 */
export function GameDropdown() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-[rgba(201,160,220,0.26)] bg-white/[0.03] py-1.5 pl-2 pr-3 text-[1.0625rem] font-semibold text-[#9c8fae] transition-colors hover:border-[rgba(201,160,220,0.5)] hover:text-[#e6dcef]"
      >
        <img src={publicAsset("/aion-2.png")} alt="" className="h-5 w-5 rounded object-contain" />
        <span>Aion 2</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="none"
          className={`h-3.5 w-3.5 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#0b0812] shadow-card-hover"
        >
          <div
            role="option"
            aria-selected="true"
            className="flex items-center gap-3 px-3 py-2.5 text-[1.0625rem] font-semibold text-[#e6dcef]"
          >
            <img src={publicAsset("/aion-2.png")} alt="" className="h-5 w-5 rounded object-contain" />
            Aion 2
            <svg aria-hidden viewBox="0 0 20 20" fill="none" className="ml-auto h-4 w-4 text-quint-pink">
              <path d="M4 10.5L8 14.5L16 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="border-t border-[rgba(201,160,220,0.13)] px-3 py-2.5 text-xs text-[#6c6179]">
            More games coming soon
          </div>
        </div>
      )}
    </div>
  );
}
