"use client";

import { actColor, type Lesson, type Scene } from "@nemi/video";
import {
  Brain, Captions, ChevronDown, CircleHelp, Clapperboard, Image as ImageIcon, ListChecks, Loader2, RefreshCw, ScanSearch,
  Shapes, Sparkles, SquareFunction, Type,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { api, asset, type ScenePatch } from "@/lib/engine";
import { Recorder } from "./Recorder";

export const KIND: Record<Scene["kind"], { icon: typeof Brain; label: string }> = {
  hook: { icon: Sparkles, label: "Hook" },
  concept: { icon: Type, label: "Concept" },
  image: { icon: ImageIcon, label: "Illustration" },
  diagram: { icon: ScanSearch, label: "Diagram · SAM 3.1" },
  formula: { icon: SquareFunction, label: "Formula · LaTeX" },
  manim: { icon: Clapperboard, label: "Manim animation" },
  quiz: { icon: CircleHelp, label: "Quiz" },
  summary: { icon: ListChecks, label: "Summary" },
};

type Props = {
  lesson: Lesson;
  scene: Scene;
  index: number;
  open: boolean;
  onToggle: () => void;
  onSeek: () => void;
  onChange: (l: Lesson) => void;
  readOnly?: boolean;
};

export function SceneEditor({ lesson, scene, index, open, onToggle, onSeek, onChange, readOnly = false }: Props) {
  const [draft, setDraft] = useState<ScenePatch>({});
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const k = KIND[scene.kind];
  const dirty = Object.keys(draft).length > 0;
  const v = <K extends keyof ScenePatch>(key: K) => (draft[key] ?? scene[key as keyof Scene]) as NonNullable<ScenePatch[K]>;
  const set = (patch: ScenePatch) => setDraft((d) => ({ ...d, ...patch }));

  useEffect(() => {
    setDraft({});
  }, [scene.id]);

  const save = async () => {
    setSaving(true);
    try {
      onChange(await api.patchScene(lesson.id, scene.id, draft));
      setDraft({});
    } finally {
      setSaving(false);
    }
  };

  const act = async (what: string, fn: () => Promise<unknown>) => {
    setWorking(what);
    try {
      await fn();
    } finally {
      setTimeout(() => setWorking(null), 1500);
    }
  };

  const narr = scene.assets.narration;
  const pending =
    !narr || (["hook", "image", "diagram"].includes(scene.kind) && !scene.assets.image) || (scene.kind === "manim" && !scene.assets.clip);

  return (
    <div className={`overflow-hidden rounded-xl border transition ${open ? "border-violet/50 bg-panel-2" : "border-line bg-panel-2/50"}`}>
      <button onClick={() => { onToggle(); onSeek(); }} className="flex w-full items-center gap-3 p-3 text-left">
        <span className="h-9 w-1 flex-none rounded-full" style={{ background: actColor(scene.act, lesson.theme) }} />
        <k.icon className="size-4 flex-none text-muted" />
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{index + 1}. {k.label}</span>
          <span className="block truncate text-sm font-semibold">{scene.title}</span>
        </span>
        {pending && <Loader2 className="size-4 animate-spin text-violet" />}
        {narr?.source === "teacher" && <span className="rounded bg-teal/15 px-1.5 py-0.5 text-[10px] font-bold text-teal">YOUR VOICE</span>}
        <ChevronDown className={`size-4 text-muted transition ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="space-y-3 border-t border-line p-3">
              <Field label="Title"><input className="field" value={v("title")} onChange={(e) => set({ title: e.target.value })} /></Field>
              <Field label="Narration" hint={narr ? `${narr.duration.toFixed(1)}s · ${narr.source === "teacher" ? "your voice" : narr.voice}` : "voicing…"}>
                <textarea className="field min-h-24 resize-y leading-relaxed" value={v("narration")} onChange={(e) => set({ narration: e.target.value })} />
              </Field>

              {["concept", "image", "summary"].includes(scene.kind) && (
                <Field label="On-screen lines">
                  <textarea className="field min-h-20" value={v("points").join("\n")} onChange={(e) => set({ points: e.target.value.split("\n") })} />
                </Field>
              )}
              {scene.kind === "formula" && (
                <Field label="LaTeX steps (one per line)">
                  <textarea className="field min-h-20 font-mono text-xs" value={v("latex").join("\n")} onChange={(e) => set({ latex: e.target.value.split("\n").filter(Boolean) })} />
                </Field>
              )}
              {scene.kind === "quiz" && scene.quiz && <QuizFields quiz={v("quiz")} onChange={(quiz) => set({ quiz })} />}
              {scene.kind === "manim" && (
                <Field label="What the animation shows">
                  <textarea className="field min-h-20 text-xs" value={v("manim_brief")} onChange={(e) => set({ manim_brief: e.target.value })} />
                </Field>
              )}
              {["hook", "image", "diagram"].includes(scene.kind) && (
                <Field label="Illustration prompt">
                  <textarea className="field min-h-16 text-xs" value={v("image_prompt")} onChange={(e) => set({ image_prompt: e.target.value })} />
                </Field>
              )}

              {scene.kind === "diagram" && <DiagramStatus scene={scene} />}
              {scene.kind === "manim" && <ManimStatus scene={scene} />}

              {!readOnly && <div className="flex flex-wrap gap-2 pt-1">
                {dirty && (
                  <button onClick={save} disabled={saving} className="btn-primary">
                    {saving ? <Loader2 className="size-4 animate-spin" /> : <Captions className="size-4" />}Save{draft.narration ? " & re-voice" : ""}
                  </button>
                )}
                {["hook", "image", "diagram"].includes(scene.kind) && (
                  <button className="btn-ghost" disabled={!!working || dirty} onClick={() => act("draw", () => api.redraw(lesson.id, scene.id))}>
                    <RefreshCw className={`size-4 ${working === "draw" ? "animate-spin" : ""}`} />Redraw
                  </button>
                )}
                {scene.kind === "manim" && (
                  <button className="btn-ghost" disabled={!!working || dirty} onClick={() => act("anim", () => api.animate(lesson.id, scene.id))}>
                    <Clapperboard className="size-4" />Re-animate
                  </button>
                )}
                <Recorder script={v("narration")} onDone={async (blob) => onChange(await api.voice(lesson.id, scene.id, blob))} />
              </div>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label flex justify-between">{label}{hint && <span className="normal-case tracking-normal">{hint}</span>}</span>
      {children}
    </label>
  );
}

function QuizFields({ quiz, onChange }: { quiz: NonNullable<Scene["quiz"]>; onChange: (q: NonNullable<Scene["quiz"]>) => void }) {
  return (
    <div className="space-y-2">
      <Field label="Question"><input className="field" value={quiz.question} onChange={(e) => onChange({ ...quiz, question: e.target.value })} /></Field>
      {quiz.options.map((o, i) => (
        <div key={i} className="flex items-center gap-2">
          <input type="radio" checked={quiz.answer_index === i} onChange={() => onChange({ ...quiz, answer_index: i })} className="accent-[var(--green)]" />
          <input className="field" value={o} onChange={(e) => onChange({ ...quiz, options: quiz.options.map((x, j) => (j === i ? e.target.value : x)) })} />
        </div>
      ))}
      <Field label="Explanation after the answer"><input className="field" value={quiz.explanation} onChange={(e) => onChange({ ...quiz, explanation: e.target.value })} /></Field>
    </div>
  );
}

function DiagramStatus({ scene }: { scene: Scene }) {
  const r = scene.assets.regions;
  if (!r.length) return <p className="flex items-center gap-2 text-xs text-muted"><Loader2 className="size-3 animate-spin" />Muse Spark + SAM 3.1 are finding the parts…</p>;
  return (
    <div className="flex items-start gap-3 rounded-lg bg-black/20 p-2.5 text-xs">
      {scene.assets.image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={asset(scene.assets.image)} alt="" className="w-20 rounded-md" />
      )}
      <div>
        <p className="mb-1 flex items-center gap-1 font-semibold text-teal"><Shapes className="size-3.5" />SAM 3.1 cut out {r.filter((x) => x.path).length}/{r.length} parts</p>
        {r.map((x) => (
          <p key={x.label} className="text-muted">{x.path ? "✓" : "·"} {x.label}{x.confidence ? ` — ${(x.confidence * 100).toFixed(0)}%` : ""}</p>
        ))}
      </div>
    </div>
  );
}

function ManimStatus({ scene }: { scene: Scene }) {
  const a = scene.assets.manim_attempts;
  if (!a.length) return null;
  return (
    <div className="rounded-lg bg-black/20 p-2.5 text-xs">
      <p className="mb-1 font-semibold text-violet">Write → audit → repair</p>
      {a.map((x, i) => {
        const vision = x.warnings.some((w) => w.startsWith("vision check"));
        const what = vision ? "Vision check" : `Auditor pass ${x.attempt}`;
        return (
          <p key={i} className={x.errors.length ? "text-amber" : "text-green"} title={x.errors.join("\n")}>
            {what}: {x.errors.length ? `${x.errors.length} issue(s) → repaired` : vision ? "looks right" : "clean"}
          </p>
        );
      })}
    </div>
  );
}
