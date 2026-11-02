"use client";

import { ImagePlus, Loader2, Ticket, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { api } from "@/lib/engine";
import { useEventsCopy } from "@/lib/eventsCopy";
import { LangToggle, useLang } from "@/lib/i18n";

export function EventForm() {
  const t = useEventsCopy();
  const { lang } = useLang();
  const router = useRouter();
  const [fields, setFields] = useState({ name: "", date: "", place: "", community: "", description: "" });
  const [logos, setLogos] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setFields({ ...fields, [k]: e.target.value });

  const submit = async () => {
    setBusy(true);
    setError(null);
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    form.append("language", lang === "es" ? "Spanish" : "English");
    logos.forEach((f) => form.append("logos", f));
    try {
      const kit = await api.createEvent(form);
      router.push(`/events/${kit.id}`);
    } catch (e) {
      setError((e as Error).message.includes("fetch") ? t.offline : (e as Error).message);
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6">
      <header className="mb-12 flex items-center gap-4">
        <Logo />
        <div className="ml-auto"><LangToggle /></div>
      </header>
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_1.05fr]">
        <div>
          <span className="rounded-full bg-amber/15 px-2.5 py-0.5 text-xs font-semibold text-amber">{t.badge}</span>
          <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">{t.title}</h1>
          <p className="mt-5 max-w-lg text-lg text-muted">{t.sub}</p>
          <ul className="mt-8 space-y-3">
            {t.how.map(([model, text]) => (
              <li key={model} className="text-sm leading-relaxed text-muted"><span className="font-semibold text-ink">{model}</span> {text}</li>
            ))}
          </ul>
        </div>

        <div className="space-y-4 rounded-3xl border border-line bg-panel/80 p-5 shadow-2xl shadow-black/30 sm:p-7">
          <Field label={t.name}><input className="field text-base" placeholder={t.namePh} value={fields.name} onChange={set("name")} /></Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t.date}><input className="field" placeholder={t.datePh} value={fields.date} onChange={set("date")} /></Field>
            <Field label={t.place}><input className="field" placeholder={t.placePh} value={fields.place} onChange={set("place")} /></Field>
          </div>
          <Field label={t.community}><input className="field" placeholder={t.communityPh} value={fields.community} onChange={set("community")} /></Field>
          <Field label={t.about}><textarea className="field min-h-20 resize-none" placeholder={t.aboutPh} value={fields.description} onChange={set("description")} /></Field>
          <div>
            <span className="label">{t.logos}</span>
            <div className="flex flex-wrap gap-2">
              {logos.map((f, i) => (
                <span key={i} className="relative grid size-20 place-items-center rounded-xl border border-line bg-white/90 p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={URL.createObjectURL(f)} alt="" className="max-h-full max-w-full object-contain" />
                  <button onClick={() => setLogos(logos.filter((_, j) => j !== i))} className="absolute -right-2 -top-2 rounded-full bg-panel p-0.5 text-ink"><X className="size-3.5" /></button>
                </span>
              ))}
              {logos.length < 4 && (
                <label className="grid size-20 cursor-pointer place-items-center rounded-xl border-2 border-dashed border-line text-muted transition hover:border-violet/60 hover:text-ink">
                  <ImagePlus className="size-6" />
                  <input type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden"
                    onChange={(e) => setLogos([...logos, ...Array.from(e.target.files ?? [])].slice(0, 4))} />
                </label>
              )}
            </div>
            <p className="mt-2 text-xs text-muted">{t.logosHint}</p>
          </div>
          {error && <p className="rounded-xl border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">{error}</p>}
          <button onClick={submit} disabled={!fields.name.trim() || busy} className="btn-primary w-full py-3.5 text-base">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Ticket className="size-5" />}
            {busy ? t.creating : t.create}
          </button>
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}
