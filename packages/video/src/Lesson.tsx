import React, { useCallback, useMemo } from "react";
import { AbsoluteFill, Audio, interpolate, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Diagram } from "./scenes/Diagram";
import { Formula } from "./scenes/Formula";
import { Manim } from "./scenes/Manim";
import { Quiz } from "./scenes/Quiz";
import { Concept, Hook, ImageScene, Summary } from "./scenes/basic";
import type { SceneProps } from "./scenes/props";
import { FPS, LEAD, timeline, type TimelineItem } from "./timing";
import type { Act, LessonProps, Theme } from "./types";
import { alpha, Backdrop, Captions, fontFamily, LessonCtx, useLesson } from "./ui";

const VIEWS: Record<string, React.FC<SceneProps>> = {
  hook: Hook, concept: Concept, image: ImageScene, diagram: Diagram,
  formula: Formula, manim: Manim, quiz: Quiz, summary: Summary,
};

export const actColor = (act: Act, t: Theme) =>
  ({ anchor: t.accent2, crack: t.bad, key: t.accent, proof: t.accent3, thread: t.good })[act];

export const LessonVideo: React.FC<LessonProps> = ({ lesson, assetBase, captions = true, interactive = false }) => {
  const { items } = useMemo(() => timeline(lesson), [lesson]);
  const base = assetBase.replace(/\/$/, "");
  const asset = useCallback((p: string | null | undefined) => (!p ? "" : /^(https?:|data:|blob:)/.test(p) ? p : `${base}/${p}`), [base]);
  const ctx = useMemo(() => ({ theme: lesson.theme, asset, captions, interactive }), [lesson.theme, asset, captions, interactive]);

  return (
    <LessonCtx.Provider value={ctx}>
      <AbsoluteFill style={{ fontFamily, color: lesson.theme.ink }}>
        <Backdrop />
        {items.map((item) => (
          <Sequence key={item.scene.id} from={item.from} durationInFrames={item.timing.frames} premountFor={FPS}>
            <SceneView {...item} />
          </Sequence>
        ))}
        <Chrome items={items} />
      </AbsoluteFill>
    </LessonCtx.Provider>
  );
};

const SceneView: React.FC<TimelineItem> = ({ scene, timing }) => {
  const frame = useCurrentFrame();
  const { asset, captions } = useLesson();
  const View = VIEWS[scene.kind] ?? Concept;
  const fade = interpolate(frame, [0, 8, timing.frames - 6, timing.frames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const narr = scene.assets.narration;
  const reveal = scene.assets.reveal;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: fade }}>
        <View scene={scene} timing={timing} frames={timing.frames} />
      </AbsoluteFill>
      {narr?.audio && (
        <Sequence from={Math.round(LEAD * FPS)} layout="none">
          <Audio src={asset(narr.audio)} />
        </Sequence>
      )}
      {reveal?.audio && (
        <Sequence from={Math.round(timing.revealStart * FPS)} layout="none">
          <Audio src={asset(reveal.audio)} />
        </Sequence>
      )}
      {captions && narr && <Captions words={narr.words} offset={LEAD} />}
      {captions && reveal && <Captions words={reveal.words} offset={timing.revealStart} />}
    </AbsoluteFill>
  );
};

/** Progress bar split by scene (colored by act) and the Nemi watermark. */
const Chrome: React.FC<{ items: TimelineItem[] }> = ({ items }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, width, height } = useVideoConfig();
  const { theme } = useLesson();
  const portrait = height > width;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: portrait ? 60 : 34, left: portrait ? 60 : 110, right: portrait ? 60 : 110, display: "flex", gap: 8 }}>
        {items.map(({ scene, from, timing }) => {
          const p = interpolate(frame, [from, from + timing.frames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={scene.id} style={{ flex: timing.frames / durationInFrames, height: 8, borderRadius: 8, background: alpha(theme.muted, 0.22), overflow: "hidden" }}>
              <div style={{ width: `${p * 100}%`, height: "100%", background: actColor(scene.act, theme) }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: portrait ? 92 : 62, left: portrait ? 60 : 110, display: "flex", alignItems: "center", gap: 10, opacity: 0.75 }}>
        <svg width="34" height="22" viewBox="0 0 34 22">
          <path d="M2 18 H8 V4 L26 18 V4 H32" fill="none" stroke={theme.accent} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span style={{ fontSize: 26, fontWeight: 700, letterSpacing: 0.5, color: theme.ink }}>nemi</span>
      </div>
    </AbsoluteFill>
  );
};
