import { getLength } from "@remotion/paths";
import React, { useMemo } from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame } from "remotion";
import { cues, FPS, LEAD } from "../timing";
import type { Region } from "../types";
import { alpha, Pending, SceneTitle, useLayout, useLesson } from "../ui";
import type { SceneProps } from "./props";

/**
 * A Muse Image illustration whose parts, cut out by SAM 3.1, light up one by
 * one exactly when the narration names them. Labels are real text, so they are
 * crisp and spelled right in any language.
 */
export const Diagram: React.FC<SceneProps> = ({ scene, timing, frames }) => {
  const frame = useCurrentFrame();
  const { theme, asset } = useLesson();
  const { portrait, pad, top, bottom, width, height } = useLayout();
  const colors = [theme.accent, theme.accent2, theme.accent3, theme.good, theme.bad];

  const regions = scene.assets.regions.length
    ? scene.assets.regions
    : scene.diagram_parts.map<Region>((p) => ({ label: p.label, note: p.note, found: false, path: "", mask_size: [0, 0], box: [0, 0, 0, 0], confidence: null }));
  const times = cues(regions.map((r) => r.label), scene.assets.narration?.words, timing.voice).map((t) => t + LEAD);
  const t = frame / FPS;
  const lastCue = times[times.length - 1] ?? 0;
  const finale = Math.min(lastCue + 3.2, frames / FPS - 1.2); // everything lit at the end
  let active = -1;
  times.forEach((c, i) => t >= c && (active = i));
  if (t >= finale) active = -1;
  const spotlight = active >= 0 ? spring({ frame: frame - times[active] * FPS, fps: FPS, config: { damping: 20 } }) : 0;
  const spotOff = interpolate(t, [finale, finale + 0.5], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const [W, H] = scene.assets.image_size ?? [1536, 1024];
  // Fit the picture into its area
  const areaW = portrait ? width - pad * 2 : width * 0.6 - pad;
  const areaH = portrait ? height * 0.42 : height - top - bottom;
  const k = Math.min(areaW / W, areaH / H);
  const dispW = W * k;
  const dispH = H * k;

  return (
    <AbsoluteFill style={{ padding: pad, paddingTop: top, paddingBottom: bottom, flexDirection: portrait ? "column" : "row", gap: portrait ? 44 : 64, alignItems: portrait ? "stretch" : "center" }}>
      <div style={{ position: "relative", width: dispW, height: dispH, flex: "none", borderRadius: 28, overflow: "hidden", alignSelf: "center", boxShadow: `0 24px 70px ${alpha("#000000", 0.35)}` }}>
        {scene.assets.image ? (
          <Img src={asset(scene.assets.image)} style={{ width: "100%", height: "100%" }} />
        ) : (
          <Pending label="Muse Image is drawing…" style={{ width: "100%", height: "100%" }} />
        )}
        <svg viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          <defs>
            <mask id={`spot-${scene.id}`}>
              <rect width={W} height={H} fill="white" />
              {active >= 0 && <Shape region={regions[active]} fill="black" />}
            </mask>
          </defs>
          <rect width={W} height={H} fill={alpha("#05040C", 0.62)} opacity={spotlight * spotOff} mask={`url(#spot-${scene.id})`} />
          {regions.map((r, i) => (
            <Part key={i} region={r} color={colors[i % colors.length]} start={times[i]} isActive={i === active} lit={t >= times[i]} scale={k} />
          ))}
        </svg>
        {active >= 0 && <Chip region={regions[active]} color={colors[active % colors.length]} start={times[active]} W={W} H={H} />}
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: portrait ? 24 : 26, minWidth: 0 }}>
        {!portrait && <SceneTitle text={scene.title} />}
        <div style={{ display: "flex", flexDirection: "column", gap: portrait ? 14 : 16, marginTop: portrait ? 0 : 16 }}>
          {regions.map((r, i) => {
            const s = spring({ frame: frame - times[i] * FPS, fps: FPS, config: { damping: 18 } });
            const on = i === active;
            const c = colors[i % colors.length];
            return (
              <div key={i} style={{ opacity: 0.25 + 0.75 * s, transform: `translateX(${(1 - s) * 30}px) scale(${on ? 1.03 : 1})`, transformOrigin: "left center", display: "flex", gap: 20, alignItems: "flex-start", padding: "14px 20px", borderRadius: 20, background: on ? alpha(c, 0.16) : "transparent", borderLeft: `8px solid ${s > 0.5 ? c : alpha(theme.muted, 0.3)}` }}>
                <div>
                  <div style={{ fontSize: portrait ? 42 : 40, fontWeight: 700, color: theme.ink }}>{r.label}</div>
                  <div style={{ fontSize: portrait ? 30 : 28, color: theme.muted, marginTop: 4, lineHeight: 1.25 }}>{r.note}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Shape: React.FC<{ region: Region; fill: string; stroke?: string; strokeWidth?: number; dash?: string; opacity?: number }> = ({ region, ...paint }) => {
  const [l, t, r, b] = region.box;
  if (region.path) {
    const [mw, mh] = region.mask_size;
    return (
      <g transform={`translate(${l} ${t}) scale(${(r - l) / mw} ${(b - t) / mh})`}>
        <path d={region.path} fill={paint.fill} stroke={paint.stroke} strokeWidth={paint.strokeWidth} strokeDasharray={paint.dash} strokeDashoffset={0} opacity={paint.opacity} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </g>
    );
  }
  if (!region.found || r <= l) return null;
  return <rect x={l} y={t} width={r - l} height={b - t} rx={24} fill={paint.fill} stroke={paint.stroke} strokeWidth={paint.strokeWidth} opacity={paint.opacity} vectorEffect="non-scaling-stroke" />;
};

const Part: React.FC<{ region: Region; color: string; start: number; isActive: boolean; lit: boolean; scale: number }> = ({ region, color, start, isActive, lit, scale }) => {
  const frame = useCurrentFrame();
  const length = useMemo(() => {
    if (!region.path) return 0;
    const [l, , r] = region.box;
    try {
      return getLength(region.path) * ((r - l) / region.mask_size[0]) * scale;
    } catch {
      return 0;
    }
  }, [region, scale]);
  if (!lit) return null;
  const s = spring({ frame: frame - start * FPS, fps: FPS, config: { damping: 200 }, durationInFrames: 36 });
  const pulse = isActive ? 0.5 + 0.5 * Math.sin((frame - start * FPS) / 6) : 0;
  const dash = length ? `${length * s} ${length}` : undefined;
  return (
    <g style={{ filter: isActive ? `drop-shadow(0 0 ${10 + pulse * 14}px ${color})` : undefined }}>
      {/* A light tint only: the outline and the glow mark the part, so a yellow sun stays yellow */}
      <Shape region={region} fill={alpha(color, isActive ? 0.12 : 0.08)} opacity={s} />
      <Shape region={region} fill="none" stroke={color} strokeWidth={isActive ? 6 : 3.5} dash={dash} />
    </g>
  );
};

const Chip: React.FC<{ region: Region; color: string; start: number; W: number; H: number }> = ({ region, color, start, W, H }) => {
  const frame = useCurrentFrame();
  const s = spring({ frame: frame - start * FPS - 6, fps: FPS, config: { damping: 13, mass: 0.6 } });
  const [l, t, r, b] = region.box;
  if (r <= l) return null;
  const cx = Math.min(0.85, Math.max(0.15, (l + r) / 2 / W)) * 100;
  const above = t / H > 0.14;
  const cy = (above ? t / H : b / H) * 100;
  return (
    <div style={{ position: "absolute", left: `${cx}%`, top: `${cy}%`, transform: `translate(-50%, ${above ? "-130%" : "30%"}) scale(${s})`, background: color, color: "#0B0B14", fontSize: 34, fontWeight: 800, padding: "10px 22px", borderRadius: 999, whiteSpace: "nowrap", boxShadow: `0 10px 30px ${alpha("#000000", 0.45)}` }}>
      {region.label}
    </div>
  );
};
