"use client";

import { FileText, Loader2, Monitor, Smartphone, Sparkles, Upload, X } from "lucide-react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, type Options } from "@/lib/engine";

const LANGS = ["Spanish", "English", "Portuguese"];
const LENGTHS = [
  { id: "short", label: "Short", hint: "~1 min" },
  { id: "standard", label: "Standard", hint: "~2 min" },
  { id: "long", label: "Long", hint: "~3 min" },
];
const EXAMPLES = [
  { topic: "Las partes de un volcán y por qué entra en erupción", audience: "5to de primaria, 10-11 años, Bolivia" },
  { topic: "Fracciones equivalentes con ejemplos de comida", audience: "4to de primaria, 9-10 años" },
  { topic: "Cómo hacen su alimento las plantas: la fotosíntesis", audience: "1ro de secundaria, 12-13 años" },
];

export function CreateForm() {
  const router = useRouter();
  const [opts, setOpts] = useState<Options | null>(null);
  const [mode, setMode] = useState<"topic" | "pdf">("topic");
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [audience, setAudience] = useState("");
  const [language, setLanguage] = useState("Spanish");
  const [voice, setVoice] = useState("es-BO-SofiaNeural");
  const [length, setLength] = useState("short");
  const [format, setFormat] = useState<"landscape" | "portrait">("landscape");
  const [theme, setTheme] = useState("night");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.options().then(setOpts).catch(() => setError("The lesson engine is offline right now. You can still open the example lesson below."));
  }, []);

  const pickLanguage = (l: string) => {
    setLanguage(l);
    const first = opts?.voices[l]?.[0];
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
            <span className="relative">{m === "topic" ? "Topic" : "PDF chapter"}</span>
          </button>
        ))}
      </div>

      {mode === "topic" ? (
        <div>
          <textarea className="field min-h-24 resize-none text-base" placeholder="What should your students learn? e.g. Las partes de un volcán" value={topic} onChange={(e) => setTopic(e.target.value)} />
          <div className="mt-2 flex flex-wrap gap-2">
            {EXAMPLES.map((ex) => (
              <button key={ex.topic} onClick={() => { setTopic(ex.topic); setAudience(ex.audience); }} className="rounded-full border border-line px-3 py-1 text-xs text-muted transition hover:border-violet/60 hover:text-ink">
                {ex.topic}
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
                <span className="text-sm font-semibold">Drop a textbook chapter (PDF)</span>
                <span className="text-xs text-muted">Muse Spark reads text and figures from up to 50 pages</span>
              </>
            )}
            <input type="file" accept="application/pdf" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </label>
          <input className="field mt-3" placeholder="Optional note: which part to focus on" value={topic} onChange={(e) => setTopic(e.target.value)} />
        </div>
      )}

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <span className="label">Students</span>
          <input className="field" placeholder="e.g. 5th grade, 10 to 11 years old, rural school in Bolivia" value={audience} onChange={(e) => setAudience(e.target.value)} />
        </div>
        <div>
          <span className="label">Language</span>
          <select className="field" value={language} onChange={(e) => pickLanguage(e.target.value)}>
            {LANGS.map((l) => <option key={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <span className="label">Voice</span>
          <select className="field" value={voice} onChange={(e) => setVoice(e.target.value)}>
            {(opts?.voices[language] ?? [voice]).map((v) => (
              <option key={v} value={v}>{v.replace(/Neural$/, "").replace(/^(\w\w-\w\w)-(.*)$/, "$2 ($1)")}</option>
            ))}
          </select>
        </div>
        <div>
          <span className="label">Length</span>
          <div className="grid grid-cols-3 gap-2">
            {LENGTHS.map((l) => (
              <button key={l.id} onClick={() => setLength(l.id)} className={`rounded-xl border px-2 py-2 text-sm transition ${length === l.id ? "border-violet bg-violet/15" : "border-line bg-panel-2 hover:border-violet/50"}`}>
                <div className="font-semibold">{l.label}</div>
                <div className="text-[11px] text-muted">{l.hint}</div>
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">Format</span>
          <div className="grid grid-cols-2 gap-2">
            {([["landscape", Monitor, "Classroom 16:9"], ["portrait", Smartphone, "Phone 9:16"]] as const).map(([id, Icon, label]) => (
              <button key={id} onClick={() => setFormat(id)} className={`flex items-center justify-center gap-2 rounded-xl border px-2 py-3 text-sm font-semibold transition ${format === id ? "border-violet bg-violet/15" : "border-line bg-panel-2 hover:border-violet/50"}`}>
                <Icon className="size-4" />{label}
              </button>
            ))}
          </div>
        </div>
        <div className="sm:col-span-2">
          <span className="label">Look</span>
          <div className="flex gap-2">
            {Object.values(opts?.themes ?? {}).map((t) => (
              <button key={t.name} onClick={() => setTheme(t.name)} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-sm capitalize transition ${theme === t.name ? "border-violet bg-violet/15" : "border-line bg-panel-2 hover:border-violet/50"}`}>
                <span className="flex size-5 overflow-hidden rounded-full border border-white/20" style={{ background: t.bg }}>
                  <span className="m-auto size-2 rounded-full" style={{ background: t.accent }} />
                </span>
                {t.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="mt-4 rounded-xl border border-red/40 bg-red/10 px-3 py-2 text-sm text-red">{error}</p>}

      <button onClick={submit} disabled={!ready || busy} className="btn-primary mt-6 w-full py-3.5 text-base">
        {busy ? <Loader2 className="size-5 animate-spin" /> : <Sparkles className="size-5" />}
        {busy ? "Starting the agent…" : "Create lesson"}
      </button>
    </div>
  );
}
