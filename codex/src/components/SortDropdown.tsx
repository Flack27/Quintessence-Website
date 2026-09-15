import { useEffect, useRef, useState } from "react";
import { SORT_LABELS, SORT_OPTIONS, type SortOption } from "@/lib/sort";

interface SortDropdownProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
  className?: string;
}

export function SortDropdown({ value, onChange, className = "" }: SortDropdownProps) {
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
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3 pl-4 pr-3 text-sm text-slate-100 transition-colors hover:border-quint-purple/40 focus:border-quint-purple/60 focus:bg-white/[0.06]"
      >
        <span className="text-slate-500">Sort by</span>
        <span className="font-medium">{SORT_LABELS[value]}</span>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="none"
          className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M5 7.5L10 12.5L15 7.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-xl border border-white/10 bg-[#0b0812] shadow-card-hover"
        >
          {SORT_OPTIONS.map((option) => (
            <div
              key={option}
              role="option"
              aria-selected={option === value}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-sm transition-colors hover:bg-white/[0.06] ${
                option === value ? "text-[#e6dcef]" : "text-[#9c8fae]"
              }`}
            >
              {SORT_LABELS[option]}
              {option === value && (
                <svg aria-hidden viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-quint-pink">
                  <path d="M4 10.5L8 14.5L16 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
