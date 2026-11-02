"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Lang = "en" | "es";

const LangCtx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => {
    let saved: string | null = null;
    try {
      saved = localStorage.getItem("nemi-lang");
    } catch {}
    const next = saved === "es" || saved === "en" ? saved : navigator.language.toLowerCase().startsWith("es") ? "es" : "en";
    setLangState(next);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const setLang = (l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem("nemi-lang", l);
    } catch {}
  };
  return <LangCtx.Provider value={{ lang, setLang }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);

export function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex rounded-lg border border-line bg-panel-2 p-0.5 text-xs font-bold">
      {(["es", "en"] as const).map((l) => (
        <button key={l} onClick={() => setLang(l)} className={`rounded-md px-2 py-1 uppercase ${lang === l ? "bg-violet text-[#120f22]" : "text-muted hover:text-ink"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}

/** The example lesson shipped with the site, one per language. */
export const demoFor = (lang: Lang) => (lang === "es" ? "demo" : "demo-en");

export const copy = {
  en: {
    nav: { how: "How it works", classroom: "Classroom", events: "Events", pricing: "Pricing", create: "Create a lesson" },
    hero: {
      pill: "For teachers and their students",
      h1: ["Your chapter, as a lesson video your students ", "finish", "."],
      sub: "Upload a textbook PDF or type a topic. Nemi plans, illustrates, animates and narrates it, and you edit every scene before your class sees it.",
      create: "Create a lesson",
      watch: "Watch an example",
      langs: "Spanish, English and Portuguese. Classroom 16:9 or phone 9:16. Latin American voices, or yours.",
    },
    how: {
      title: "From textbook to video in minutes",
      sub: "A good animated lesson used to take a creator days. Nemi does the heavy part and leaves the decisions to the teacher.",
      steps: [
        ["Bring your material", "A textbook chapter as a PDF, or just a topic. Pick the grade, the language and a voice from your region."],
        ["Nemi makes the lesson", "It plans, reviews, illustrates, animates and narrates a short lesson with quiz pauses. You watch it happen."],
        ["You approve and share", "Edit any scene in the live preview, then send the student link or download the video for your own platform."],
      ],
    },
    make: {
      title: "Make one now",
      sub: "Each step is one of Meta's models doing what it does best, and most steps are checked by another one.",
      models: [
        ["Muse Spark", "reads your chapter, plans the lesson in five acts and checks it against 7 questions before anything is made"],
        ["Muse Image", "draws every illustration in one style, with no garbled text"],
        ["SAM 3.1", "cuts out each part of a diagram so it lights up when the narrator names it"],
        ["Muse Spark and Manim", "write precise animations, audit them and fix their own mistakes"],
        ["Muse Voice Transcribe", "lets you re-record any line in your own voice, with captions"],
      ],
    },
    products: {
      title: "One lesson, every way your class learns",
      sub: "Teach with it in class, send it home with a link, or put it on the platform your school already uses.",
      items: [
        ["Nemi Studio", "Available", "Topic or PDF in, lesson out. Edit any scene, switch the look, record a line in your own voice and export."],
        ["Nemi Classroom", "Beta", "One link per lesson. Students watch on any phone, the video stops at each quiz and waits for their answer. Class results for the teacher come next."],
        ["Your own platform", "MP4 available", "Download the video for the projector, WhatsApp or YouTube. Packages for Google Classroom, Moodle and other LMS are on the way."],
      ],
      student: "See what a student gets: the example lesson stops at its quiz and waits for an answer.",
      studentCta: "Open the student link",
    },
    events: {
      badge: "Beta",
      title: "Nemi for events",
      sub: "Running a hackathon, a meetup or a community chapter? Bring your logos, your colors and the idea. Nemi drafts the whole launch kit in one style, no designer needed.",
      kit: ["A profile picture and an event cover sized for Luma", "A 9-post Instagram grid that forms one big picture", "Stories and WhatsApp statuses in your colors", "Ready-to-post copy for Instagram, X, LinkedIn and WhatsApp"],
      cta: "Make an event kit",
      cover: "Your event cover",
    },
    pricing: {
      title: "Credits or a plan",
      sub: "One credit is one lesson of up to 3 minutes. Nemi is free while in pilot; these are the planned prices.",
      plans: [
        ["Free", "$0", "", ["3 lessons a month", "Student links with quiz pauses", "MP4 with a small Nemi mark"]],
        ["Teacher", "$9", "a month", ["20 lessons a month", "PDF chapters up to 50 pages", "Your own voice", "MP4 without watermark"]],
        ["School", "$4", "per teacher a month", ["Shared credits for the whole school", "Nemi Classroom with quiz results", "LMS export", "Priority rendering"]],
        ["Events", "$29", "per event", ["Launch kit with your logos and colors", "Luma cover and 9-post grid", "Stories, statuses and copy"]],
      ] as [string, string, string, string[]][],
      extra: "Need more lessons in a month? 10 extra credits for $5, no plan change needed.",
    },
    gallery: { title: "Lessons", example: "Example", scenes: "scenes" },
    footer: "Made in Santa Cruz de la Sierra, Bolivia, by Nicolás Mejía Agreda. Built with Meta's Muse models for the Meta Global AI Developer Hackathon 2026.",
    form: {
      topic: "Topic", pdf: "PDF chapter",
      topicPh: "What should your students learn? For example: why volcanoes erupt",
      drop: "Drop a textbook chapter (PDF)", dropHint: "Muse Spark reads text and figures from up to 50 pages",
      notePh: "Optional note: which part to focus on",
      students: "Students", studentsPh: "For example: 5th grade, 10 to 11 years old, rural school",
      language: "Language", voice: "Voice", length: "Length", format: "Format", look: "Look",
      lengths: [["short", "Short", "about 1 min"], ["standard", "Standard", "about 2 min"], ["long", "Long", "about 3 min"]],
      landscape: "Classroom 16:9", portrait: "Phone 9:16",
      deep: "Deep mode with Muse Wonder", deepHint: "Meta's strongest reasoning model reads and plans. Best for long or dense chapters, a little slower.",
      create: "Create lesson", starting: "Starting the agent...",
      offline: "The lesson engine is offline right now. You can still open the example lessons below.",
      langNames: { Spanish: "Spanish", English: "English", Portuguese: "Portuguese" } as Record<string, string>,
      examples: [
        ["Why volcanoes erupt", "5th grade, 10 to 11 years old"],
        ["Equivalent fractions with food examples", "4th grade, 9 to 10 years old"],
        ["How plants make their food: photosynthesis", "7th grade, 12 to 13 years old"],
      ],
    },
  },
  es: {
    nav: { how: "Cómo funciona", classroom: "Classroom", events: "Eventos", pricing: "Precios", create: "Crear una clase" },
    hero: {
      pill: "Para docentes y sus estudiantes",
      h1: ["Tu capítulo, en un video que tus estudiantes ", "sí terminan", "."],
      sub: "Sube un PDF del libro o escribe un tema. Nemi lo planifica, ilustra, anima y narra, y tú editas cada escena antes de que la vea tu clase.",
      create: "Crear una clase",
      watch: "Ver un ejemplo",
      langs: "Español, inglés y portugués. Para el aula en 16:9 o para el celular en 9:16. Voces latinoamericanas, o la tuya.",
    },
    how: {
      title: "Del libro al video en minutos",
      sub: "Una buena clase animada le tomaba días a un creador. Nemi hace la parte pesada y deja las decisiones al docente.",
      steps: [
        ["Trae tu material", "Un capítulo del libro en PDF, o solo un tema. Elige el curso, el idioma y una voz de tu región."],
        ["Nemi arma la clase", "Planifica, revisa, ilustra, anima y narra una clase corta con pausas de preguntas. Lo ves pasar en vivo."],
        ["Tú apruebas y compartes", "Edita cualquier escena en la vista previa y después envía el link a tus estudiantes o descarga el video para tu plataforma."],
      ],
    },
    make: {
      title: "Haz una ahora",
      sub: "Cada paso lo hace uno de los modelos de Meta, en lo que mejor sabe hacer, y casi todos los revisa otro.",
      models: [
        ["Muse Spark", "lee tu capítulo, planifica la clase en cinco actos y la revisa con 7 preguntas antes de producir nada"],
        ["Muse Image", "dibuja cada ilustración con un mismo estilo, sin letras deformadas"],
        ["SAM 3.1", "recorta cada parte de un diagrama para que se ilumine cuando la voz la nombra"],
        ["Muse Spark y Manim", "escriben animaciones precisas, las auditan y corrigen sus propios errores"],
        ["Muse Voice Transcribe", "te deja regrabar cualquier frase con tu propia voz, con subtítulos"],
      ],
    },
    products: {
      title: "Una clase, todas las formas de aprender",
      sub: "Úsala en el aula, mándala a casa con un link o súbela a la plataforma que ya usa tu colegio.",
      items: [
        ["Nemi Studio", "Disponible", "Tema o PDF de entrada, clase de salida. Edita cualquier escena, cambia el estilo, graba una frase con tu voz y exporta."],
        ["Nemi Classroom", "Beta", "Un link por clase. Tus estudiantes la ven en cualquier celular, el video se detiene en cada pregunta y espera su respuesta. Pronto, los resultados de la clase para el docente."],
        ["Tu propia plataforma", "MP4 disponible", "Descarga el video para el proyector, WhatsApp o YouTube. Pronto, paquetes para Google Classroom, Moodle y otros LMS."],
      ],
      student: "Mira lo que recibe un estudiante: la clase de ejemplo se detiene en su pregunta y espera la respuesta.",
      studentCta: "Abrir el link de estudiante",
    },
    events: {
      badge: "Beta",
      title: "Nemi para eventos",
      sub: "¿Organizas una hackathon, un meetup o un capítulo de comunidad? Trae tus logos, tus colores y la idea. Nemi prepara todo el kit de lanzamiento con un mismo estilo, sin necesidad de diseñador.",
      kit: ["Foto de perfil y portada con el tamaño de Luma", "Una grilla de 9 publicaciones de Instagram que forma una sola imagen", "Historias y estados de WhatsApp con tus colores", "Textos listos para Instagram, X, LinkedIn y WhatsApp"],
      cta: "Crear un kit de evento",
      cover: "Tu portada",
    },
    pricing: {
      title: "Créditos o un plan",
      sub: "Un crédito es una clase de hasta 3 minutos. Nemi es gratis durante el piloto; estos son los precios planeados.",
      plans: [
        ["Gratis", "$0", "", ["3 clases al mes", "Links para estudiantes con preguntas", "MP4 con una pequeña marca de Nemi"]],
        ["Docente", "$9", "al mes", ["20 clases al mes", "Capítulos en PDF de hasta 50 páginas", "Tu propia voz", "MP4 sin marca de agua"]],
        ["Colegio", "$4", "por docente al mes", ["Créditos compartidos para todo el colegio", "Nemi Classroom con resultados", "Exportación a LMS", "Render prioritario"]],
        ["Eventos", "$29", "por evento", ["Kit de lanzamiento con tus logos y colores", "Portada para Luma y grilla de 9 publicaciones", "Historias, estados y textos"]],
      ] as [string, string, string, string[]][],
      extra: "¿Necesitas más clases en un mes? 10 créditos extra por $5, sin cambiar de plan.",
    },
    gallery: { title: "Clases", example: "Ejemplo", scenes: "escenas" },
    footer: "Hecho en Santa Cruz de la Sierra, Bolivia, por Nicolás Mejía Agreda. Construido con los modelos Muse de Meta para la Meta Global AI Developer Hackathon 2026.",
    form: {
      topic: "Tema", pdf: "Capítulo en PDF",
      topicPh: "¿Qué deben aprender tus estudiantes? Por ejemplo: las partes de un volcán",
      drop: "Suelta un capítulo del libro (PDF)", dropHint: "Muse Spark lee texto y figuras de hasta 50 páginas",
      notePh: "Nota opcional: en qué parte enfocarse",
      students: "Estudiantes", studentsPh: "Por ejemplo: 5to de primaria, 10 a 11 años, escuela rural",
      language: "Idioma", voice: "Voz", length: "Duración", format: "Formato", look: "Estilo",
      lengths: [["short", "Corta", "1 min aprox."], ["standard", "Normal", "2 min aprox."], ["long", "Larga", "3 min aprox."]],
      landscape: "Aula 16:9", portrait: "Celular 9:16",
      deep: "Modo profundo con Muse Wonder", deepHint: "El modelo de razonamiento más fuerte de Meta lee y planifica. Ideal para capítulos largos o densos, un poco más lento.",
      create: "Crear clase", starting: "Arrancando el agente...",
      offline: "El motor de clases no está en línea ahora. Igual puedes abrir las clases de ejemplo de abajo.",
      langNames: { Spanish: "Español", English: "Inglés", Portuguese: "Portugués" } as Record<string, string>,
      examples: [
        ["Las partes de un volcán y por qué entra en erupción", "5to de primaria, 10 a 11 años, Bolivia"],
        ["Fracciones equivalentes con ejemplos de comida", "4to de primaria, 9 a 10 años"],
        ["Cómo hacen su alimento las plantas: la fotosíntesis", "1ro de secundaria, 12 a 13 años"],
      ],
    },
  },
} as const;

export const useCopy = () => copy[useLang().lang];
