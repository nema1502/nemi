"use client";

import { Brain, FileText, Loader2, Monitor, Smartphone, Sparkles, Upload, X } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type Options } from "@/lib/engine";
import { useCopy, useLang } from "@/lib/i18n";

const LANGS = ["Spanish", "English", "Portuguese"];
// Shown even when the engine is offline
const FALLBACK: Options = {
  voices: {
    Spanish: ["es-BO-SofiaNeural", "es-BO-MarceloNeural", "es-MX-DaliaNeural", "es-PE-CamilaNeural", "es-CO-SalomeNeural", "es-AR-TomasNeural"],
    English: ["en-US-AvaMultilingualNeural", "en-US-AndrewMultilingualNeural", "en-US-EmmaNeural", "en-US-BrianNeural"],
    Portuguese: ["pt-BR-FranciscaNeural", "pt-BR-AntonioNeural"],
  },
  themes: {
    night: { name: "night", bg: "#0C0A1A", surface: "#17142B", ink: "#F5F7FF", muted: "#9AA3B8", accent: "#A78BFA", accent2: "#5EE7DF", accent3: "#FFC94D", good: "#3DDC84", bad: "#FF5C5C" },
    chalk: { name: "chalk", bg: "#14261E", surface: "#1C3329", ink: "#F3F1E7", muted: "#A9B8AE", accent: "#FFD166", accent2: "#7FD1FF", accent3: "#FF9AA2", good: "#9BE564", bad: "#FF6B6B" },
    paper: { name: "paper", bg: "#FBF7EF", surface: "#FFFFFF", ink: "#1E1B2E", muted: "#6B6880", accent: "#5B4BDB", accent2: "#0FA3A3", accent3: "#E07A1F", good: "#1F9D55", bad: "#D64545" },
  },
};

