import {
  BookOpen, Brain, Check, Download, GraduationCap, Mic, Play, ScanSearch, Share2, Sparkles, Ticket, WandSparkles,
} from "lucide-react";
import Link from "next/link";
import { CreateForm } from "@/components/CreateForm";
import { Gallery } from "@/components/Gallery";
import { HeroPlayer } from "@/components/HeroPlayer";
import { Logo } from "@/components/Logo";

const MODELS = [
  { icon: BookOpen, model: "Muse Spark", text: "reads your chapter, plans the lesson in five acts and checks it against 7 questions before anything is made" },
  { icon: WandSparkles, model: "Muse Image", text: "draws every illustration in one style, with no garbled text" },
  { icon: ScanSearch, model: "SAM 3.1", text: "cuts out each part of a diagram so it lights up when the narrator names it" },
  { icon: Brain, model: "Muse Spark and Manim", text: "write precise animations, audit them and fix their own mistakes" },
  { icon: Mic, model: "Muse Voice Transcribe", text: "lets you re-record any line in your own voice, with captions" },
];

const STEPS = [
  { n: "1", title: "Bring your material", text: "A textbook chapter as a PDF, or just a topic. Pick the grade, the language and a voice from your region." },
  { n: "2", title: "Nemi makes the lesson", text: "It plans, reviews, illustrates, animates and narrates a short lesson with quiz pauses. You watch it happen." },
  { n: "3", title: "You approve and share", text: "Edit any scene in the live preview, then send the student link or download the video for your own platform." },
];

const PRODUCTS = [
  {
    icon: Sparkles, name: "Nemi Studio", badge: "Available", tone: "green",
    text: "Topic or PDF in, lesson out. Edit any scene, switch the look, record a line in your own voice and export.",
  },
  {
    icon: GraduationCap, name: "Nemi Classroom", badge: "Beta", tone: "violet",
    text: "One link per lesson. Students watch on any phone, the video stops at each quiz and waits for their answer. Class results for the teacher come next.",
  },
  {
    icon: Download, name: "Your own platform", badge: "MP4 available", tone: "green",
    text: "Download the video for the projector, WhatsApp or YouTube. Packages for Google Classroom, Moodle and other LMS are on the way.",
  },
];

const PLANS = [
  { name: "Free", price: "$0", per: "", items: ["3 lessons a month", "Student links with quiz pauses", "MP4 with a small Nemi mark"] },
  { name: "Teacher", price: "$9", per: "a month", featured: true, items: ["20 lessons a month", "PDF chapters up to 50 pages", "Your own voice", "MP4 without watermark"] },
  { name: "School", price: "$4", per: "per teacher a month", items: ["Shared credits for the whole school", "Nemi Classroom with quiz results", "LMS export", "Priority rendering"] },
  { name: "Events", price: "$29", per: "per event", items: ["Launch kit with your logos and colors", "Luma cover and 9-post grid", "Stories and promo video"] },
];

const EVENT_KIT = ["An event cover sized for Luma", "A 9-post Instagram grid that forms one big picture", "Stories and reels in your colors", "A promo video before and a recap video after"];

