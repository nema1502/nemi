"use client";

import { dimensions, FPS, LessonVideo, timeline, type Lesson, type Scene } from "@nemi/video";
import { Player, type PlayerRef } from "@remotion/player";
import { Play } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import React, { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { asset, ENGINE } from "@/lib/engine";
import { studentCopy } from "@/lib/studioCopy";

type Props = {
  lesson: Lesson;
  interactive?: boolean;
  captions?: boolean;
  playerRef?: RefObject<PlayerRef | null>;
  onFrame?: (frame: number) => void;
  onScore?: (score: { right: number; total: number }) => void;
  onAnswer?: (sceneId: string, picked: number) => void;
};

/** The Remotion composition, live in the browser. In student mode it stops at every quiz. */
export function LessonPlayer({ lesson, interactive = false, captions = true, playerRef, onFrame, onScore, onAnswer }: Props) {
  const ownRef = useRef<PlayerRef>(null);
  const ref = playerRef ?? ownRef;
  const { items, total } = useMemo(() => timeline(lesson), [lesson]);
  const { width, height } = dimensions(lesson);
  const inputProps = useMemo(() => ({ lesson, assetBase: ENGINE, captions, interactive }), [lesson, captions, interactive]);
  // Students open the link on the first frame, before the opening picture fades in: show it as a cover instead
  const cover = lesson.scenes.find((s) => s.assets.image)?.assets.image;
  const poster = useCallback(
    () => (
      <div className="absolute inset-0 grid place-items-center bg-[#0b0a16]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {cover && <img src={asset(cover)} alt="" className="absolute inset-0 size-full object-cover opacity-80" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10" />
        <div className="relative flex flex-col items-center gap-3 px-4 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-violet text-[#120f22] shadow-xl shadow-black/50 sm:size-20">
            <Play className="ml-1 size-7 fill-current sm:size-9" />
          </span>
          <p className="hidden text-2xl font-extrabold text-white drop-shadow sm:block">{lesson.title}</p>
        </div>
      </div>
    ),
    [cover, lesson.title],
  );

  const quizzes = useMemo(
    () =>
      items
        .filter((i) => i.scene.kind === "quiz" && i.scene.quiz)
        .map((i) => ({
          scene: i.scene,
          think: i.from + Math.round(i.timing.thinkStart * FPS),
          reveal: i.from + Math.round(i.timing.revealStart * FPS),
        })),
    [items],
  );
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [open, setOpen] = useState<(typeof quizzes)[number] | null>(null);
  const [picked, setPicked] = useState<number | null>(null);

  useEffect(() => {
    const player = ref.current;
    if (!player) return;
    const onUpdate = (e: { detail: { frame: number } }) => {
      const frame = e.detail.frame;
      onFrame?.(frame);
      if (!interactive || open) return;
      const q = quizzes.find((q) => answers[q.scene.id] === undefined && frame >= q.think && frame < q.reveal);
      if (q) {
        player.pause();
        player.seekTo(q.think);
        setPicked(null);
        setOpen(q);
      }
    };
    player.addEventListener("frameupdate", onUpdate);
    return () => player.removeEventListener("frameupdate", onUpdate);
  }, [ref, interactive, quizzes, answers, open, onFrame]);

  const answer = (i: number) => {
    if (!open || picked !== null) return;
    setPicked(i);
    onAnswer?.(open.scene.id, i);
    const next = { ...answers, [open.scene.id]: i };
    setAnswers(next);
    onScore?.({
      right: quizzes.filter((q) => next[q.scene.id] === q.scene.quiz!.answer_index).length,
      total: quizzes.length,
    });
    setTimeout(() => {
      ref.current?.seekTo(open.reveal);
      ref.current?.play();
      setOpen(null);
    }, 1400);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line bg-black shadow-2xl shadow-black/40">
      <Player
        ref={ref}
        component={LessonVideo}
        inputProps={inputProps}
        durationInFrames={total}
        fps={FPS}
        compositionWidth={width}
        compositionHeight={height}
        style={{ width: "100%", aspectRatio: `${width} / ${height}`, maxHeight: lesson.format === "portrait" ? "78vh" : undefined }}
        controls
        initialFrame={interactive ? 0 : Math.min(45, total - 1)}
        renderPoster={interactive ? poster : undefined}
        showPosterWhenUnplayed={interactive}
        clickToPlay={!open}
        spaceKeyToPlayOrPause={!open}
        acknowledgeRemotionLicense
      />
      <AnimatePresence>{open && <QuizOverlay scene={open.scene} picked={picked} onPick={answer} t={studentCopy(lesson.language)} />}</AnimatePresence>
    </div>
  );
}

function QuizOverlay({ scene, picked, onPick, t }: { scene: Scene; picked: number | null; onPick: (i: number) => void; t: ReturnType<typeof studentCopy> }) {
  const quiz = scene.quiz!;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-5 bg-[#0b0a16]/95 p-6 backdrop-blur-md"
    >
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber">{t.turn}</p>
      <h3 className="max-w-2xl text-center text-xl font-bold sm:text-2xl">{quiz.question}</h3>
      <div className="grid w-full max-w-2xl gap-3 sm:grid-cols-2">
        {quiz.options.map((o, i) => {
          const right = i === quiz.answer_index;
          const state = picked === null ? "idle" : right ? "right" : picked === i ? "wrong" : "dim";
          return (
            <motion.button
              key={i}
              whileHover={picked === null ? { scale: 1.02 } : undefined}
              whileTap={{ scale: 0.98 }}
              onClick={() => onPick(i)}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-base font-semibold transition ${
                state === "right"
                  ? "border-green bg-green/15"
                  : state === "wrong"
                    ? "border-red bg-red/15"
                    : state === "dim"
                      ? "border-line opacity-40"
                      : "border-line bg-panel-2 hover:border-violet"
              }`}
            >
              <span className="grid size-8 place-items-center rounded-lg bg-violet/20 text-sm font-bold text-violet">{"ABCD"[i]}</span>
              {o}
            </motion.button>
          );
        })}
      </div>
      {picked !== null && (
        <motion.p initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`text-lg font-bold ${picked === quiz.answer_index ? "text-green" : "text-amber"}`}>
          {picked === quiz.answer_index ? t.correct : t.almost}
        </motion.p>
      )}
    </motion.div>
  );
}