export function CreateForm() {
  const router = useRouter();
  const t = useCopy().form;
  const { lang } = useLang();
  const [opts, setOpts] = useState<Options>(FALLBACK);
  const [offline, setOffline] = useState(false);
  const [mode, setMode] = useState<"topic" | "pdf">("topic");
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [audience, setAudience] = useState("");
  const [language, setLanguage] = useState("Spanish");
  const [voice, setVoice] = useState("es-BO-SofiaNeural");
  const [length, setLength] = useState("short");
  const [format, setFormat] = useState<"landscape" | "portrait">("landscape");
  const [theme, setTheme] = useState("night");
  const [deep, setDeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.options().then(setOpts).catch(() => setOffline(true));
  }, []);

  // The lesson defaults to the language the page is in
  useEffect(() => {
    setLanguage(lang === "es" ? "Spanish" : "English");
    setVoice(lang === "es" ? "es-BO-SofiaNeural" : "en-US-AvaMultilingualNeural");
  }, [lang]);

  const pickLanguage = (l: string) => {
    setLanguage(l);
    const first = opts.voices[l]?.[0];
    if (first) setVoice(first);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    const form = new FormData();
    form.append("topic", topic);
    form.append("audience", audience || "Students");
    form.append("language", language);
    form.append("voice", voice);
    form.append("length", length);
    form.append("format", format);
    form.append("theme", theme);
    form.append("deep", String(deep));
    if (mode === "pdf" && file) form.append("file", file);
    try {
      const lesson = await api.create(form);
      router.push(`/lesson/${lesson.id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const ready = mode === "topic" ? topic.trim().length > 3 : !!file;

  return (
    <div className="rounded-3xl border border-line bg-panel/80 p-5 shadow-2xl shadow-black/30 backdrop-blur sm:p-7">
      <div className="mb-5 inline-flex rounded-xl border border-line bg-panel-2 p-1">
        {(["topic", "pdf"] as const).map((m) => (
          <button key={m} onClick={() => setMode(m)} className={`relative rounded-lg px-4 py-1.5 text-sm font-semibold transition ${mode === m ? "text-[#120f22]" : "text-muted hover:text-ink"}`}>
            {mode === m && <motion.span layoutId="mode" className="absolute inset-0 rounded-lg bg-violet" transition={{ type: "spring", bounce: 0.2, duration: 0.4 }} />}
            <span className="relative">{m === "topic" ? t.topic : t.pdf}</span>
          </button>
        ))}
      </div>

      {mode === "topic" ? (
        <div>
          <textarea className="field min-h-24 resize-none text-base" placeholder={t.topicPh} value={topic} onChange={(e) => setTopic(e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-2">
            {t.examples.map(([exTopic, exAudience]) => (
              <button key={exTopic} onClick={() => { setTopic(exTopic); setAudience(exAudience); }} className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-violet/60 hover:text-ink">
                {exTopic}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line bg-panel-2/60 px-4 py-8 text-center transition hover:border-violet/60">
            {file ? (
              <span className="flex items-center gap-2 text-sm font-semibold"><FileText className="size-5 text-violet" />{file.name}
                <button onClick={(e) => { e.preventDefault(); setFile(null); }} className="rounded p-0.5 hover:bg-line"><X className="size-4" /></button>
              </span>
            ) : (
              <>
                <Upload className="size-6 text-violet" />
                <span className="text-sm font-semibold">{t.drop}</span>
                <span className="text-xs text-muted">{t.dropHint}</span>
              </>
            )}
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <input className="field mt-3" placeholder={t.notePh} value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <span className="label">{t.students}</span>
          <input className="field" placeholder={t.studentsPh} value={audience} onChange={(e) => setAudience(e.target.value)} />
        </div>
        <div>
          <span className="label">{t.language}</span>
          <select className="field" value={language} onChange={(e) => pickLanguage(e.target.value)}>
            {LANGS.map((l) => <option key={l} value={l}>{t.langNames[l]}</option>)}
          </select>
        </div>
        <div>
          <span className="label">{t.voice}</span>
          <select className="field" value={voice} onChange={(e) => setVoice(e.target.value)}>
            {(opts.voices[language] ?? [voice]).map((v) => (
              <option key={v} value={v}>{v.replace(/Neural$/, "").replace(/^(\w\w-\w\w)-(.*)$/, "$2 ($1)")}</option>
            ))}
          </select>
        </div>
        <div>
          <span className="label">{t.length}</span>
          <div className="grid grid-cols-3 gap-2">
            {t.lengths.map(([id, label, hint]) => (
              <button key={id} onClick={() => setLength(id)} className={`rounded-xl border px-2 py-2 text-sm transition ${length === id ? "border-violet bg-violet/15" : "border-line bg-panel-2 hover:border-violet/50"}`}>
                <div className="font-semibold">{label}</div>
                <div className="text-[11px] text-muted">{hint}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">{t.format}</span>
          <div className="grid grid-cols-2 gap-2">
            {([["landscape", Monitor, t.landscape], ["portrait", Smartphone, t.portrait]] as const).map(([id, Icon, label]) => (
              <button key={id} onClick={() => setFormat(id)} className={`flex items-center justify-center gap-2 rounded-xl border px-2 py-3 text-sm font-semibold transition ${format === id ? "border-violet bg-violet/15" : "border-line bg-panel-2 hover:border-violet/50"}`}>
                <Icon className="size-4" />{label}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <span className="label">{t.look}</span>
          <div className="flex gap-2">
            {Object.values(opts.themes).map((th) => (
              <button key={th.name} onClick={() => setTheme(th.name)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm capitalize transition ${theme === th.name ? "border-violet bg-violet/15" : "border-line bg-panel-2 hover:border-violet/50"}`}>
                <span className="flex size-5 overflow-hidden rounded-full border border-white/20" style={{ background: th.bg }}>
                  <span className="m-auto size-2 rounded-full" style={{ background: th.accent }} />
                </span>
                {th.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-panel-2/60 p-3.5 transition hover:border-violet/50">
        <input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} className="mt-1 size-4 accent-[var(--violet)]" />
        <span>
          <span className="flex items-center gap-1.5 text-sm font-semibold"><Brain className="size-4 text-violet" />{t.deep}</span>
          <span className="mt-0.5 block text-xs text-muted">{t.deepHint}</span>
        </span>
      </label>

      {(error || offline) && <p className="mt-4 rounded-xl border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">{error ?? t.offline}</p>}

      <button onClick={submit} disabled={!ready || busy} className="btn-primary mt-6 w-full py-3.5 text-base">
        {busy ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
        {busy ? t.starting : t.create}
      </button>
    </div>
  );
}
