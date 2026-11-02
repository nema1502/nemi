import React from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { alpha, fontFamily } from "../ui";

// Mirrors engine/nemi/events.py
export type EventKit = {
  id: string;
  status: "queued" | "designing" | "drawing" | "ready" | "exporting" | "error";
  name: string;
  date: string;
  place: string;
  description: string;
  community: string;
  language: string;
  logos: string[];
  spec: {
    tagline: string;
    palette: { bg: string; primary: string; secondary: string; accent: string; ink: string };
    art_direction: string;
    key_visual_prompt: string;
    subject: string;
    copies: { instagram: string; x: string; linkedin: string; whatsapp: string; luma: string };
    grid_captions: string[];
    story_lines: string[];
  } | null;
  key_visual: string | null;
  key_visual_size: [number, number] | null;
  cutout: string | null;
  cutout_box: [number, number, number, number] | null;
  download: string | null;
  events: { t: number; step: string; message: string; level: string }[];
  error: string | null;
};

export type EventProps = { kit: EventKit; assetBase: string; line?: number };

const FALLBACK = { bg: "#16122E", primary: "#7E6BFF", secondary: "#FFB020", accent: "#FFD93D", ink: "#FFFFFF" };

function useKit({ kit, assetBase }: EventProps) {
  const base = assetBase.replace(/\/$/, "");
  const asset = (p: string | null | undefined) => (!p ? "" : /^(https?:|data:|blob:|\/)/.test(p) ? p : `${base}/${p}`);
  return { p: kit.spec?.palette ?? FALLBACK, asset, spec: kit.spec };
}

const Logos: React.FC<{ kit: EventKit; asset: (p: string) => string; height: number; style?: React.CSSProperties }> = ({ kit, asset, height, style }) => (
  <div style={{ display: "flex", alignItems: "center", gap: height * 0.4, ...style }}>
    {kit.logos.map((l) => (
      <Img key={l} src={asset(l)} style={{ height, width: "auto", objectFit: "contain", filter: "drop-shadow(0 4px 18px rgba(0,0,0,.45))" }} />
    ))}
  </div>
);

const Visual: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) =>
  src ? <Img src={src} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", ...style }} /> : null;

