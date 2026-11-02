"use client";

import { Loader2, Mic, Square } from "lucide-react";
import { useRef, useState } from "react";

/** Record a scene's narration in the teacher's own voice. */
export function Recorder({ script, onDone }: { script: string; onDone: (audio: Blob) => Promise<void> }) {
  const [state, setState] = useState<"idle" | "recording" | "sending">("idle");
  const [seconds, setSeconds] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream);
    r.ondataavailable = (e) => chunks.push(e.data);
    r.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
      setState("sending");
      try {
        await onDone(new Blob(chunks, { type: r.mimeType }));
      } finally {
        setState("idle");
      }
    };
    r.start();
    rec.current = r;
    setSeconds(0);
    timer.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    setState("recording");
  };

  if (state === "recording") {
    return (
      <div className="rounded-xl border border-red/50 bg-red/10 p-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red">Recording · {seconds}s — read this:</p>
        <p className="mb-3 text-sm leading-relaxed">{script}</p>
        <button onClick={() => rec.current?.stop()} className="btn bg-red text-white"><Square className="size-4" />Stop</button>
      </div>
    );
  }
  return (
    <button onClick={start} disabled={state === "sending"} className="btn-ghost">
      {state === "sending" ? <Loader2 className="size-4 animate-spin" /> : <Mic className="size-4" />}
      {state === "sending" ? "Muse Voice Transcribe is listening…" : "Record in my voice"}
    </button>
  );
}
