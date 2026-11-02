"use client";

import type { Lesson, LessonEvent } from "@nemi/video";
import {
  BookOpen, Brain, CircleCheck, Clapperboard, Film, ListChecks, Loader2, Mic, ScanSearch, Sparkles, TriangleAlert, WandSparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";

const STEP: Record<string, { icon: typeof Brain; label: string; color: string }> = {
  read: { icon: BookOpen, label: "Muse Spark", color: "text-teal" },
  plan: { icon: Sparkles, label: "Muse Spark", color: "text-violet" },
  think: { icon: Brain, label: "thinking", color: "text-violet/70" },
  review: { icon: ListChecks, label: "Review", color: "text-amber" },
  image: { icon: WandSparkles, label: "Muse Image", color: "text-teal" },
  sam: { icon: ScanSearch, label: "SAM 3.1", color: "text-teal" },
  manim: { icon: Clapperboard, label: "Manim agent", color: "text-violet" },
  voice: { icon: Mic, label: "Voice", color: "text-teal" },
  render: { icon: Film, label: "Remotion", color: "text-teal" },
  done: { icon: CircleCheck, label: "Done", color: "text-green" },
  error: { icon: TriangleAlert, label: "Problem", color: "text-red" },
};

export function AgentLog({ lesson }: { lesson: Lesson }) {
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [lesson.events.length]);
  return (
    <div className="space-y-1.5">
      <AnimatePresence initial={false}>
        {lesson.events.map((e, i) => <Row key={`${e.t}-${i}`} e={e} />)}
      </AnimatePresence>
      {lesson.review && <Review review={lesson.review} />}
      <div ref={end} />
    </div>
  );
}

function Row({ e }: { e: LessonEvent }) {
  const s = STEP[e.step] ?? STEP.plan;
  const Icon = s.icon;
  const tone = e.level === "ok" ? "text-green" : e.level === "warn" ? "text-amber" : e.level === "error" ? "text-red" : s.color;
  if (e.step === "think") {
    return (
      <motion.p initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="ml-7 border-l border-violet/30 pl-3 text-xs italic leading-relaxed text-muted">
        {e.message}
      </motion.p>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2.5 text-sm">
      <Icon className={`mt-0.5 size-4 flex-none ${tone}`} />
      <p className="leading-snug">
        <span className={`mr-1.5 text-[11px] font-bold uppercase tracking-wide ${tone}`}>{s.label}</span>
        <span className="text-ink/90">{e.message}</span>
      </p>
    </motion.div>
  );
}

function Review({ review }: { review: NonNullable<Lesson["review"]> }) {
  return (
    <details className="mt-3 rounded-xl border border-line bg-panel-2/70 p-3 text-sm">
      <summary className="cursor-pointer font-semibold">
        First-draft review: {review.checks.filter((c) => c.verdict === "yes").length}/{review.checks.length} questions passed
        {review.fact_issues.length > 0 && `, ${review.fact_issues.length} fact issues fixed`}
      </summary>
      <ul className="mt-2 space-y-2">
        {review.checks.map((c) => (
          <li key={c.question} className="flex gap-2">
            <span className={c.verdict === "yes" ? "text-green" : c.verdict === "no" ? "text-red" : "text-amber"}>●</span>
            <span><b>{c.question}</b> <span className="text-muted">{c.reason}</span></span>
          </li>
        ))}
        {review.fact_issues.map((f) => (
          <li key={f} className="flex gap-2 text-muted"><span className="text-amber">!</span>{f}</li>
        ))}
      </ul>
    </details>
  );
}

/** Big centered view while the plan doesn't exist yet. */
export function AgentStage({ lesson }: { lesson: Lesson }) {
  const thoughts = lesson.events.filter((e) => e.step === "think").slice(-3);
  const last = [...lesson.events].reverse().find((e) => e.step !== "think");
  return (
    <div className="flex aspect-video w-full flex-col items-center justify-center gap-6 rounded-2xl border border-line bg-panel/70 p-8 text-center">
      {lesson.status === "error" ? (
        <TriangleAlert className="size-10 text-red" />
      ) : (
        <div className="relative grid size-16 place-items-center">
          <span className="absolute inset-0 animate-ping rounded-full bg-violet/20" />
          <Loader2 className="size-9 animate-spin text-violet" />
        </div>
      )}
      <div>
        <p className="text-xl font-bold">{lesson.status === "error" ? "Something went wrong" : last?.message ?? "Starting…"}</p>
        <p className="mt-1 text-sm text-muted">{lesson.error ?? (lesson.source_name ? `Reading ${lesson.source_name}` : lesson.topic)}</p>
      </div>
      <div className="w-full max-w-xl space-y-2">
        <AnimatePresence mode="popLayout">
          {thoughts.map((t) => (
            <motion.p key={t.t} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-sm italic text-violet/80">
              “{t.message}”
            </motion.p>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
