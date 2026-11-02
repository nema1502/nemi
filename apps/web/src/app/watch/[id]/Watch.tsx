"use client";

import { FPS } from "@nemi/video";
import type { PlayerRef } from "@remotion/player";
import { CircleHelp, Loader2, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LessonPlayer } from "@/components/LessonPlayer";
import { Logo } from "@/components/Logo";
import { api, isDemo, useLessonLive } from "@/lib/engine";
import { studentCopy } from "@/lib/studioCopy";

/** What students open from the teacher's link: the lesson, pausing at every quiz for their answer. */
export function Watch() {
  const { id } = useParams<{ id: string }>();
  const { lesson, error } = useLessonLive(id);
  const [score, setScore] = useState<{ right: number; total: number } | null>(null);
  const player = useRef<PlayerRef>(null);
  const loaded = !!lesson;

  // ?t=40 opens the lesson at that second, so a teacher can share one moment
  useEffect(() => {
    const t = Number(new URLSearchParams(window.location.search).get("t"));
    if (!loaded || !(t > 0)) return;
    const timer = setInterval(() => {
      if (!player.current) return;
      player.current.seekTo(Math.round(t * FPS));
      clearInterval(timer);
    }, 100);
    return () => clearInterval(timer);
  }, [loaded]);
  const [name, setName] = useState("");
  useEffect(() => {
    try {
      setName(localStorage.getItem("nemi-student") ?? "");
    } catch {}
  }, []);
  // Students who leave the name empty still count one by one: each device keeps its own number
  const [device, setDevice] = useState("");
  useEffect(() => {
    let n = String(1000 + Math.floor(Math.random() * 9000));
    try {
      n = localStorage.getItem("nemi-device") ?? n;
      localStorage.setItem("nemi-device", n);
    } catch {}
    setDevice(n);
  }, []);
  const saveName = (v: string) => {
    setName(v);
    try {
      localStorage.setItem("nemi-student", v);
    } catch {}
  };

  if (!lesson) {
    return <div className="grid flex-1 place-items-center">{error ? <p className="text-red">{error}</p> : <Loader2 className="size-6 animate-spin text-muted" />}</div>;
  }
  const quizzes = lesson.scenes.filter((s) => s.kind === "quiz").length;
  const t = studentCopy(lesson.language);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-6">
      <header className="flex items-center justify-between">
        <Logo small />
        {score && (
          <motion.span initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center gap-1.5 rounded-full bg-amber/15 px-3 py-1 text-sm font-bold text-amber">
            <Trophy className="size-4" />{score.right}/{score.total}
          </motion.span>
        )}
      </header>
      <div>
        <h1 className="text-2xl font-extrabold sm:text-3xl">{lesson.title}</h1>
        <p className="text-muted">{lesson.subtitle}</p>
      </div>
      {quizzes > 0 && !isDemo(lesson.id) && (
        <label className="flex max-w-sm flex-col gap-1.5">
          <span className="label">{t.name}</span>
          <input className="field" value={name} onChange={(e) => saveName(e.target.value)}
            placeholder={t.namePh} />
        </label>
      )}
      <div className={lesson.format === "portrait" ? "mx-auto w-full max-w-[420px]" : ""}>
        <LessonPlayer
          lesson={lesson}
          interactive
          playerRef={player}
          onScore={setScore}
          onAnswer={(sceneId, picked) => {
            // Answers go to the teacher's Class results (not for the built-in examples)
            const student = name.trim() || `${t.anonymous} ${device}`;
            if (!isDemo(lesson.id)) api.answer(lesson.id, { student, scene_id: sceneId, picked }).catch(() => {});
          }}
        />
      </div>
      {quizzes > 0 && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <CircleHelp className="size-4 text-violet" />
          {t.stops(quizzes)} {t.start}
        </p>
      )}
    </main>
  );
}
