import type { Lesson, Scene, SceneKind, Word } from "./types";

export const FPS = 30;
export const LEAD = 0.35; // quiet before the voice starts, so each scene can land first
export const TAIL = 0.65;
export const THINK = 5; // quiz: seconds students get to think

const MIN_SECONDS: Record<SceneKind, number> = {
  hook: 4, concept: 4, image: 4, diagram: 6, formula: 5, manim: 4, quiz: 4, summary: 5,
};

/** Before the audio exists, guess from the word count so the preview already plays. */
export const estimate = (text: string) => Math.max(1.5, text.trim().split(/\s+/).length / 2.6);

export type SceneTiming = {
  frames: number;
  voice: number; // seconds of main narration
  thinkStart: number; // quiz only (seconds from scene start)
  revealStart: number;
  reveal: number;
};

export function sceneTiming(scene: Scene): SceneTiming {
  const voice = scene.assets.narration?.duration ?? estimate(scene.narration);
  let total = LEAD + voice + TAIL;
  let thinkStart = 0;
  let revealStart = 0;
  let reveal = 0;
  if (scene.kind === "quiz" && scene.quiz) {
    thinkStart = LEAD + voice + 0.3;
    revealStart = thinkStart + THINK;
    reveal = scene.assets.reveal?.duration ?? estimate(scene.quiz.explanation);
    total = revealStart + reveal + 1.2;
  }
  if (scene.kind === "manim" && scene.assets.clip_duration) {
    total = Math.max(total, scene.assets.clip_duration + 0.2);
  }
  total = Math.max(total, MIN_SECONDS[scene.kind]);
  return { frames: Math.ceil(total * FPS), voice, thinkStart, revealStart, reveal };
}

export type TimelineItem = { scene: Scene; from: number; timing: SceneTiming };

export function timeline(lesson: Lesson): { items: TimelineItem[]; total: number } {
  let from = 0;
  const items = lesson.scenes.map((scene) => {
    const timing = sceneTiming(scene);
    const item = { scene, from, timing };
    from += timing.frames;
    return item;
  });
  return { items, total: Math.max(from, FPS) };
}

export const dimensions = (lesson: Lesson) =>
  lesson.format === "portrait" ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^\p{L}\p{N}]/gu, "");

/**
 * When does the voice say each of these phrases? Returns seconds from the audio start.
 * Matches the first significant word of each phrase, in order; falls back to even spacing.
 */
export function cues(phrases: string[], words: Word[] | undefined, duration: number): number[] {
  const n = phrases.length;
  const even = phrases.map((_, i) => (duration * (i + 0.35)) / Math.max(n, 1));
  if (!words?.length) return even;
  const spoken = words.map((w) => norm(w.text));
  let cursor = 0;
  return phrases.map((p, i) => {
    const keys = p.split(/\s+/).map(norm).filter((k) => k.length > 3);
    for (let j = cursor; j < spoken.length; j++) {
      if (keys.some((k) => spoken[j] === k || (k.length > 5 && spoken[j].startsWith(k.slice(0, 5))))) {
        cursor = j + 1;
        return Math.max(0, words[j].start - 0.15);
      }
    }
    return even[i];
  });
}
