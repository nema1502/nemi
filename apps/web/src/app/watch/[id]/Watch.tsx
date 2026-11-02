"use client";

import { CircleHelp, Loader2, Trophy } from "lucide-react";
import { motion } from "motion/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { LessonPlayer } from "@/components/LessonPlayer";
import { Logo } from "@/components/Logo";
import { useLessonLive } from "@/lib/engine";

/** What students open from the teacher's link: the lesson, pausing at every quiz for their answer. */
export function Watch() {
  const { id } = useParams<{ id: string }>();
  const { lesson, error } = useLessonLive(id);
  const [score, setScore] = useState<{ right: number; total: number } | null>(null);

  if (!lesson) {
    return <div className="grid flex-1 place-items-center">{error ? <p className="text-red">{error}</p> : <Loader2 className="size-6 animate-spin text-muted" />}</div>;
  }
  const quizzes = lesson.scenes.filter((s) => s.kind === "quiz").length;

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
      <div className={lesson.format === "portrait" ? "mx-auto w-full max-w-[420px]" : ""}>
        <LessonPlayer lesson={lesson} interactive onScore={setScore} />
      </div>
      {quizzes > 0 && (
        <p className="flex items-center gap-2 text-sm text-muted">
          <CircleHelp className="size-4 text-violet" />The video stops {quizzes === 1 ? "once" : `${quizzes} times`} to ask you a question.
        </p>
      )}
    </main>
  );
}
