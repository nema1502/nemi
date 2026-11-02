"use client";

import { actColor, timeline, type Lesson } from "@nemi/video";
import type { PlayerRef } from "@remotion/player";
import { Check, Download, Film, Link2, Loader2, Monitor, Smartphone } from "lucide-react";
import { motion } from "motion/react";
import { useParams } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { AgentLog, AgentStage } from "@/components/AgentLog";
import { LessonPlayer } from "@/components/LessonPlayer";
import { Logo } from "@/components/Logo";
import { KIND, SceneEditor } from "@/components/SceneEditor";
import { ClassResultsCard } from "@/components/ClassResultsCard";
import { VideoReviewCard } from "@/components/VideoReviewCard";
import { api, asset, busy, isDemo, useLessonLive } from "@/lib/engine";

const THEMES = ["night", "chalk", "paper"];

export function Studio() {
  const { id } = useParams<{ id: string }>();
  const { lesson, setLesson, error } = useLessonLive(id);
  const player = useRef<PlayerRef>(null);
  const [tab, setTab] = useState<"agent" | "scenes">("agent");
  const [open, setOpen] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [copied, setCopied] = useState(false);

  const tl = useMemo(() => (lesson?.scenes.length ? timeline(lesson) : null), [lesson]);
  const current = tl?.items.findLast((i) => frame >= i.from)?.scene.id;

  if (!lesson) {
    return (
      <div className="grid flex-1 place-items-center text-muted">
        {error ? <p className="text-red">{error}</p> : <Loader2 className="size-6 animate-spin" />}
      </div>
    );
  }

  const patch = async (body: Parameters<typeof api.patch>[1]) => setLesson(await api.patch(lesson.id, body));
  const demo = isDemo(lesson.id);
  const working = !demo && busy(lesson);
  const share = () => {
    navigator.clipboard.writeText(`${window.location.origin}/watch/${lesson.id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="mx-auto flex w-full max-w-[1500px] flex-1 flex-col px-4 pb-10 pt-4 sm:px-6">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <Logo small />
        <span className="hidden h-5 w-px bg-line sm:block" />
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold">{lesson.title || lesson.topic || lesson.source_name}</h1>
        {demo ? (
          <span className="rounded-full bg-violet/15 px-2.5 py-1 text-xs font-semibold text-violet">Example lesson, read-only</span>
        ) : (
          <>
            <StatusPill lesson={lesson} working={working} />
            <div className="flex rounded-xl border border-line bg-panel-2 p-1">
              {THEMES.map((t) => (
                <button key={t} onClick={() => patch({ theme: t })} className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize ${lesson.theme.name === t ? "bg-violet text-[#120f22]" : "text-muted hover:text-ink"}`}>{t}</button>
              ))}
            </div>
            <button className="btn-ghost px-3" title="Switch format" onClick={() => patch({ format: lesson.format === "landscape" ? "portrait" : "landscape" })}>
              {lesson.format === "landscape" ? <Monitor className="size-4" /> : <Smartphone className="size-4" />}
            </button>
          </>
        )}
        <button className="btn-ghost" onClick={share} disabled={!lesson.scenes.length}>
          {copied ? <Check className="size-4 text-green" /> : <Link2 className="size-4" />}Student link
        </button>
        {!demo && <ExportButton lesson={lesson} onStart={async () => setLesson(await api.render(lesson.id))} disabled={working} />}
      </header>

      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          {lesson.scenes.length ? (
            <div className={lesson.format === "portrait" ? "mx-auto max-w-[440px]" : ""}>
              <LessonPlayer lesson={lesson} playerRef={player} onFrame={setFrame} />
            </div>
          ) : (
            <AgentStage lesson={lesson} />
          )}
          {tl && (
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
              {tl.items.map(({ scene, from, timing }, i) => {
                const K = KIND[scene.kind].icon;
                return (
                  <button
                    key={scene.id}
                    onClick={() => { player.current?.seekTo(from); setOpen(scene.id); setTab("scenes"); }}
                    style={{ flexGrow: timing.frames, borderColor: current === scene.id ? actColor(scene.act, lesson.theme) : undefined }}
                    className="min-w-24 basis-0 rounded-lg border border-line bg-panel-2 px-2.5 py-2 text-left transition hover:border-violet/50"
                  >
                    <span className="flex items-center gap-1.5 text-[11px] text-muted"><K className="size-3" />{i + 1}</span>
                    <span className="block truncate text-xs font-semibold">{scene.title}</span>
                  </button>
                );
              })}
            </div>
          )}
          <VideoReviewCard
            lesson={lesson}
            onSeek={(f) => { player.current?.seekTo(f); player.current?.play(); }}
            onWatchAgain={demo ? undefined : async () => { await api.watch(lesson.id); }}
            onImprove={demo ? undefined : async () => { await api.improve(lesson.id); }}
          />
          <ClassResultsCard lesson={lesson} onReteach={demo ? undefined : async () => { await api.reteach(lesson.id); }} />
          {lesson.objectives.length > 0 && (
            <div className="mt-4 rounded-xl border border-line bg-panel/60 p-4 text-sm">
              <p className="label">Learning objectives</p>
              <ul className="list-inside list-disc space-y-0.5 text-muted">{lesson.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
            </div>
          )}
        </div>

        <aside className="flex min-h-0 flex-col rounded-2xl border border-line bg-panel/70 lg:max-h-[calc(100vh-110px)]">
          <div className="flex gap-1 border-b border-line p-2">
            {(["agent", "scenes"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`relative flex-1 rounded-lg py-1.5 text-sm font-semibold capitalize ${tab === t ? "text-ink" : "text-muted"}`}>
                {tab === t && <motion.span layoutId="tab" className="absolute inset-0 rounded-lg bg-panel-2" />}
                <span className="relative">{t === "agent" ? "Agent" : `Scenes (${lesson.scenes.length})`}</span>
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {tab === "agent" ? (
              <AgentLog lesson={lesson} />
            ) : (
              <div className="space-y-2">
                {lesson.scenes.map((s, i) => (
                  <SceneEditor
                    key={s.id}
                    lesson={lesson}
                    scene={s}
                    index={i}
                    open={open === s.id}
                    onToggle={() => setOpen(open === s.id ? null : s.id)}
                    onSeek={() => { const it = tl?.items.find((x) => x.scene.id === s.id); if (it) player.current?.seekTo(it.from); }}
                    onChange={setLesson}
                    readOnly={demo}
                  />
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function StatusPill({ lesson, working }: { lesson: Lesson; working: boolean }) {
  const label =
    lesson.status === "error" ? "Error" : lesson.status === "rendering" ? "Rendering MP4" : working ? lesson.status === "ready" ? "Finishing scenes" : lesson.status : "Ready";
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${lesson.status === "error" ? "bg-red/15 text-red" : working || lesson.status === "rendering" ? "bg-violet/15 text-violet" : "bg-green/15 text-green"}`}>
      {(working || lesson.status === "rendering") && lesson.status !== "error" ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
      {label}
    </span>
  );
}

function ExportButton({ lesson, onStart, disabled }: { lesson: Lesson; onStart: () => void; disabled: boolean }) {
  if (lesson.status === "rendering") {
    const p = lesson.render_progress ?? 0;
    return (
      <span className="btn-ghost relative overflow-hidden">
        <span className="absolute inset-y-0 left-0 bg-violet/25 transition-all" style={{ width: `${p * 100}%` }} />
        <Loader2 className="relative size-4 animate-spin" /><span className="relative">MP4 {Math.round(p * 100)}%</span>
      </span>
    );
  }
  return (
    <div className="flex gap-2">
      {lesson.video && (
        <a href={asset(lesson.video)} download className="btn-ghost"><Download className="size-4" />MP4</a>
      )}
      <button className="btn-primary" onClick={onStart} disabled={disabled || !lesson.scenes.length}>
        <Film className="size-4" />{lesson.video ? "Re-export" : "Export MP4"}
      </button>
    </div>
  );
}
