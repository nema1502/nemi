import { describe, expect, it } from "vitest";
import sample from "./sample.json";
import { cues, estimate, FPS, LEAD, sceneTiming, THINK, timeline } from "./timing";
import type { Lesson, Scene, Word } from "./types";

const lesson = sample as unknown as Lesson;
const byKind = (k: Scene["kind"]) => lesson.scenes.find((s) => s.kind === k)!;

describe("sceneTiming", () => {
  it("estimates a duration before the audio exists", () => {
    const s = byKind("concept");
    const t = sceneTiming(s);
    expect(t.voice).toBeCloseTo(estimate(s.narration));
    expect(t.frames).toBe(Math.ceil((LEAD + t.voice + 0.65) * FPS));
  });

  it("gives students time to think before a quiz reveal", () => {
    const t = sceneTiming(byKind("quiz"));
    expect(t.revealStart - t.thinkStart).toBeCloseTo(THINK);
    expect(t.frames / FPS).toBeGreaterThan(t.revealStart + t.reveal);
  });

  it("uses the real narration length once it exists", () => {
    const s = structuredClone(byKind("concept"));
    s.assets.narration = { audio: "a.mp3", duration: 12, words: [], voice: "v", source: "tts", text: s.narration };
    expect(sceneTiming(s).voice).toBe(12);
  });

  it("never cuts a Manim clip short", () => {
    const s = structuredClone(byKind("concept"));
    s.kind = "manim";
    s.assets.clip_duration = 20;
    expect(sceneTiming(s).frames / FPS).toBeGreaterThanOrEqual(20);
  });
});

describe("timeline", () => {
  it("lays scenes end to end", () => {
    const { items, total } = timeline(lesson);
    items.slice(1).forEach((it, i) => expect(it.from).toBe(items[i].from + items[i].timing.frames));
    expect(total).toBe(items.at(-1)!.from + items.at(-1)!.timing.frames);
  });
});

describe("cues", () => {
  const words: Word[] = ["Abajo", "está", "la", "Cámara", "de", "magma", "y", "sube", "por", "la", "Chimenea"].map(
    (text, i) => ({ text, start: i, end: i + 0.8 }),
  );

  it("lights each diagram part when the voice names it", () => {
    const [camara, chimenea] = cues(["Cámara de magma", "Chimenea"], words, 11);
    expect(camara).toBeCloseTo(3 - 0.15);
    expect(chimenea).toBeCloseTo(10 - 0.15);
  });

  it("ignores accents and case", () => {
    const [t] = cues(["camara"], words, 11);
    expect(t).toBeCloseTo(3 - 0.15);
  });

  it("falls back to even spacing without word timings", () => {
    const t = cues(["a", "b"], undefined, 10);
    expect(t[0]).toBeLessThan(t[1]);
  });
});
