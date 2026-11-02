import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { cues, FPS, LEAD } from "../timing";
import { alpha, Card, KenBurns, KineticTitle, Pending, Reveal, SceneTitle, useLayout, useLesson, useSpring } from "../ui";
import type { SceneProps } from "./props";

export const Hook: React.FC<SceneProps> = ({ scene, frames }) => {
  const { theme, asset } = useLesson();
  const { portrait, pad, bottom } = useLayout();
  return (
    <AbsoluteFill>
      {scene.assets.image ? (
        <KenBurns src={asset(scene.assets.image)} durationFrames={frames} style={{ position: "absolute", inset: 0 }} />
      ) : (
        <Pending label="Muse Image is drawing…" style={{ position: "absolute", inset: 60 }} />
      )}
      <AbsoluteFill
        style={{ background: `linear-gradient(to top, ${theme.bg} 4%, ${alpha(theme.bg, 0.75)} 32%, transparent 62%)` }}
      />
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: pad, paddingBottom: bottom + 10 }}>
        <KineticTitle text={scene.title} size={portrait ? 104 : 112} delay={0.4} style={{ maxWidth: portrait ? "100%" : "75%", textShadow: `0 6px 30px ${alpha("#000000", 0.5)}` }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Points: React.FC<{ points: string[]; times: number[]; size: number; bullet?: "dot" | "check" }> = ({ points, times, size, bullet = "dot" }) => {
  const { theme } = useLesson();
  const colors = [theme.accent, theme.accent2, theme.accent3, theme.good];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: size * 0.55 }}>
      {points.map((p, i) => (
        <Reveal key={i} delay={times[i]} rise={30}>
          <div style={{ display: "flex", alignItems: "center", gap: size * 0.6, fontSize: size, fontWeight: 600, color: theme.ink, lineHeight: 1.2 }}>
            {bullet === "check" ? (
              <Check color={colors[i % colors.length]} size={size * 1.2} delay={times[i] + 0.15} />
            ) : (
              <div style={{ flex: "none", width: size * 0.42, height: size * 0.42, borderRadius: "50%", background: colors[i % colors.length] }} />
            )}
            <span>{p}</span>
          </div>
        </Reveal>
      ))}
    </div>
  );
};

const Check: React.FC<{ color: string; size: number; delay: number }> = ({ color, size, delay }) => {
  const s = useSpring(delay, { damping: 20, mass: 0.6 });
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" style={{ flex: "none" }}>
      <circle cx="24" cy="24" r="22" fill={alpha(color, 0.18)} stroke={color} strokeWidth="3" />
      <path d="M14 25 L21 32 L35 17" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="34" strokeDashoffset={34 * (1 - s)} />
    </svg>
  );
};

const voiceTimes = (scene: SceneProps["scene"], phrases: string[], voice: number) =>
  cues(phrases, scene.assets.narration?.words, voice).map((t) => t + LEAD);

export const Concept: React.FC<SceneProps> = ({ scene, timing }) => {
  const { portrait, pad, top, bottom } = useLayout();
  const times = voiceTimes(scene, scene.points, timing.voice);
  return (
    <AbsoluteFill style={{ padding: pad, paddingTop: top, paddingBottom: bottom, justifyContent: "center", gap: portrait ? 70 : 64 }}>
      <SceneTitle text={scene.title} />
      <Points points={scene.points} times={times} size={portrait ? 50 : 54} />
    </AbsoluteFill>
  );
};

export const ImageScene: React.FC<SceneProps> = ({ scene, timing, frames }) => {
  const { asset } = useLesson();
  const { portrait, pad, top, bottom } = useLayout();
  const s = useSpring(0);
  const times = voiceTimes(scene, scene.points, timing.voice);
  const picture = scene.assets.image ? (
    <KenBurns src={asset(scene.assets.image)} durationFrames={frames} style={{ width: "100%", height: "100%", borderRadius: 32 }} />
  ) : (
    <Pending label="Muse Image is drawing…" style={{ width: "100%", height: "100%" }} />
  );
  return (
    <AbsoluteFill style={{ padding: pad, paddingTop: top, paddingBottom: bottom, flexDirection: portrait ? "column" : "row", gap: portrait ? 56 : 80, alignItems: "center" }}>
      <div style={{ flex: portrait ? "none" : "0 0 56%", width: portrait ? "100%" : undefined, aspectRatio: portrait ? "1 / 1" : "3 / 2", opacity: s, transform: `scale(${0.94 + 0.06 * s})` }}>
        {picture}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 48 }}>
        <SceneTitle text={scene.title} delay={0.2} />
        <Points points={scene.points} times={times} size={portrait ? 46 : 44} />
      </div>
    </AbsoluteFill>
  );
};

export const Summary: React.FC<SceneProps> = ({ scene, timing }) => {
  const { theme } = useLesson();
  const { portrait, pad, top, bottom } = useLayout();
  const frame = useCurrentFrame();
  const times = voiceTimes(scene, scene.points, timing.voice);
  // The closing open question is the last thing the voice asks
  const questions = scene.narration.match(/[¿]?[^.!?¿]+\?/g) ?? [];
  const question = questions[questions.length - 1]?.trim();
  const qTime = question ? voiceTimes(scene, [question], timing.voice)[0] : 0;
  const glow = interpolate(Math.sin(frame / 12), [-1, 1], [0.35, 0.7]);
  return (
    <AbsoluteFill style={{ padding: pad, paddingTop: top, paddingBottom: bottom, justifyContent: "center", gap: portrait ? 60 : 50 }}>
      <SceneTitle text={scene.title} />
      <Points points={scene.points} times={times} size={portrait ? 48 : 48} bullet="check" />
      {question && (
        <Reveal delay={Math.max(qTime, times[times.length - 1] + 0.6)}>
          <Card color={theme.accent} style={{ display: "flex", alignItems: "center", gap: 28, padding: "30px 40px", fontSize: portrait ? 46 : 44, fontWeight: 700, color: theme.ink, boxShadow: `0 0 60px ${alpha(theme.accent, glow * 0.5)}`, maxWidth: portrait ? "100%" : "80%" }}>
            <svg width="64" height="64" viewBox="0 0 48 48" style={{ flex: "none" }}>
              <path d="M8 10h32a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H22l-9 8v-8H8a4 4 0 0 1-4-4V14a4 4 0 0 1 4-4z" fill={alpha(theme.accent, 0.25)} stroke={theme.accent} strokeWidth="3" strokeLinejoin="round" />
              <circle cx="16" cy="22" r="2.6" fill={theme.accent} /><circle cx="24" cy="22" r="2.6" fill={theme.accent} /><circle cx="32" cy="22" r="2.6" fill={theme.accent} />
            </svg>
            <span>{question}</span>
          </Card>
        </Reveal>
      )}
    </AbsoluteFill>
  );
};

export const sceneSeconds = (frames: number) => frames / FPS;
