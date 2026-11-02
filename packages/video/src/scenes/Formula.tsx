import katex from "katex";
import React, { useEffect, useMemo, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, spring, useCurrentFrame } from "remotion";
import { FPS, LEAD } from "../timing";
import { alpha, SceneTitle, useLayout, useLesson } from "../ui";
import type { SceneProps } from "./props";

/** LaTeX steps (KaTeX) revealed one by one; the current step is bright, earlier ones step back. */
export const Formula: React.FC<SceneProps> = ({ scene, timing }) => {
  const frame = useCurrentFrame();
  const { theme } = useLesson();
  const { portrait, pad, top, bottom } = useLayout();
  const [handle] = useState(() => delayRender("KaTeX fonts"));
  useEffect(() => {
    // KaTeX fonts only start loading once formulas are in the DOM
    document.fonts.ready.then(() => continueRender(handle));
  }, [handle]);

  const html = useMemo(
    () => scene.latex.map((l) => katex.renderToString(l, { throwOnError: false, displayMode: true, output: "html" })),
    [scene.latex],
  );
  const n = scene.latex.length;
  const times = scene.latex.map((_, i) => LEAD + (timing.voice * i) / Math.max(n, 1));
  const t = frame / FPS;
  let current = 0;
  times.forEach((c, i) => t >= c && (current = i));

  return (
    <AbsoluteFill style={{ padding: pad, paddingTop: top, paddingBottom: bottom, gap: portrait ? 60 : 40 }}>
      <SceneTitle text={scene.title} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: portrait ? 36 : 24 }}>
        {html.map((h, i) => {
          const s = spring({ frame: frame - times[i] * FPS, fps: FPS, config: { damping: 16 } });
          const now = i === current;
          return (
            <div
              key={i}
              style={{
                opacity: s * (now ? 1 : 0.42),
                transform: `translateY(${(1 - s) * 30}px) scale(${now ? 1 : 0.86})`,
                fontSize: portrait ? 64 : 76,
                color: now ? theme.ink : theme.muted,
                padding: "6px 40px",
                borderRadius: 24,
                background: now ? alpha(theme.accent, 0.12) : "transparent",
                border: `2px solid ${now ? alpha(theme.accent, 0.5) : "transparent"}`,
              }}
              dangerouslySetInnerHTML={{ __html: h }}
            />
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
