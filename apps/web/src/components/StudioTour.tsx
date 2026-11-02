"use client";

import { X } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useStudioCopy } from "@/lib/studioCopy";

export const TOUR_SEEN = "nemi-tour-studio";

/** A short guide on the first visit: each step lights up the part of the studio it talks about. */
export function StudioTour({ onClose, onStep }: { onClose: () => void; onStep: (target: string) => void }) {
  const t = useStudioCopy().tour;
  const [i, setI] = useState(0);
  const [target, title, body] = t.steps[i];
  const last = i === t.steps.length - 1;

  useEffect(() => {
    onStep(target);
    // Wait a frame so a tab switched by onStep is on the page before we look for it
    let el: HTMLElement | null = null;
    const raf = requestAnimationFrame(() => {
      el = document.querySelector<HTMLElement>(`[data-tour~="${target}"]`);
      el?.classList.add("tour-focus");
      el?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => {
      cancelAnimationFrame(raf);
      el?.classList.remove("tour-focus");
    };
  }, [target, onStep]);

  const close = () => {
    try {
      localStorage.setItem(TOUR_SEEN, "1");
    } catch {}
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-violet/50 bg-panel p-4 shadow-2xl shadow-black/60 sm:left-auto sm:right-6 sm:w-[360px]"
      role="dialog"
      aria-label={t.welcome}
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet">
        {i === 0 ? t.welcome : t.of(i + 1, t.steps.length)}
        <button onClick={close} className="ml-auto rounded-md p-1 text-muted hover:text-ink" title={t.skip}><X className="size-4" /></button>
      </div>
      <p className="mt-2 text-base font-bold">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{body}</p>
      <div className="mt-4 flex items-center gap-2">
        <div className="flex gap-1">
          {t.steps.map((_, j) => <span key={j} className={`h-1.5 rounded-full transition-all ${j === i ? "w-5 bg-violet" : "w-1.5 bg-line"}`} />)}
        </div>
        {i > 0 && <button onClick={() => setI(i - 1)} className="btn-ghost ml-auto px-3 py-1.5 text-xs">{t.back}</button>}
        <button onClick={() => (last ? close() : setI(i + 1))} className={`btn-primary px-3 py-1.5 text-xs ${i === 0 ? "ml-auto" : ""}`}>
          {last ? t.done : t.next}
        </button>
      </div>
    </motion.div>
  );
}
