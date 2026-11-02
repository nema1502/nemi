"use client";

import { dimensions, FPS, LessonVideo, timeline, type Lesson } from "@nemi/video";
import { Player } from "@remotion/player";
import { useEffect, useMemo, useState } from "react";
import { ENGINE } from "@/lib/engine";

/** The example lesson's diagram scene, playing on a loop: the product, not a picture of it. */
export function HeroPlayer({ src }: { src: string }) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  useEffect(() => {
    fetch(src).then((r) => r.json()).then(setLesson).catch(() => {});
  }, [src]);

  const range = useMemo(() => {
    if (!lesson) return null;
    const { items, total } = timeline(lesson);
    const d = items.find((i) => i.scene.kind === "diagram");
    return { total, inFrame: d ? d.from : 0, outFrame: d ? d.from + d.timing.frames - 1 : total - 1 };
  }, [lesson]);

  const { width, height } = lesson ? dimensions(lesson) : { width: 1920, height: 1080 };
  const cover = lesson?.scenes.find((s) => s.kind === "hook")?.assets.image;
  return (
    <div className="relative mx-auto w-full max-w-[640px] pb-10 pt-6 lg:pb-16">
      {cover && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt="" className="absolute right-0 top-0 w-[72%] rotate-[5deg] rounded-2xl border border-white/10 opacity-80 shadow-2xl shadow-black/50" />
      )}
      <div className="relative mt-16 -rotate-[2.5deg] overflow-hidden rounded-2xl border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,.6),0_0_80px_rgba(167,139,250,.25)]">
        {lesson && range ? (
          <Player
            component={LessonVideo}
            inputProps={{ lesson, assetBase: ENGINE, captions: true }}
            durationInFrames={range.total}
            fps={FPS}
            compositionWidth={width}
            compositionHeight={height}
            inFrame={range.inFrame}
            outFrame={range.outFrame}
            initialFrame={Math.min(range.inFrame + 45, range.outFrame)}
            autoPlay
            loop
            initiallyMuted
            clickToPlay={false}
            style={{ width: "100%", aspectRatio: `${width} / ${height}` }}
            acknowledgeRemotionLicense
          />
        ) : (
          <div className="aspect-video w-full animate-pulse bg-panel-2" />
        )}
      </div>
    </div>
  );
}
