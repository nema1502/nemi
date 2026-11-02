// Mirrors engine/nemi/schema.py. Keep both in sync.

export type SceneKind = "hook" | "concept" | "image" | "diagram" | "formula" | "manim" | "quiz" | "summary";
export type Act = "anchor" | "crack" | "key" | "proof" | "thread";

export type Word = { text: string; start: number; end: number };

export type Narration = {
  audio: string;
  duration: number;
  words: Word[];
  voice: string;
  source: "tts" | "teacher";
  text: string;
};

export type Region = {
  label: string;
  note: string;
  found: boolean;
  path: string;
  mask_size: [number, number];
  box: [number, number, number, number];
  confidence: number | null;
};

export type Quiz = { question: string; options: string[]; answer_index: number; explanation: string };
export type DiagramPart = { label: string; sam_prompt: string; note: string };

export type ManimAttempt = { attempt: number; errors: string[]; warnings: string[] };

export type SceneAssets = {
  image: string | null;
  image_size: [number, number] | null;
  narration: Narration | null;
  reveal: Narration | null;
  regions: Region[];
  clip: string | null;
  clip_duration: number | null;
  manim_attempts: ManimAttempt[];
};

export type Scene = {
  id: string;
  kind: SceneKind;
  act: Act;
  title: string;
  narration: string;
  points: string[];
  image_prompt: string | null;
  latex: string[];
  quiz: Quiz | null;
  diagram_parts: DiagramPart[];
  manim_brief: string | null;
  assets: SceneAssets;
};

export type Theme = {
  name: string;
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  accent: string;
  accent2: string;
  accent3: string;
  good: string;
  bad: string;
};

export type Check = { question: string; verdict: "yes" | "no" | "doubtful"; reason: string; fix: string };

export type LessonEvent = { t: number; step: string; message: string; level: "info" | "ok" | "warn" | "error" };

export type Lesson = {
  id: string;
  created_at: number;
  status: "queued" | "reading" | "planning" | "reviewing" | "producing" | "ready" | "rendering" | "error";
  topic: string;
  source_name: string | null;
  audience: string;
  language: string;
  format: "landscape" | "portrait";
  voice: string;
  theme: Theme;
  title: string;
  subtitle: string;
  objectives: string[];
  key_terms: string[];
  art_direction: string;
  scenes: Scene[];
  review: { checks: Check[]; fact_issues: string[] } | null;
  events: LessonEvent[];
  video: string | null;
  render_progress: number | null;
  error: string | null;
};

export type LessonProps = {
  lesson: Lesson;
  /** Base URL the lesson's relative asset paths resolve against (the engine). */
  assetBase: string;
  captions?: boolean;
  /** Student mode: the web player pauses at each quiz and asks for an answer. */
  interactive?: boolean;
};
