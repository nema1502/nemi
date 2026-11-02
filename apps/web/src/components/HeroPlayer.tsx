"use client";

import { dimensions, FPS, LessonVideo, timeline, type Lesson } from "@nemi/video";
import { Player } from "@remotion/player";
import { useEffect, useMemo, useState } from "react";
import { ENGINE } from "@/lib/engine";

/** The example lesson's diagram scene, playing on a loop: the product, not a picture of it. */
export function HeroPlayer() {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  useEffect(() => {
    fetch("/demo/lesson.json").then((r) => r.json()).then(setLesson).catch(() => {});
  }, []);

  const range = useMemo(() => {
    if (!lesson) return null;
    const { items, total } = timeline(lesson);
    const d = items.find((i) => i.scene.kind === "diagram");
    return { total, inFrame: d ? d.from : 0, outFrame: d ? d.from + d.timing.frames - 1 : total - 1 };
  }, [lesson]);

  if (!lesson || !range) return <div className="aspect-video w-full animate-pulse rounded-2xl bg-panel-2" />;
  const { width, height } = dimensions(lesson);
  return (
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
  );
}
