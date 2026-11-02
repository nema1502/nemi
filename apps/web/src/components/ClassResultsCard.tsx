"use client";

import type { Lesson } from "@nemi/video";
import { GraduationCap, Lightbulb, Loader2, Users } from "lucide-react";
import { useState } from "react";

/** Nemi Classroom: what students answered on the student link, and what Muse Spark suggests to reteach. */
export function ClassResultsCard({ lesson, onReteach }: { lesson: Lesson; onReteach?: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const quizzes = lesson.scenes.filter((s) => s.quiz);
  if (!quizzes.length) return null;
  const answers = lesson.answers ?? [];
  const students = [...new Set(answers.map((a) => a.student))];
  const last = lesson.events[lesson.events.length - 1];
  const thinking = busy || (last?.step === "class" && last.level === "info");
  const insight = lesson.class_insight;

  return (
    <div className="mt-4 rounded-xl border border-line bg-panel/70 p-4">
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-teal">
        <GraduationCap className="size-3.5" />Class results
        <span className="ml-auto flex items-center gap-1 normal-case tracking-normal text-muted"><Users className="size-3.5" />{students.length} students</span>
      </p>

      {!answers.length ? (
        <p className="mt-2 text-sm text-muted">Share the student link. Each student&apos;s quiz answers show up here as they watch.</p>
      ) : (
        <>
          <ul className="mt-3 space-y-3">
            {quizzes.map((s) => {
              const got = answers.filter((a) => a.scene_id === s.id);
              const right = got.filter((a) => a.correct).length;
              const pct = got.length ? Math.round((100 * right) / got.length) : 0;
              const wrong = s.quiz!.options
                .map((o, i) => ({ o, n: got.filter((a) => a.picked === i).length, i }))
                .filter((x) => x.i !== s.quiz!.answer_index && x.n > 0)
                .sort((a, b) => b.n - a.n)[0];
              return (
                <li key={s.id} className="text-sm">
                  <div className="flex justify-between gap-3"><span className="font-semibold">{s.quiz!.question}</span><span className="text-muted">{right}/{got.length}</span></div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-panel-2"><div className="h-full rounded-full bg-green" style={{ width: `${pct}%` }} /></div>
                  {wrong && <p className="mt-1 text-xs text-amber">Most common wrong answer: {wrong.o} ({wrong.n})</p>}
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {students.map((name) => {
              const mine = answers.filter((a) => a.student === name);
              const ok = mine.filter((a) => a.correct).length;
              return (
                <span key={name} className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${ok === mine.length ? "bg-green/15 text-green" : "bg-amber/15 text-amber"}`}>
                  {name} {ok}/{mine.length}
                </span>
              );
            })}
          </div>

          {insight ? (
            <div className="mt-4 rounded-xl bg-teal/10 p-3 text-sm">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-teal"><Lightbulb className="size-3.5" />Muse Spark on what to reteach</p>
              <p className="mt-1.5 leading-relaxed">{insight.summary}</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-muted">{insight.reteach.map((r) => <li key={r}>{r}</li>)}</ul>
              <p className="mt-2"><span className="font-semibold">Open tomorrow with:</span> {insight.warmup_question}</p>
            </div>
          ) : null}
          {onReteach && (
            <button className="btn-ghost mt-3 px-3 py-2 text-xs" disabled={thinking}
              onClick={async () => { setBusy(true); try { await onReteach(); } finally { setTimeout(() => setBusy(false), 4000); } }}>
              {thinking ? <Loader2 className="size-3.5 animate-spin" /> : <Lightbulb className="size-3.5" />}
              {insight ? "Read the results again" : "What should I reteach?"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
