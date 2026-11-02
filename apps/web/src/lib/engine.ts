"use client";

import type { EventKit, Lesson, Quiz, Scene, Theme } from "@nemi/video";
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
  watch: (id: string) => call(`/api/lessons/${id}/watch`, { method: "POST" }),
  improve: (id: string) => call(`/api/lessons/${id}/improve`, { method: "POST" }),
  answer: (id: string, body: { student: string; scene_id: string; picked: number }) =>
    call<{ correct: boolean }>(`/api/lessons/${id}/answers`, json("POST", body)),
  reteach: (id: string) => call(`/api/lessons/${id}/reteach`, { method: "POST" }),
  remove: (id: string) => call(`/api/lessons/${id}`, { method: "DELETE" }),
  createEvent: (form: FormData) => call<EventKit>("/api/events", { method: "POST", body: form }),
  getEvent: (id: string) => call<EventKit>(`/api/events/${id}`),
  exportEvent: (id: string) => call(`/api/events/${id}/export`, { method: "POST" }),
};

export const asset = (p: string | null | undefined) => (!p ? "" : p.startsWith("/") ? p : `${ENGINE}/${p}`);

/** A finished lesson shipped with the site, so the product can be seen even with the engine offline. */
export const isDemo = (id: string) => id === "demo" || id.startsWith("demo-");


/** Polls the lesson while the agent is working; slows down once everything is produced. */
export function useLessonLive(id: string | undefined) {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const last = useRef("");

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const l: Lesson = isDemo(id) ? await (await fetch(`/${id}/lesson.json`)).json() : await api.get(id);
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
    if (id && !isDemo(id)) timer = setTimeout(tick, 1500);
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

/** Polls an event kit while Nemi designs or renders it. */
export function useKitLive(id: string | undefined) {
  const [kit, setKit] = useState<EventKit | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    let timer: ReturnType<typeof setTimeout>;
    let alive = true;
    const tick = async () => {
      try {
        const k = await api.getEvent(id);
        if (!alive) return;
        setKit(k);
        setError(null);
        timer = setTimeout(tick, k.status === "ready" || k.status === "error" ? 6000 : 1500);
      } catch (e) {
        setError((e as Error).message);
        timer = setTimeout(tick, 4000);
      }
    };
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [id]);
  return { kit, error };
}
