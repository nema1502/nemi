"use client";

import type { Lesson, Quiz, Scene, Theme } from "@nemi/video";
import { useCallback, useEffect, useRef, useState } from "react";

export const ENGINE = (process.env.NEXT_PUBLIC_ENGINE_URL ?? "http://localhost:8000").replace(/\/$/, "");

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${ENGINE}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `Engine error ${res.status}`);
  }
  return res.json();
}

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export type Options = { voices: Record<string, string[]>; themes: Record<string, Theme> };
export type LessonCard = {
  id: string;
  title: string;
  status: Lesson["status"];
  created_at: number;
  format: Lesson["format"];
  theme: string;
  scenes: number;
  cover: string | null;
};

export type ScenePatch = Partial<Pick<Scene, "title" | "narration" | "points" | "image_prompt" | "latex" | "manim_brief" | "diagram_parts">> & {
  quiz?: Quiz;
};

export const api = {
  options: () => call<Options>("/api/options"),
  list: () => call<LessonCard[]>("/api/lessons"),
  get: (id: string) => call<Lesson>(`/api/lessons/${id}`),
  create: (form: FormData) => call<Lesson>("/api/lessons", { method: "POST", body: form }),
  patch: (id: string, body: { title?: string; theme?: string; format?: string; voice?: string; scene_order?: string[] }) =>
    call<Lesson>(`/api/lessons/${id}`, json("PATCH", body)),
  patchScene: (id: string, sid: string, body: ScenePatch) => call<Lesson>(`/api/lessons/${id}/scenes/${sid}`, json("PATCH", body)),
  redraw: (id: string, sid: string) => call(`/api/lessons/${id}/scenes/${sid}/redraw`, { method: "POST" }),
  animate: (id: string, sid: string) => call(`/api/lessons/${id}/scenes/${sid}/animate`, { method: "POST" }),
  voice: (id: string, sid: string, audio: Blob) => {
    const form = new FormData();
    form.append("audio", audio, "voice.webm");
    return call<Lesson>(`/api/lessons/${id}/scenes/${sid}/voice`, { method: "POST", body: form });
  },
  render: (id: string) => call<Lesson>(`/api/lessons/${id}/render`, { method: "POST" }),
  remove: (id: string) => call(`/api/lessons/${id}`, { method: "DELETE" }),
};

export const asset = (p: string | null | undefined) => (!p ? "" : p.startsWith("/") ? p : `${ENGINE}/${p}`);

/** A finished lesson shipped with the site, so the product can be seen even with the engine offline. */
export const DEMO_ID = "demo";
export const DEMO_CARD: LessonCard = {
  id: DEMO_ID,
  title: "Por qué una montaña explota",
  status: "ready",
  created_at: 1793579299,
  format: "landscape",
  theme: "night",
  scenes: 6,
  cover: "/demo/s1-1ca3-68038d91.jpg",
};

/** Polls the lesson while the agent is working; slows down once everything is produced. */
export function useLessonLive(id: string | undefined) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const last = useRef("");

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const l: Lesson = id === DEMO_ID ? await (await fetch("/demo/lesson.json")).json() : await api.get(id);
      const sig = JSON.stringify(l);
      if (sig !== last.current) {
        last.current = sig;
        setLesson(l);
      }
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [id]);

  useEffect(() => {
    refresh();
    let timer: ReturnType<typeof setTimeout>;
    const tick = async () => {
      await refresh();
      timer = setTimeout(tick, busy(JSON.parse(last.current || "null")) ? 1500 : 5000);
    };
    if (id !== DEMO_ID) timer = setTimeout(tick, 1500);
    return () => clearTimeout(timer);
  }, [refresh, id]);

  return { lesson, setLesson, error, refresh };
}

export function busy(l: Lesson | null) {
  if (!l) return true;
  if (l.status !== "ready" && l.status !== "error") return true;
  return l.scenes.some(
    (s) =>
      !s.assets.narration ||
      (["hook", "image", "diagram"].includes(s.kind) && !s.assets.image) ||
      (s.kind === "manim" && !s.assets.clip),
  );
}