export default function Home() {
  return (
    <main className="w-full">
      <nav className="sticky top-0 z-30 border-b border-line/60 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
          <Logo />
          <div className="ml-4 hidden gap-5 text-sm text-muted md:flex">
            <a href="#how" className="hover:text-ink">How it works</a>
            <a href="#classroom" className="hover:text-ink">Classroom</a>
            <a href="#events" className="hover:text-ink">Events</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <a href="https://github.com/nema1502/nemi" className="hidden text-sm text-muted hover:text-ink sm:block">GitHub</a>
            <a href="#create" className="btn-primary px-3.5 py-2">Create a lesson</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:pt-20">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-violet/30 bg-violet/10 px-3 py-1 text-xs font-semibold text-violet">
            For teachers and their students
          </p>
          <h1 className="text-4xl font-extrabold leading-[1.04] tracking-tight sm:text-6xl">
            Your chapter, as a lesson video your students <span className="text-violet">finish</span>.
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">
            Upload a textbook PDF or type a topic. Nemi plans, illustrates, animates and narrates it, and you edit every scene before your class sees it.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#create" className="btn-primary px-5 py-3 text-base"><Sparkles className="size-5" />Create a lesson</a>
            <Link href="/watch/demo" className="btn-ghost px-5 py-3 text-base"><Play className="size-5" />Watch an example</Link>
          </div>
          <p className="mt-6 text-sm text-muted">Spanish, English and Portuguese. Classroom 16:9 or phone 9:16. Latin American voices, or yours.</p>
        </div>
        <div className="relative mx-auto w-full max-w-[640px] pb-10 pt-6 lg:pb-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/demo/s1-1ca3-68038d91.jpg" alt="" className="absolute right-0 top-0 w-[72%] rotate-[5deg] rounded-2xl border border-white/10 opacity-80 shadow-2xl shadow-black/50" />
          <div className="relative mt-16 -rotate-[2.5deg] overflow-hidden rounded-2xl border border-white/15 shadow-[0_30px_90px_rgba(0,0,0,.6),0_0_80px_rgba(167,139,250,.25)]">
            <HeroPlayer />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">From textbook to video in minutes</h2>
        <p className="mt-3 max-w-2xl text-muted">A good animated lesson used to take a creator days. Nemi does the heavy part and leaves the decisions to the teacher.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl border border-line bg-panel/70 p-6">
              <span className="grid size-10 place-items-center rounded-xl bg-violet/15 text-lg font-extrabold text-violet">{s.n}</span>
              <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Create */}
      <section id="create" className="mx-auto grid max-w-6xl scroll-mt-20 items-start gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.05fr]">
        <div className="lg:pt-4">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Make one now</h2>
          <p className="mt-3 max-w-md text-muted">Each step is one of Meta&apos;s models doing what it does best, and most steps are checked by another one.</p>
          <ul className="mt-8 space-y-4">
            {MODELS.map(({ icon: Icon, model, text }) => (
              <li key={model} className="flex gap-3">
                <span className="mt-0.5 grid size-8 flex-none place-items-center rounded-lg bg-panel-2 text-teal"><Icon className="size-4" /></span>
                <p className="text-sm leading-relaxed text-muted"><span className="font-semibold text-ink">{model}</span> {text}</p>
              </li>
            ))}
          </ul>
        </div>
        <CreateForm />
      </section>

      {/* Products */}
      <section id="classroom" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">One lesson, every way your class learns</h2>
        <p className="mt-3 max-w-2xl text-muted">Teach with it in class, send it home with a link, or put it on the platform your school already uses.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {PRODUCTS.map(({ icon: Icon, name, badge, tone, text }) => (
            <div key={name} className="flex flex-col rounded-2xl border border-line bg-panel/70 p-6">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-panel-2 text-teal"><Icon className="size-5" /></span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone === "green" ? "bg-green/15 text-green" : "bg-violet/15 text-violet"}`}>{badge}</span>
              </div>
              <h3 className="mt-4 text-lg font-bold">{name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-violet/30 bg-violet/10 p-5">
          <Share2 className="size-5 text-violet" />
          <p className="flex-1 text-sm">See what a student gets: the example lesson stops at its quiz and waits for an answer.</p>
          <Link href="/watch/demo" className="btn-primary">Open the student link</Link>
        </div>
      </section>

      {/* Events */}
      <section id="events" className="mx-auto grid max-w-6xl scroll-mt-20 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div>
          <span className="rounded-full bg-amber/15 px-2.5 py-0.5 text-xs font-semibold text-amber">Coming soon</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">Nemi for events</h2>
          <p className="mt-3 max-w-md text-muted">
            Running a hackathon, a meetup or a school science fair? Bring your logos, your colors and the idea. Nemi drafts the whole launch kit in the same style.
          </p>
          <ul className="mt-6 space-y-3">
            {EVENT_KIT.map((k) => (
              <li key={k} className="flex items-center gap-3 text-sm"><Check className="size-4 flex-none text-amber" />{k}</li>
            ))}
          </ul>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div className="grid grid-cols-3 gap-1.5 overflow-hidden rounded-2xl border border-line bg-panel p-1.5 shadow-2xl shadow-black/40">
            {Array.from({ length: 9 }, (_, i) => (
              <div
                key={i}
                className="aspect-square rounded-md"
                style={{ backgroundImage: "url(/landing/event.jpg)", backgroundSize: "300% 300%", backgroundPosition: `${(i % 3) * 50}% ${Math.floor(i / 3) * 50}%` }}
              />
            ))}
          </div>
          <div className="absolute -bottom-6 -left-6 hidden w-40 rotate-[-6deg] overflow-hidden rounded-xl border border-white/15 bg-panel shadow-2xl sm:block">
            <div className="aspect-square bg-cover bg-center" style={{ backgroundImage: "url(/landing/event.jpg)" }} />
            <div className="flex items-center gap-1.5 p-2 text-[11px] font-semibold"><Ticket className="size-3.5 text-amber" />Your event cover</div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Credits or a plan</h2>
        <p className="mt-3 max-w-2xl text-muted">One credit is one lesson of up to 3 minutes. Nemi is free while in pilot; these are the planned prices.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((p) => (
            <div key={p.name} className={`flex flex-col rounded-2xl border p-6 ${p.featured ? "border-violet bg-violet/10" : "border-line bg-panel/70"}`}>
              <h3 className="font-bold">{p.name}</h3>
              <p className="mt-3"><span className="text-4xl font-extrabold">{p.price}</span> <span className="text-sm text-muted">{p.per}</span></p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {p.items.map((i) => (
                  <li key={i} className="flex gap-2"><Check className="mt-0.5 size-4 flex-none text-green" /><span className="text-muted">{i}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">Need more lessons in a month? 10 extra credits for $5, no plan change needed.</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <Gallery />
      </section>

      <footer className="mt-20 border-t border-line/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-8 text-sm text-muted sm:px-6">
          <Logo small />
          <p className="flex-1">Made in Santa Cruz de la Sierra, Bolivia, by Nicolás Mejía Agreda. Built with Meta&apos;s Muse models for the Meta Global AI Developer Hackathon 2026.</p>
          <a href="https://github.com/nema1502/nemi" className="hover:text-ink">GitHub</a>
          <a href="https://x.com/Emiru1502" className="hover:text-ink">X</a>
          <a href="https://www.linkedin.com/in/nicolas-mejia-agreda/" className="hover:text-ink">LinkedIn</a>
        </div>
      </footer>
    </main>
  );
}
