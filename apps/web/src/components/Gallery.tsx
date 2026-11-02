"use client";

import type { Lesson } from "@nemi/video";
import { Clapperboard, Loader2, Smartphone } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, asset, isDemo, type LessonCard } from "@/lib/engine";
import { useCopy, useLang } from "@/lib/i18n";

// Read-only examples shipped with the site, in public/<id>/
const DEMOS = ["demo", "demo-en", "demo-pitagoras", "demo-photosynthesis", "demo-tierra", "demo-sistema-solar"];
const TAG: Record<string, string> = { Spanish: "ES", English: "EN", Portuguese: "PT" };

async function demoCard(id: string): Promise<LessonCard | null> {
  try {
    const l: Lesson = await (await fetch(`/${id}/lesson.json`)).json();
    return {
      id, title: l.title, status: "ready", created_at: l.created_at, format: l.format, theme: l.theme.name,
      scenes: l.scenes.length, cover: l.scenes.find((s) => s.assets.image)?.assets.image ?? null, language: l.language,
    };
  } catch {
    return null;
  }
}

export function Gallery() {
  const { lang } = useLang();
  const t = useCopy();
  const [demos, setDemos] = useState<LessonCard[]>([]);
  const [mine, setMine] = useState<LessonCard[]>([]);

  useEffect(() => {
    Promise.all(DEMOS.map(demoCard)).then((cards) => setDemos(cards.filter((c): c is LessonCard => !!c)));
    api.list().then(setMine).catch(() => {});
  }, []);

  // Examples in the page's language first
  const own = lang === "es" ? "Spanish" : "English";
  const items = [...demos.filter((d) => d.language === own), ...demos.filter((d) => d.language !== own), ...mine];
  if (!items.length) return null;

  return (
    <section className="mt-16">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-muted">{t.gallery.title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 9).map((l, i) => (
          <motion.div key={l.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Link href={`/lesson/${l.id}`} className="group block overflow-hidden rounded-2xl border border-line bg-panel transition hover:border-violet/60">
              <div className="relative aspect-video overflow-hidden bg-panel-2">
                {l.cover ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset(l.cover)} alt="" className="size-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <div className="grid size-full place-items-center text-muted"><Clapperboard className="size-8" /></div>
                )}
                {isDemo(l.id) && (
                  <span className="absolute left-2 top-2 rounded-full bg-violet px-2 py-0.5 text-[11px] font-bold text-[#120f22]">
                    {t.gallery.example} {TAG[l.language ?? ""] ?? ""}
                  </span>
                )}
                {l.status !== "ready" && (
                  <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-black/70 px-2 py-0.5 text-[11px] font-semibold">
                    {l.status !== "error" && <Loader2 className="size-3 animate-spin" />}{l.status}
                  </span>
                )}
                {l.format === "portrait" && <Smartphone className="absolute right-2 top-2 size-4 text-white/80" />}
              </div>
              <div className="p-3.5">
                <p className="line-clamp-1 font-semibold">{l.title || "Untitled"}</p>
                <p className="text-xs text-muted">{l.scenes} {t.gallery.scenes}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
