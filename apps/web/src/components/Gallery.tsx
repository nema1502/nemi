"use client";

import { Clapperboard, Loader2, Smartphone } from "lucide-react";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, asset, DEMO_CARD, type LessonCard } from "@/lib/engine";

export function Gallery() {
  const [items, setItems] = useState<LessonCard[]>([DEMO_CARD]);
  useEffect(() => {
    api.list().then((list) => setItems([DEMO_CARD, ...list])).catch(() => {});
  }, []);
  return (
    <section className="mt-16">
      <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-muted">Lessons</h2>
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
                {l.id === DEMO_CARD.id && (
                  <span className="absolute left-2 top-2 rounded-full bg-violet px-2 py-0.5 text-[11px] font-bold text-[#120f22]">Example</span>
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
                <p className="text-xs text-muted">{l.scenes} scenes · {new Date(l.created_at * 1000).toLocaleDateString()}</p>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
