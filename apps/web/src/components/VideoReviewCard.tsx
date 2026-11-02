"use client";

import { FPS, type Lesson } from "@nemi/video";
import { ArrowRight, ChevronDown, Eye, Loader2, RefreshCw, TriangleAlert, Wrench } from "lucide-react";
import { useState } from "react";

const seconds = (time: string) => {
  const [m, s] = time.split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
};

/** What Muse Spark said after watching the finished MP4. Each note jumps the player to its moment. */
export function VideoReviewCard({ lesson, onSeek, onWatchAgain, onImprove }: {
  lesson: Lesson;
  onSeek: (frame: number) => void;
  onWatchAgain?: () => Promise<void>;
  onImprove?: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const r = lesson.video_review;
  const watching = !r && lesson.events[lesson.events.length - 1]?.step === "watch";
  // A fix starts with an info "fix" event and ends when the new review (or an error) lands
  const start = lesson.events.findLastIndex((e) => e.step === "fix" && e.level === "info");
  const fixing = start >= 0 && !lesson.events.slice(start + 1).some(
    (e) => (e.step === "watch" && e.level !== "info") || e.level === "error" || (e.step === "fix" && e.level === "warn"));
  const scores = lesson.review_scores ?? [];

  if (!r) {
    if (!watching) return null;
    return (
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-violet/30 bg-violet/10 p-4 text-sm">
        <Loader2 className="size-4 animate-spin text-violet" />Muse Spark is watching the whole video, picture and sound
      </div>
    );
  }
  const tone = r.score >= 8 ? "text-green" : r.score >= 6 ? "text-amber" : "text-red";
  return (
    <div className="mt-4 rounded-xl border border-violet/30 bg-panel/70 p-4">
      <div className="flex items-start gap-4">
        <div className="grid size-14 flex-none place-items-center rounded-2xl bg-panel-2">
          <span className={`text-2xl font-extrabold ${tone}`}>{r.score}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-violet"><Eye className="size-3.5" />Muse Spark watched the video</p>
          <p className="mt-1 text-sm leading-relaxed">{r.summary}</p>
          {scores.length > 1 && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-muted">
              Score history
              {scores.map((s, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <ArrowRight className="size-3" />}
                  <span className={i === scores.length - 1 ? "text-ink" : ""}>{s}</span>
                </span>
              ))}
            </p>
          )}
        </div>
        {onWatchAgain && (
          <button className="btn-ghost px-2.5 py-1.5 text-xs" disabled={busy} title="Watch again"
            onClick={async () => { setBusy(true); try { await onWatchAgain(); } finally { setBusy(false); } }}>
            <RefreshCw className={`size-3.5 ${busy ? "animate-spin" : ""}`} />
          </button>
        )}
      </div>
      {r.notes.length > 0 && (
        <ul className="mt-4 space-y-2">
          {r.notes.map((n, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <button onClick={() => onSeek(Math.round(seconds(n.time) * FPS))}
                className={`h-fit flex-none rounded-md px-2 py-0.5 font-mono text-xs font-bold ${n.severity === "major" ? "bg-amber/20 text-amber" : "bg-panel-2 text-muted"} hover:text-ink`}>
                {n.time}
              </button>
              <div>
                <p className="flex items-start gap-1.5">{n.severity === "major" && <TriangleAlert className="mt-0.5 size-3.5 flex-none text-amber" />}{n.issue}</p>
                <p className="mt-0.5 text-muted">{n.fix}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
      {onImprove && r.notes.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-violet/10 p-3">
          {fixing ? (
            <p className="flex items-center gap-2 text-sm"><Loader2 className="size-4 animate-spin text-violet" />Muse Spark is fixing its notes, rendering again and watching the new version</p>
          ) : (
            <>
              <p className="flex-1 text-sm text-muted">Muse Spark can fix these notes itself, render again and watch the result.</p>
              <button className="btn-primary px-3 py-2 text-xs" disabled={busy}
                onClick={async () => { setBusy(true); try { await onImprove(); } finally { setBusy(false); } }}>
                <Wrench className="size-3.5" />Let Muse Spark fix these
              </button>
            </>
          )}
        </div>
      )}
      {r.strengths.length > 0 && (
        <button onClick={() => setOpen(!open)} className="mt-3 flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
          <ChevronDown className={`size-3.5 transition ${open ? "rotate-180" : ""}`} />What works ({r.strengths.length})
        </button>
      )}
      {open && <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted">{r.strengths.map((s) => <li key={s}>{s}</li>)}</ul>}
    </div>
  );
}