/** One big picture, 3240x4320, cut into the 9 posts of an Instagram profile grid. */
export const EventGrid: React.FC<EventProps> = (props) => {
  const { kit } = props;
  const { p, asset, spec } = useKit(props);
  return (
    <AbsoluteFill style={{ background: p.bg, fontFamily, color: p.ink }}>
      <Visual src={asset(kit.key_visual)} />
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${alpha(p.bg, 0.85)} 0%, transparent 30%, transparent 70%, ${alpha(p.bg, 0.92)} 100%)` }} />
      <div style={{ position: "absolute", top: 230, left: 0, right: 0, textAlign: "center", padding: "0 200px" }}>
        <div style={{ fontSize: 300, fontWeight: 800, lineHeight: 0.95, letterSpacing: -8, textShadow: `0 12px 60px ${alpha("#000000", 0.5)}` }}>{kit.name}</div>
        {spec && <div style={{ marginTop: 60, fontSize: 120, fontWeight: 600, color: p.accent }}>{spec.tagline}</div>}
      </div>
      <div style={{ position: "absolute", bottom: 230, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontSize: 130, fontWeight: 700 }}>{kit.date}</div>
        <div style={{ marginTop: 30, fontSize: 90, color: alpha(p.ink, 0.85) }}>{kit.place}</div>
        <Logos kit={kit} asset={asset} height={170} style={{ justifyContent: "center", marginTop: 90 }} />
      </div>
    </AbsoluteFill>
  );
};

/** Square cover for the Luma event page. */
export const EventCover: React.FC<EventProps> = (props) => {
  const { kit } = props;
  const { p, asset, spec } = useKit(props);
  return (
    <AbsoluteFill style={{ background: p.bg, fontFamily, color: p.ink }}>
      <Visual src={asset(kit.key_visual)} style={{ objectPosition: "center 70%" }} />
      <AbsoluteFill style={{ background: `linear-gradient(to top, ${p.bg} 5%, ${alpha(p.bg, 0.7)} 38%, transparent 65%)` }} />
      <Logos kit={kit} asset={asset} height={70} style={{ position: "absolute", top: 60, left: 64 }} />
      <div style={{ position: "absolute", left: 64, right: 64, bottom: 64 }}>
        <div style={{ fontSize: 104, fontWeight: 800, lineHeight: 1, letterSpacing: -2 }}>{kit.name}</div>
        {spec && <div style={{ marginTop: 18, fontSize: 42, fontWeight: 600, color: p.accent }}>{spec.tagline}</div>}
        <div style={{ marginTop: 26, fontSize: 36, fontWeight: 600 }}>{kit.date}</div>
        <div style={{ marginTop: 6, fontSize: 32, color: alpha(p.ink, 0.8) }}>{kit.place}</div>
      </div>
    </AbsoluteFill>
  );
};

/** Profile picture: the character SAM 3.1 cut out, on the brand colors, framed for a round crop. */
export const EventAvatar: React.FC<EventProps> = (props) => {
  const { kit } = props;
  const { p, asset } = useKit(props);
  return (
    <AbsoluteFill style={{ background: p.bg }}>
      <div style={{ position: "absolute", inset: 40, borderRadius: "50%", overflow: "hidden", background: `radial-gradient(circle at 50% 35%, ${p.primary}, ${p.bg} 80%)`, border: `16px solid ${p.accent}` }}>
        {kit.cutout ? (
          <Img src={asset(kit.cutout)} style={{ position: "absolute", left: "-30%", width: "160%", bottom: "-22%", height: "112%", objectFit: "contain", objectPosition: "center bottom", filter: `drop-shadow(0 20px 50px ${alpha("#000000", 0.5)})` }} />
        ) : (
          <Visual src={asset(kit.key_visual)} style={{ objectPosition: "center 65%" }} />
        )}
      </div>
    </AbsoluteFill>
  );
};

/** Instagram story, reel or WhatsApp status: 8 seconds, the character pops out of the picture. */
export const EventStory: React.FC<EventProps> = (props) => {
  const { kit, line = 1 } = props;
  const { p, asset, spec } = useKit(props);
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const at = (s: number) => spring({ frame: frame - s * fps, fps, config: { damping: 14, mass: 0.7 } });
  const zoom = interpolate(frame, [0, durationInFrames], [1.05, 1.18]);
  const pulse = 1 + 0.04 * Math.sin(frame / 6);
  const box = kit.cutout_box;
  // Where the picture lands when it covers the 9:16 frame, so the cutout sits exactly on its own spot
  const [iw, ih] = kit.key_visual_size ?? [3, 4];
  const k = Math.max(width / iw, height / ih);
  const dw = iw * k;
  const dh = ih * k;
  const ox = (width - dw) / 2;
  const oy = (height - dh) / 2;
  // A big subject would sit behind the event name: lower the picture until its top clears the title
  const lift = box ? Math.max(0, height * 0.38 - (oy + box[1] * dh)) : 0;
  const pop = at(0.6);
  return (
    <AbsoluteFill style={{ background: p.bg, fontFamily, color: p.ink, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          transform: `translateY(${lift}px) scale(${zoom})`,
          maskImage: lift ? "linear-gradient(to bottom, transparent 0%, #000 16%)" : undefined,
        }}
      >
        <Visual src={asset(kit.key_visual)} style={{ filter: kit.cutout ? `blur(${4 * pop}px) brightness(${1 - 0.35 * pop})` : undefined }} />
        {kit.cutout && box && (
          <Img
            src={asset(kit.cutout)}
            style={{
              position: "absolute",
              left: ox + box[0] * dw,
              top: oy + box[1] * dh,
              width: (box[2] - box[0]) * dw,
              height: (box[3] - box[1]) * dh,
              transform: `translateY(${4 * pop}%) scale(${1 + 0.06 * pop})`,
              transformOrigin: "50% 100%",
              filter: `drop-shadow(0 30px 60px ${alpha("#000000", 0.6 * pop)}) drop-shadow(0 0 40px ${alpha(p.primary, 0.6 * pop)})`,
            }}
          />
        )}
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, ${alpha(p.bg, 0.9)} 0%, transparent 28%, transparent 66%, ${alpha(p.bg, 0.95)} 90%)` }} />
      <div style={{ position: "absolute", top: 170, left: 80, right: 80, textAlign: "center", opacity: at(0.1), transform: `translateY(${(1 - at(0.1)) * 40}px)` }}>
        <div style={{ fontSize: 120, fontWeight: 800, lineHeight: 0.98, letterSpacing: -3 }}>{kit.name}</div>
        {spec && <div style={{ marginTop: 24, fontSize: 50, fontWeight: 600, color: p.accent, textShadow: `0 4px 24px ${p.bg}, 0 0 12px ${p.bg}` }}>{spec.tagline}</div>}
      </div>
      {/* Date, place and call to action stack from the bottom, so a call to action on two lines never covers the place */}
      <div style={{ position: "absolute", bottom: 190, left: 70, right: 70, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ opacity: at(2.4), transform: `translateY(${(1 - at(2.4)) * 40}px)` }}>
          <div style={{ fontSize: 58, fontWeight: 700 }}>{kit.date}</div>
          <div style={{ marginTop: 10, fontSize: 44, color: alpha(p.ink, 0.85) }}>{kit.place}</div>
        </div>
        {spec?.story_lines[line] && (
          <div style={{ marginTop: 40, opacity: at(3.4), transform: `scale(${at(3.4) * pulse})`, maxWidth: 900, background: p.accent, color: p.bg, fontSize: 46, fontWeight: 800, lineHeight: 1.15, padding: "22px 46px", borderRadius: 48 }}>
            {spec.story_lines[line]}
          </div>
        )}
      </div>
      <Logos kit={kit} asset={asset} height={86} style={{ position: "absolute", bottom: 70, left: 0, right: 0, justifyContent: "center", opacity: at(1.2) }} />
    </AbsoluteFill>
  );
};

export const EVENT_FORMATS = {
  EventGrid: { width: 3240, height: 4320, frames: 1 },
  EventCover: { width: 1080, height: 1080, frames: 1 },
  EventAvatar: { width: 1080, height: 1080, frames: 1 },
  EventStory: { width: 1080, height: 1920, frames: 240 },
} as const;
