"use client";

import { EVENT_FORMATS, EventAvatar, EventCover, EventGrid, EventStory, type EventKit } from "@nemi/video";
import { Player } from "@remotion/player";
import { Check, Copy, Download, Film, Loader2, Plus, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { api, asset, ENGINE, useKitLive } from "@/lib/engine";
import { useEventsCopy } from "@/lib/eventsCopy";
import { LangToggle } from "@/lib/i18n";
import { useLogText } from "@/lib/studioCopy";

type Format = keyof typeof EVENT_FORMATS;
const VIEWS = { EventGrid, EventCover, EventAvatar, EventStory };

function Preview({ kit, format, animate = false }: { kit: EventKit; format: Format; animate?: boolean }) {
  const f = EVENT_FORMATS[format];
  return (
    <Player
      component={VIEWS[format] as React.FC<Record<string, unknown>>}
      inputProps={{ kit, assetBase: ENGINE, line: 1 }}
      durationInFrames={f.frames}
      fps={30}
      compositionWidth={f.width}
      compositionHeight={f.height}
      style={{ width: "100%", aspectRatio: `${f.width} / ${f.height}` }}
      autoPlay={animate}
      loop={animate}
      initiallyMuted
      clickToPlay={false}
      acknowledgeRemotionLicense
    />
  );
}

export function KitView() {
  const { id } = useParams<{ id: string }>();
  const { kit, error } = useKitLive(id);
  const t = useEventsCopy();
  const say = useLogText();
  const [exporting, setExporting] = useState(false);

  if (!kit) {
    return <div className="grid flex-1 place-items-center">{error ? <p className="text-red">{error}</p> : <Loader2 className="size-6 animate-spin text-muted" />}</div>;
  }
  const working = kit.status === "queued" || kit.status === "designing" || kit.status === "drawing";
  const rendering = kit.status === "exporting" || (exporting && !kit.download);
  const s = kit.spec;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6">
      <header className="mb-8 flex flex-wrap items-center gap-4">
        <Logo />
        <Link href="/events" className="ml-auto flex items-center gap-1.5 text-sm text-muted hover:text-ink"><Plus className="size-4" />{t.another}</Link>
        <LangToggle />
      </header>

      <div className="mb-8 flex flex-wrap items-end gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{kit.name}</h1>
          <p className="mt-1 text-lg" style={{ color: s?.palette.accent }}>{s?.tagline}</p>
          <p className="text-sm text-muted">{[kit.date, kit.place].filter(Boolean).join(", ")}</p>
        </div>
        {kit.status === "ready" && (kit.download ? (
          <a href={asset(kit.download)} className="btn-primary"><Download className="size-4" />{t.download}</a>
        ) : (
          <button className="btn-primary" disabled={rendering} onClick={async () => { setExporting(true); await api.exportEvent(kit.id).catch(() => setExporting(false)); }}>
            {rendering ? <Loader2 className="size-4 animate-spin" /> : <Film className="size-4" />}{rendering ? t.exporting : t.export}
          </button>
        ))}
        {kit.status === "exporting" && <span className="btn-ghost"><Loader2 className="size-4 animate-spin" />{t.exporting}</span>}
      </div>

      {(working || kit.status === "error") && (
        <div className="mb-8 rounded-2xl border border-line bg-panel/70 p-5">
          <p className="mb-3 flex items-center gap-2 font-semibold">
            {kit.status === "error" ? <TriangleAlert className="size-4 text-red" /> : <Loader2 className="size-4 animate-spin text-violet" />}
            {kit.status === "error" ? kit.error : t.working}
          </p>
          <ul className="space-y-1.5 text-sm">
            {kit.events.map((e, i) => (
              <li key={i} className={e.step === "think" ? "ml-5 border-l border-violet/30 pl-3 text-xs italic text-muted" : e.level === "ok" ? "text-green" : e.level === "warn" ? "text-amber" : e.level === "error" ? "text-red" : "text-ink/90"}>
                {say(e.message)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {kit.key_visual && (
        <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
          <section>
            <h2 className="text-lg font-bold">{t.grid}</h2>
            <p className="mb-3 text-sm text-muted">{t.gridHint}</p>
            <div className="relative mx-auto max-w-md overflow-hidden rounded-2xl border border-line">
              <Preview kit={kit} format="EventGrid" />
              <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }, (_, i) => <div key={i} className="border border-bg" style={{ borderWidth: 2 }} />)}
              </div>
            </div>
          </section>
          <section className="grid grid-cols-2 gap-5">
            <div className="col-span-1">
              <h2 className="mb-3 text-lg font-bold">{t.story}</h2>
              <div className="overflow-hidden rounded-2xl border border-line"><Preview kit={kit} format="EventStory" animate /></div>
            </div>
            <div className="col-span-1 space-y-5">
              <div>
                <h2 className="mb-3 text-lg font-bold">{t.avatar}</h2>
                <div className="mx-auto w-40 overflow-hidden rounded-full border border-line"><Preview kit={kit} format="EventAvatar" /></div>
              </div>
              <div>
                <h2 className="mb-3 text-lg font-bold">{t.cover}</h2>
                <div className="overflow-hidden rounded-2xl border border-line"><Preview kit={kit} format="EventCover" /></div>
              </div>
            </div>
          </section>
        </div>
      )}

      {s && (
        <section className="mt-12">
          <h2 className="mb-4 text-lg font-bold">{t.copies}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(["instagram", "x", "linkedin", "whatsapp", "luma"] as const).map((k) => (
              <CopyCard key={k} title={{ instagram: "Instagram", x: "X", linkedin: "LinkedIn", whatsapp: "WhatsApp", luma: "Luma" }[k]} text={s.copies[k]} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}

function CopyCard({ title, text }: { title: string; text: string }) {
  const t = useEventsCopy();
  const [done, setDone] = useState(false);
  return (
    <div className="rounded-2xl border border-line bg-panel/70 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-bold">{title}</span>
        <button className="btn-ghost px-2.5 py-1 text-xs" onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); }}>
          {done ? <Check className="size-3.5 text-green" /> : <Copy className="size-3.5" />}{done ? t.copied : t.copyBtn}
        </button>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{text}</p>
    </div>
  );
}
