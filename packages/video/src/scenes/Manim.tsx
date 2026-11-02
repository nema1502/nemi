import React from "react";
import { AbsoluteFill, Freeze, OffthreadVideo, Sequence } from "remotion";
import { FPS } from "../timing";
import { Pending, SceneTitle, useLayout, useLesson } from "../ui";
import type { SceneProps } from "./props";

/** A clip written by Muse Spark in Manim, checked by the nemaxyz auditors, rendered by the engine. */
export const Manim: React.FC<SceneProps> = ({ scene, frames }) => {
  const { asset } = useLesson();
  const { pad, top, bottom } = useLayout();
  if (!scene.assets.clip) {
    return (
      <AbsoluteFill style={{ padding: pad, paddingTop: top, paddingBottom: bottom, gap: 50 }}>
        <SceneTitle text={scene.title} />
        <Pending label={`Muse Spark is animating this in Manim…\n${scene.manim_brief ?? ""}`} style={{ flex: 1, whiteSpace: "pre-wrap", fontSize: 28 }} />
      </AbsoluteFill>
    );
  }
  const src = asset(scene.assets.clip);
  const clipFrames = Math.max(1, Math.floor((scene.assets.clip_duration ?? frames / FPS) * FPS) - 1);
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={clipFrames} layout="none">
        <OffthreadVideo src={src} muted style={{ width: "100%", height: "100%" }} />
      </Sequence>
      {frames > clipFrames && (
        <Sequence from={clipFrames} layout="none">
          <Freeze frame={clipFrames - 1}>
            <OffthreadVideo src={src} muted style={{ width: "100%", height: "100%" }} />
          </Freeze>
        </Sequence>
      )}
    </AbsoluteFill>
  );
};
