import { BookOpen, Brain, Mic, ScanSearch, WandSparkles } from "lucide-react";
import { CreateForm } from "@/components/CreateForm";
import { Gallery } from "@/components/Gallery";
import { Logo } from "@/components/Logo";

const STEPS = [
  { icon: BookOpen, model: "Muse Spark", text: "reads your chapter and plans the lesson in five acts, then checks it against 7 questions" },
  { icon: WandSparkles, model: "Muse Image", text: "draws every illustration in one style, with no garbled text" },
  { icon: ScanSearch, model: "SAM 3.1", text: "cuts out each part of a diagram so it lights up when the narrator names it" },
  { icon: Brain, model: "Muse Spark + Manim", text: "writes precise animations, audits them and fixes its own mistakes" },
  { icon: Mic, model: "Muse Voice Transcribe", text: "lets you re-record any line in your own voice, with captions" },
];

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-8 sm:px-6">
      <header className="mb-12 flex items-center justify-between">
        <Logo />
        <a href="https://github.com/nema1502/nemi" className="text-sm text-muted transition hover:text-ink">GitHub</a>
      </header>

      <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.05fr]">
        <div className="lg:pt-6">
          <p className="mb-4 inline-flex rounded-full border border-violet/30 bg-violet/10 px-3 py-1 text-xs font-semibold text-violet">
            For teachers, built with Meta&apos;s Muse models
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Your chapter, as a lesson video your students <span className="text-violet">finish</span>.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            Upload a textbook PDF or type a topic. Nemi plans, illustrates, animates and narrates a short lesson
            with quiz pauses, and you edit every scene before your class sees it.
          </p>
          <ul className="mt-8 space-y-3.5">
            {STEPS.map(({ icon: Icon, model, text }) => (
              <li key={model} className="flex gap-3">
                <span className="mt-0.5 grid size-8 flex-none place-items-center rounded-lg bg-panel-2 text-teal"><Icon className="size-4" /></span>
                <p className="text-sm leading-relaxed text-muted"><span className="font-semibold text-ink">{model}</span> {text}</p>
              </li>
            ))}
          </ul>
        </div>
        <CreateForm />
      </div>

      <Gallery />
    </main>
  );
}
