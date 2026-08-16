import { useEffect } from "react";

interface LightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

/** Full-screen preview shown when a guide image is clicked. Closes on backdrop click, close button, or Escape. */
export function Lightbox({ src, alt, onClose }: LightboxProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-void-950/90 p-6 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute right-5 top-5 rounded-full border border-white/15 p-2 text-slate-300 transition-colors hover:border-quint-purple/50 hover:text-white"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5">
          <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <img
        src={src}
        alt={alt}
        onClick={(event) => event.stopPropagation()}
        className="max-h-full max-w-full rounded-xl border border-white/10 object-contain"
      />
    </div>
  );
}
