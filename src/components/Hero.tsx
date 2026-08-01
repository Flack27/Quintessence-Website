import { publicAsset } from "@/lib/assets";

interface HeroProps {
  postCount: number;
}

export function Hero({ postCount }: HeroProps) {
  return (
    <section className="relative overflow-hidden px-6 pb-16 pt-16 text-center sm:pt-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-quint-radial"
      />
      <div className="relative mx-auto mb-6 flex justify-center">
        <img
          src={publicAsset("/logo-quintessence-v1.png")}
          alt="Quintessence"
          className="max-h-40 w-auto object-contain drop-shadow-[0_0_45px_rgba(236,77,174,0.35)] sm:max-h-48"
        />
      </div>

      <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-quint-pink/30 bg-white/[0.03] px-4 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-quint-pink">
        <span aria-hidden>&#10022;</span> Guild Knowledge Base
      </p>

      <h1 className="mx-auto max-w-4xl font-display text-4xl font-extrabold uppercase leading-[0.95] tracking-tight sm:text-5xl md:text-6xl">
        <span className="block bg-quint-gradient bg-clip-text text-transparent">Quintessence</span>
        <span className="block text-white">Codex</span>
      </h1>

      <p className="mx-auto mt-8 max-w-xl text-base text-slate-400">
        The Quintessence Codex is where the guild keeps every guide for every game we play,
        one searchable place instead of scattered Discord messages. {postCount} guide{postCount === 1 ? "" : "s"} published so far.
      </p>
    </section>
  );
}
