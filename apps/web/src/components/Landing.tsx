"use client";

import { BookOpen, Brain, Check, Download, GraduationCap, Mic, Play, ScanSearch, Share2, Sparkles, Ticket, WandSparkles } from "lucide-react";
import Link from "next/link";
import { CreateForm } from "@/components/CreateForm";
import { Gallery } from "@/components/Gallery";
import { HeroPlayer } from "@/components/HeroPlayer";
import { Logo } from "@/components/Logo";
import { demoFor, LangToggle, useCopy, useLang } from "@/lib/i18n";

const MODEL_ICONS = [BookOpen, WandSparkles, ScanSearch, Brain, Mic];
const PRODUCT_ICONS = [Sparkles, GraduationCap, Download];

export function Landing() {
  const { lang } = useLang();
  const t = useCopy();
  const demo = demoFor(lang);

  return (
    <main className="w-full">
      <nav className="sticky top-0 z-30 border-b border-line/60 bg-bg/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3 sm:px-6">
          <Logo />
          <div className="ml-4 hidden gap-5 text-sm text-muted md:flex">
            <a href="#how" className="hover:text-ink">{t.nav.how}</a>
            <a href="#classroom" className="hover:text-ink">{t.nav.classroom}</a>
            <a href="#events" className="hover:text-ink">{t.nav.events}</a>
            <a href="#pricing" className="hover:text-ink">{t.nav.pricing}</a>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <LangToggle />
            <a href="https://github.com/nema1502/nemi" className="hidden text-sm text-muted hover:text-ink sm:block">GitHub</a>
            <a href="#create" className="btn-primary hidden px-3.5 py-2 sm:inline-flex">{t.nav.create}</a>
          </div>
        </div>
      </nav>

      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-14 sm:px-6 lg:grid-cols-[1fr_1.15fr] lg:pt-20">
        <div>
          <p className="mb-5 inline-flex rounded-full border border-violet/30 bg-violet/10 px-3 py-1 text-xs font-semibold text-violet">{t.hero.pill}</p>
          <h1 className="text-4xl font-extrabold leading-[1.04] tracking-tight sm:text-6xl">
            {t.hero.h1[0]}<span className="text-violet">{t.hero.h1[1]}</span>{t.hero.h1[2]}
          </h1>
          <p className="mt-5 max-w-lg text-lg text-muted">{t.hero.sub}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#create" className="btn-primary px-5 py-3 text-base"><Sparkles className="size-5" />{t.hero.create}</a>
            <Link href={`/watch/${demo}`} className="btn-ghost px-5 py-3 text-base"><Play className="size-5" />{t.hero.watch}</Link>
          </div>
          <p className="mt-6 text-sm text-muted">{t.hero.langs}</p>
        </div>
        <HeroPlayer key={demo} src={`/${demo}/lesson.json`} />
      </section>

      <section id="how" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.how.title}</h2>
        <p className="mt-3 max-w-2xl text-muted">{t.how.sub}</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {t.how.steps.map(([title, text], i) => (
            <div key={title} className="rounded-2xl border border-line bg-panel/70 p-6">
              <span className="grid size-10 place-items-center rounded-xl bg-violet/15 text-lg font-extrabold text-violet">{i + 1}</span>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
        <figure className="mx-auto mt-8 max-w-4xl overflow-hidden rounded-2xl border border-line bg-panel/70">
          <video key={lang} src={`/tour/walkthrough-${lang}.mp4`} poster={`/tour/walkthrough-${lang}.jpg`}
            className="block aspect-video w-full" autoPlay muted loop playsInline controls preload="metadata" />
          <figcaption className="px-4 py-3 text-sm text-muted">{t.how.video}</figcaption>
        </figure>
      </section>

      <section id="create" className="mx-auto grid max-w-6xl scroll-mt-20 items-start gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1fr_1.05fr]">
        <div className="lg:pt-4">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.make.title}</h2>
          <p className="mt-3 max-w-md text-muted">{t.make.sub}</p>
          <ul className="mt-8 space-y-4">
            {t.make.models.map(([model, text], i) => {
              const Icon = MODEL_ICONS[i];
              return (
                <li key={model} className="flex gap-3">
                  <span className="mt-0.5 grid size-8 flex-none place-items-center rounded-lg bg-panel-2 text-teal"><Icon className="size-4" /></span>
                  <p className="text-sm leading-relaxed text-muted"><span className="font-semibold text-ink">{model}</span> {text}</p>
                </li>
              );
            })}
          </ul>
        </div>
        <CreateForm />
      </section>

      <section id="classroom" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.products.title}</h2>
        <p className="mt-3 max-w-2xl text-muted">{t.products.sub}</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {t.products.items.map(([name, badge, text], i) => {
            const Icon = PRODUCT_ICONS[i];
            return (
              <div key={name} className="flex flex-col rounded-2xl border border-line bg-panel/70 p-6">
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-xl bg-panel-2 text-teal"><Icon className="size-5" /></span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${i === 1 ? "bg-violet/15 text-violet" : "bg-green/15 text-green"}`}>{badge}</span>
                </div>
                <h3 className="mt-4 text-lg font-bold">{name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{text}</p>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-2xl border border-violet/30 bg-violet/10 p-5">
          <Share2 className="size-5 text-violet" />
          <p className="flex-1 text-sm">{t.products.student}</p>
          <Link href={`/watch/${demo}`} className="btn-primary">{t.products.studentCta}</Link>
        </div>
      </section>

      <section id="events" className="mx-auto grid max-w-6xl scroll-mt-20 items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2">
        <div>
          <span className="rounded-full bg-amber/15 px-2.5 py-0.5 text-xs font-semibold text-amber">{t.events.badge}</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">{t.events.title}</h2>
          <p className="mt-3 max-w-md text-muted">{t.events.sub}</p>
          <ul className="mt-6 space-y-3">
            {t.events.kit.map((k) => (
              <li key={k} className="flex items-center gap-3 text-sm"><Check className="size-4 flex-none text-amber" />{k}</li>
            ))}
          </ul>
          <Link href="/events" className="btn-primary mt-8"><Ticket className="size-4" />{t.events.cta}</Link>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div className="grid grid-cols-3 gap-1.5 overflow-hidden rounded-2xl border border-line bg-panel p-1.5 shadow-2xl shadow-black/40">
            {Array.from({ length: 9 }, (_, i) => (
              <div key={i} className="aspect-square rounded-md" style={{ backgroundImage: "url(/landing/event.jpg)", backgroundSize: "300% 300%", backgroundPosition: `${(i % 3) * 50}% ${Math.floor(i / 3) * 50}%` }} />
            ))}
          </div>
          <div className="absolute -bottom-6 -left-6 hidden w-40 rotate-[-6deg] overflow-hidden rounded-xl border border-white/15 bg-panel shadow-2xl sm:block">
            <div className="aspect-square bg-cover bg-center" style={{ backgroundImage: "url(/landing/event.jpg)" }} />
            <div className="flex items-center gap-1.5 p-2 text-[11px] font-semibold"><Ticket className="size-3.5 text-amber" />{t.events.cover}</div>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{t.pricing.title}</h2>
        <p className="mt-3 max-w-2xl text-muted">{t.pricing.sub}</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.pricing.plans.map(([name, price, per, items], i) => (
            <div key={name} className={`flex flex-col rounded-2xl border p-6 ${i === 1 ? "border-violet bg-violet/10" : "border-line bg-panel/70"}`}>
              <h3 className="font-bold">{name}</h3>
              <p className="mt-3"><span className="text-4xl font-extrabold">{price}</span> <span className="text-sm text-muted">{per}</span></p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {items.map((item) => (
                  <li key={item} className="flex gap-2"><Check className="mt-0.5 size-4 flex-none text-green" /><span className="text-muted">{item}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted">{t.pricing.extra}</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 sm:px-6">
        <Gallery />
      </section>

      <footer className="mt-20 border-t border-line/60">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-8 text-sm text-muted sm:px-6">
          <Logo small />
          <p className="flex-1">{t.footer}</p>
          <a href="https://github.com/nema1502/nemi" className="hover:text-ink">GitHub</a>
          <a href="https://x.com/Emiru1502" className="hover:text-ink">X</a>
          <a href="https://www.linkedin.com/in/nicolas-mejia-agreda/" className="hover:text-ink">LinkedIn</a>
        </div>
      </footer>
    </main>
  );
}
