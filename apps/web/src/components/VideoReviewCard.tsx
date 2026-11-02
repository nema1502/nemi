"use client";

import { FPS, type Lesson } from "@nemi/video";
import { ChevronDown, Eye, Loader2, RefreshCw, TriangleAlert } from "lucide-react";
import { useState } from "react";

const seconds = (time: string) => {
  const [m, s] = time.split(":").map(Number);
  return (m || 0) * 60 + (s || 0);
};

/** What Muse Spark said after watching the finished MP4. Each note jumps the player to its moment. */
export function VideoReviewCard({ lesson, onSeek, onWatchAgain }: { lesson: Lesson; onSeek: (frame: number) => void; onWatchAgain?: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const r = lesson.video_review;
  const watching = !r && lesson.events.length > 0 && lesson.events[lesson.events.length - 1].step === "watch";

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
      {r.strengths.length > 0 && (
        <button onClick={() => setOpen(!open)} className="mt-3 flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink">
          <ChevronDown className={`size-3.5 transition ${open ? "rotate-180" : ""}`} />What works ({r.strengths.length})
        </button>
      )}
      {open && <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted">{r.strengths.map((s) => <li key={s}>{s}</li>)}</ul>}
    </div>
  );
}
