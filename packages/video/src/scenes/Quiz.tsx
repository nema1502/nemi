import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame } from "remotion";
import { FPS, LEAD, THINK } from "../timing";
import { alpha, Card, KineticTitle, Reveal, useLayout, useLesson } from "../ui";
import type { SceneProps } from "./props";

const LETTERS = "ABCD";

/**
 * Question -> think (countdown) -> reveal. In student mode the web player pauses at
 * `thinkStart` and lets each student answer before the reveal plays.
 */
export const Quiz: React.FC<SceneProps> = ({ scene, timing }) => {
  const frame = useCurrentFrame();
  const { theme, interactive } = useLesson();
  const { portrait, pad, top, bottom } = useLayout();
  const quiz = scene.quiz!;
  const t = frame / FPS;
  const revealed = t >= timing.revealStart;
  const r = spring({ frame: frame - timing.revealStart * FPS, fps: FPS, config: { damping: 14 } });

  return (
    <AbsoluteFill style={{ padding: pad, paddingTop: top, paddingBottom: bottom, gap: portrait ? 56 : 44, justifyContent: "center" }}>
      <KineticTitle text={quiz.question} size={portrait ? 64 : 66} delay={0.2} />
      <div style={{ display: "grid", gridTemplateColumns: portrait ? "1fr" : "1fr 1fr", gap: portrait ? 24 : 28 }}>
        {quiz.options.map((o, i) => {
          const right = i === quiz.answer_index;
          const color = revealed ? (right ? theme.good : theme.muted) : [theme.accent, theme.accent2, theme.accent3, theme.bad][i];
          return (
            <Reveal key={i} delay={LEAD + 0.5 + i * 0.25}>
              <Card
                color={color}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 26,
                  padding: "26px 32px",
                  opacity: revealed && !right ? 1 - 0.55 * r : 1,
                  transform: `scale(${revealed && right ? 1 + 0.05 * r : 1})`,
                  background: revealed && right ? alpha(theme.good, 0.18) : theme.surface,
                }}
              >
                <div style={{ flex: "none", width: 72, height: 72, borderRadius: 20, background: color, color: "#0B0B14", fontSize: 40, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {revealed && right ? "✓" : LETTERS[i]}
                </div>
                <div style={{ fontSize: portrait ? 44 : 42, fontWeight: 650, color: theme.ink }}>{o}</div>
              </Card>
            </Reveal>
          );
        })}
      </div>
      {!revealed && !interactive && t >= timing.thinkStart && <Countdown start={timing.thinkStart} />}
      {revealed && (
        <div style={{ opacity: r, transform: `translateY(${(1 - r) * 20}px)`, fontSize: portrait ? 42 : 40, color: theme.ink, fontWeight: 600, lineHeight: 1.3, borderLeft: `8px solid ${theme.good}`, paddingLeft: 28 }}>
          {quiz.explanation}
        </div>
      )}
    </AbsoluteFill>
  );
};

const Countdown: React.FC<{ start: number }> = ({ start }) => {
  const frame = useCurrentFrame();
  const { theme } = useLesson();
  const t = frame / FPS - start;
  const left = Math.max(1, Math.ceil(THINK - t));
  const p = interpolate(t, [0, THINK], [0, 1], { extrapolateRight: "clamp" });
  const C = 2 * Math.PI * 54;
  return (
    <div style={{ position: "absolute", right: 90, top: 120 }}>
      <svg width="150" height="150" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill={alpha(theme.surface, 0.9)} stroke={alpha(theme.muted, 0.3)} strokeWidth="8" />
        <circle cx="60" cy="60" r="54" fill="none" stroke={theme.accent3} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * p} transform="rotate(-90 60 60)" />
        <text x="60" y="76" textAnchor="middle" fontSize="48" fontWeight="800" fill={theme.ink}>{left}</text>
      </svg>
    </div>
  );
};
