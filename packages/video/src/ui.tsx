import { loadFont } from "@remotion/google-fonts/Lexend";
import React, { createContext, useContext } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { FPS } from "./timing";
import type { Theme, Word } from "./types";

// Lexend was designed to make reading easier — a good default for students.
export const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700", "800"], subsets: ["latin", "latin-ext"] });

export type Ctx = { theme: Theme; asset: (p: string | null | undefined) => string; captions: boolean; interactive: boolean };
export const LessonCtx = createContext<Ctx | null>(null);
export const useLesson = () => useContext(LessonCtx)!;

/** Layout helpers for both 16:9 and 9:16. */
export function useLayout() {
  const { width, height } = useVideoConfig();
  const portrait = height > width;
  return {
    width,
    height,
    portrait,
    pad: portrait ? 72 : 110,
    top: portrait ? 150 : 120, // below the progress bar and watermark
    bottom: portrait ? 330 : 190, // above the captions
  };
}

export const alpha = (hex: string, a: number) =>
  hex + Math.round(Math.min(1, Math.max(0, a)) * 255).toString(16).padStart(2, "0");

export function useSpring(delaySec = 0, config = { damping: 16, mass: 0.7 }) {
  const frame = useCurrentFrame();
  return spring({ frame: frame - delaySec * FPS, fps: FPS, config });
}

/** Fade + rise in at `delay` seconds. */
export const Reveal: React.FC<{ delay?: number; children: React.ReactNode; style?: React.CSSProperties; rise?: number }> = ({
  delay = 0,
  children,
  style,
  rise = 26,
}) => {
  const s = useSpring(delay);
  return (
    <div style={{ opacity: s, transform: `translateY(${(1 - s) * rise}px)`, ...style }}>{children}</div>
  );
};

/** Headline whose words spring in one after another. */
export const KineticTitle: React.FC<{ text: string; size: number; delay?: number; color?: string; style?: React.CSSProperties }> = ({
  text,
  size,
  delay = 0,
  color,
  style,
}) => {
  const frame = useCurrentFrame();
  const { theme } = useLesson();
  return (
    <div style={{ fontSize: size, fontWeight: 800, lineHeight: 1.08, letterSpacing: -size * 0.02, color: color ?? theme.ink, ...style }}>
      {text.split(" ").map((w, i) => {
        const s = spring({ frame: frame - (delay + i * 0.07) * FPS, fps: FPS, config: { damping: 14, mass: 0.6 } });
        return (
          <span key={i} style={{ display: "inline-block", opacity: s, transform: `translateY(${(1 - s) * 0.45 * size}px)`, marginRight: size * 0.26 }}>
            {w}
          </span>
        );
      })}
    </div>
  );
};

export const SceneTitle: React.FC<{ text: string; delay?: number }> = ({ text, delay = 0 }) => {
  const { theme } = useLesson();
  const { portrait } = useLayout();
  const s = useSpring(delay + 0.15);
  return (
    <div>
      <KineticTitle text={text} size={portrait ? 68 : 66} delay={delay} />
      <div style={{ marginTop: 18, height: 8, width: 120 * s, borderRadius: 8, background: theme.accent }} />
    </div>
  );
};

/** Slow push-in on an illustration so a still never feels still. */
export const KenBurns: React.FC<{ src: string; durationFrames: number; style?: React.CSSProperties; fit?: "cover" | "contain" }> = ({
  src,
  durationFrames,
  style,
  fit = "cover",
}) => {
  const frame = useCurrentFrame();
  const t = interpolate(frame, [0, durationFrames], [0, 1], { extrapolateRight: "clamp" });
  const scale = 1.02 + 0.1 * Easing.inOut(Easing.quad)(t);
  return (
    <div style={{ overflow: "hidden", ...style }}>
      <Img src={src} style={{ width: "100%", height: "100%", objectFit: fit, transform: `scale(${scale}) translate(${-t * 1.2}%, ${-t * 0.8}%)` }} />
    </div>
  );
};

export const Backdrop: React.FC = () => {
  const { theme } = useLesson();
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 90) * 6;
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at ${30 + drift}% ${20 - drift}%, ${alpha(theme.accent, 0.16)}, transparent 55%),
                     radial-gradient(circle at ${80 - drift}% ${85 + drift}%, ${alpha(theme.accent2, 0.1)}, transparent 50%), ${theme.bg}`,
      }}
    />
  );
};

/** Karaoke captions: the spoken word lights up. */
export const Captions: React.FC<{ words: Word[]; offset: number }> = ({ words, offset }) => {
  const frame = useCurrentFrame();
  const { theme } = useLesson();
  const { portrait, width } = useLayout();
  const t = frame / FPS - offset;
  if (!words.length || t < -0.1) return null;

  // Pages of ~7 words, broken early at long pauses
  const pages: Word[][] = [];
  let cur: Word[] = [];
  words.forEach((w, i) => {
    const gap = i > 0 ? w.start - words[i - 1].end : 0;
    if (cur.length >= (portrait ? 5 : 7) || (gap > 0.45 && cur.length)) {
      pages.push(cur);
      cur = [];
    }
    cur.push(w);
  });
  if (cur.length) pages.push(cur);
  const page = pages.find((p, i) => t < (pages[i + 1]?.[0].start ?? Infinity)) ?? pages[pages.length - 1];
  if (t > page[page.length - 1].end + 0.6) return null;

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: portrait ? 210 : 56, pointerEvents: "none" }}>
      <div
        style={{
          maxWidth: width * (portrait ? 0.86 : 0.7),
          textAlign: "center",
          fontSize: portrait ? 54 : 46,
          fontWeight: 700,
          lineHeight: 1.25,
          padding: "14px 28px",
          borderRadius: 22,
          background: alpha("#000000", 0.55),
          color: "#FFFFFF",
        }}
      >
        {page.map((w, i) => {
          const active = t >= w.start && t < w.end + 0.08;
          const said = t >= w.start;
          return (
            <span key={i} style={{ color: active ? theme.accent3 : said ? "#FFFFFF" : alpha("#FFFFFF", 0.6), marginRight: 12 }}>
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

export const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; color?: string }> = ({ children, style, color }) => {
  const { theme } = useLesson();
  return (
    <div
      style={{
        background: theme.surface,
        border: `2px solid ${alpha(color ?? theme.ink, color ? 0.55 : 0.08)}`,
        borderRadius: 28,
        boxShadow: `0 18px 50px ${alpha("#000000", theme.name === "paper" ? 0.08 : 0.3)}`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

/** Placeholder shown while an asset is still being produced. */
export const Pending: React.FC<{ label: string; style?: React.CSSProperties }> = ({ label, style }) => {
  const frame = useCurrentFrame();
  const { theme } = useLesson();
  const x = (frame * 2.2) % 200;
  return (
    <div
      style={{
        borderRadius: 28,
        border: `2px dashed ${alpha(theme.muted, 0.5)}`,
        background: `linear-gradient(100deg, ${alpha(theme.surface, 0.6)} ${x - 40}%, ${alpha(theme.accent, 0.12)} ${x}%, ${alpha(theme.surface, 0.6)} ${x + 40}%)`,
        color: theme.muted,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 32,
        fontWeight: 600,
        textAlign: "center",
        padding: 40,
        ...style,
      }}
    >
      {label}
    </div>
  );
};
