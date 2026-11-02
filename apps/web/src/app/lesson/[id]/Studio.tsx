"use client";

import { actColor, timeline, type Lesson } from "@nemi/video";
import type { PlayerRef } from "@remotion/player";
import { Check, CircleHelp, Download, Film, Link2, Loader2, Monitor, Smartphone } from "lucide-react";
import { motion } from "motion/react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AgentLog, AgentStage } from "@/components/AgentLog";
import { LessonPlayer } from "@/components/LessonPlayer";
import { Logo } from "@/components/Logo";
import { KIND, SceneEditor } from "@/components/SceneEditor";
import { ClassResultsCard } from "@/components/ClassResultsCard";
import { StudioTour, TOUR_SEEN } from "@/components/StudioTour";
import { VideoReviewCard } from "@/components/VideoReviewCard";
import { api, asset, busy, isDemo, useLessonLive } from "@/lib/engine";
import { LangToggle } from "@/lib/i18n";
import { useStudioCopy } from "@/lib/studioCopy";

const THEMES = ["night", "chalk", "paper"];

export function Studio() {
  const { id } = useParams<{ id: string }>();
  const { lesson, setLesson, error } = useLessonLive(id);
  const player = useRef<PlayerRef>(null);
  const [tab, setTab] = useState<"agent" | "scenes">("agent");
  const [open, setOpen] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [copied, setCopied] = useState(false);
  const [tour, setTour] = useState(false);
  const t = useStudioCopy();
  const ready = !!lesson?.scenes.length;
  const onStep = useCallback((target: string) => setTab(target === "scenes" ? "scenes" : "agent"), []);

  // The guide opens by itself once, the first time a lesson is ready to play
  useEffect(() => {
    if (!ready) return;
    try {
      if (!localStorage.getItem(TOUR_SEEN)) setTour(true);
    } catch {}
  }, [ready]);

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
          <span className="rounded-full bg-violet/15 px-2.5 py-1 text-xs font-semibold text-violet">{t.example}</span>
        ) : (
          <>
            <StatusPill lesson={lesson} working={working} labels={t.status} />
            <div className="flex rounded-xl border border-line bg-panel-2 p-1">
              {THEMES.map((th) => (
                <button key={th} onClick={() => patch({ theme: th })} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${lesson.theme.name === th ? "bg-violet text-[#120f22]" : "text-muted hover:text-ink"}`}>{t.themes[th] ?? th}</button>
              ))}
            </div>
            <button className="btn-ghost px-3" title={t.switchFormat} onClick={() => patch({ format: lesson.format === "landscape" ? "portrait" : "landscape" })}>
              {lesson.format === "landscape" ? <Monitor className="size-4" /> : <Smartphone className="size-4" />}
            </button>
          </>
        )}
        <button className="btn-ghost" onClick={share} disabled={!lesson.scenes.length} data-tour="share">
          {copied ? <Check className="size-4 text-green" /> : <Link2 className="size-4" />}{t.studentLink}
        </button>
        {!demo && <ExportButton lesson={lesson} onStart={async () => setLesson(await api.render(lesson.id))} disabled={working} labels={t} />}
        <button className="btn-ghost px-3" onClick={() => setTour(true)} disabled={!ready} title={t.guide}><CircleHelp className="size-4" /></button>
        <LangToggle />
      </header>

      <div className="grid flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="min-w-0">
          {lesson.scenes.length ? (
            <div className={lesson.format === "portrait" ? "mx-auto max-w-[440px]" : ""} data-tour="player">
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
          <div data-tour={demo ? "export" : undefined}>
          <VideoReviewCard
            lesson={lesson}
            onSeek={(f) => { player.current?.seekTo(f); player.current?.play(); }}
            onWatchAgain={demo ? undefined : async () => { await api.watch(lesson.id); }}
            onImprove={demo ? undefined : async () => { await api.improve(lesson.id); }}
          />
          </div>
          <ClassResultsCard lesson={lesson} onReteach={demo ? undefined : async () => { await api.reteach(lesson.id); }} />
          {lesson.objectives.length > 0 && (
            <div className="mt-4 rounded-xl border border-line bg-panel/60 p-4 text-sm">
              <p className="label">{t.objectives}</p>
              <ul className="list-inside list-disc space-y-0.5 text-muted">{lesson.objectives.map((o) => <li key={o}>{o}</li>)}</ul>
            </div>
          )}
        </div>

        <aside className="flex min-h-0 flex-col rounded-2xl border border-line bg-panel/70 lg:max-h-[calc(100vh-110px)]" data-tour="scenes">
          <div className="flex gap-1 border-b border-line p-2">
            {(["agent", "scenes"] as const).map((k) => (
              <button key={k} onClick={() => setTab(k)} className={`relative flex-1 rounded-lg py-1.5 text-sm font-semibold ${tab === k ? "text-ink" : "text-muted"}`}>
                {tab === k && <motion.span layoutId="tab" className="absolute inset-0 rounded-lg bg-panel-2" />}
                <span className="relative">{k === "agent" ? t.tabs.agent : `${t.tabs.scenes} (${lesson.scenes.length})`}</span>
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
      {tour && <StudioTour onClose={() => setTour(false)} onStep={onStep} />}
    </div>
  );
}

function StatusPill({ lesson, working, labels }: { lesson: Lesson; working: boolean; labels: Record<string, string> }) {
  const label =
    lesson.status === "error" ? labels.error : lesson.status === "rendering" ? labels.rendering : working ? lesson.status === "ready" ? labels.finishing : labels[lesson.status] ?? lesson.status : labels.ready;
  return (
    <span className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${lesson.status === "error" ? "bg-red/15 text-red" : working || lesson.status === "rendering" ? "bg-violet/15 text-violet" : "bg-green/15 text-green"}`}>
      {(working || lesson.status === "rendering") && lesson.status !== "error" ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
      {label}
    </span>
  );
}

function ExportButton({ lesson, onStart, disabled, labels }: { lesson: Lesson; onStart: () => void; disabled: boolean; labels: { export: string; reexport: string } }) {
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
    <div className="flex gap-2" data-tour="export">
      {lesson.video && (
        <a href={asset(lesson.video)} download className="btn-ghost"><Download className="size-4" />MP4</a>
      )}
      <button className="btn-primary" onClick={onStart} disabled={disabled || !lesson.scenes.length}>
        <Film className="size-4" />{lesson.video ? labels.reexport : labels.export}
      </button>
    </div>
  );
}
