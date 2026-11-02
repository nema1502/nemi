"use client";

import type { Scene } from "@nemi/video";
import { useLang } from "./i18n";

type Kind = Scene["kind"];

const copy = {
  en: {
    example: "Example lesson, read-only",
    studentLink: "Student link",
    switchFormat: "Switch format",
    guide: "Guide",
    themes: { night: "Night", chalk: "Chalk", paper: "Paper" } as Record<string, string>,
    tabs: { agent: "Agent", scenes: "Scenes" },
    objectives: "Learning objectives",
    status: {
      error: "Error", rendering: "Rendering MP4", finishing: "Finishing scenes", ready: "Ready",
      queued: "Queued", reading: "Reading", planning: "Planning", reviewing: "Reviewing", producing: "Producing",
    } as Record<string, string>,
    export: "Export MP4", reexport: "Re-export",
    review: {
      watching: "Muse Spark is watching the whole video, picture and sound",
      watched: "Muse Spark watched the video",
      history: "Score history",
      again: "Watch again",
      fixing: "Muse Spark is fixing its notes, rendering again and watching the new version",
      canFix: "Muse Spark can fix these notes itself, render again and watch the result.",
      fix: "Let Muse Spark fix these",
      works: "What works",
    },
    class: {
      title: "Class results",
      students: (n: number) => `${n} ${n === 1 ? "student" : "students"}`,
      empty: "Share the student link. Each student's quiz answers show up here as they watch.",
      wrong: "Most common wrong answer:",
      insight: "Muse Spark on what to reteach",
      warmup: "Open tomorrow with:",
      again: "Read the results again",
      ask: "What should I reteach?",
    },
    scene: {
      kinds: {
        hook: "Hook", concept: "Concept", image: "Illustration", diagram: "Diagram with SAM 3.1",
        formula: "Formula in LaTeX", manim: "Manim animation", quiz: "Quiz", summary: "Summary",
      } as Record<Kind, string>,
      yourVoiceBadge: "YOUR VOICE", yourVoice: "your voice", voicing: "voicing...",
      title: "Title", narration: "Narration", lines: "On-screen lines", latex: "LaTeX steps (one per line)",
      manim: "What the animation shows", prompt: "Illustration prompt",
      question: "Question", explanation: "Explanation after the answer",
      save: "Save", revoice: " and re-voice", redraw: "Redraw", reanimate: "Re-animate",
      finding: "Muse Spark and SAM 3.1 are finding the parts...",
      cutOut: (n: number, of: number) => `SAM 3.1 cut out ${n}/${of} parts`,
      manimSteps: "Write, audit, repair", vision: "Vision check", pass: (n: number) => `Auditor pass ${n}`,
      issues: (n: number) => `${n} ${n === 1 ? "issue" : "issues"}, repaired`, looksRight: "looks right", clean: "clean",
    },
    recorder: {
      recording: (s: number) => `Recording ${s}s. Read this:`, stop: "Stop",
      listening: "Muse Voice Transcribe is listening...", record: "Record in my voice",
    },
    agent: {
      steps: {
        read: "Reading", plan: "Planner", think: "thinking", review: "Review", image: "Muse Image", sam: "SAM 3.1",
        manim: "Manim agent", voice: "Voice", render: "Remotion", watch: "Muse Spark", fix: "Fixing", class: "Classroom",
        done: "Done", error: "Problem",
      } as Record<string, string>,
      draft: (ok: number, of: number) => `First-draft review: ${ok}/${of} questions passed`,
      facts: (n: number) => `, ${n} fact ${n === 1 ? "issue" : "issues"} fixed`,
      wrong: "Something went wrong", starting: "Starting...", reading: (name: string) => `Reading ${name}`,
    },
    tour: {
      welcome: "Welcome to the studio",
      of: (i: number, n: number) => `${i} of ${n}`,
      next: "Next", back: "Back", done: "Got it", skip: "Skip",
      steps: [
        ["player", "Your lesson, live", "Press play. This is the real lesson, and it updates as soon as you change something."],
        ["scenes", "Edit any scene", "Open Scenes to change the words, redraw a picture or record a line in your own voice."],
        ["export", "Export, and Muse Spark watches it", "Export the MP4 and Muse Spark watches the whole video, leaves notes pinned to the minute and can fix them itself."],
        ["share", "Share it with your students", "The student link plays on any phone and stops at each question. Their answers show up in Class results, with what to reteach."],
      ] as [string, string, string][],
    },
  },
  es: {
    example: "Clase de ejemplo, solo lectura",
    studentLink: "Link de estudiante",
    switchFormat: "Cambiar formato",
    guide: "Guía",
    themes: { night: "Noche", chalk: "Pizarra", paper: "Papel" } as Record<string, string>,
    tabs: { agent: "Agente", scenes: "Escenas" },
    objectives: "Objetivos de aprendizaje",
    status: {
      error: "Error", rendering: "Creando el MP4", finishing: "Terminando escenas", ready: "Lista",
      queued: "En cola", reading: "Leyendo", planning: "Planificando", reviewing: "Revisando", producing: "Produciendo",
    } as Record<string, string>,
    export: "Exportar MP4", reexport: "Volver a exportar",
    review: {
      watching: "Muse Spark está mirando todo el video, imagen y sonido",
      watched: "Muse Spark miró el video",
      history: "Historial de notas",
      again: "Mirar de nuevo",
      fixing: "Muse Spark está corrigiendo sus notas, volviendo a renderizar y mirando la nueva versión",
      canFix: "Muse Spark puede corregir estas notas por su cuenta, volver a renderizar y mirar el resultado.",
      fix: "Que Muse Spark las corrija",
      works: "Lo que funciona",
    },
    class: {
      title: "Resultados de la clase",
      students: (n: number) => `${n} ${n === 1 ? "estudiante" : "estudiantes"}`,
      empty: "Comparte el link de estudiante. Las respuestas de cada estudiante aparecen aquí mientras ven la clase.",
      wrong: "Respuesta incorrecta más común:",
      insight: "Muse Spark: qué reforzar",
      warmup: "Para empezar mañana:",
      again: "Leer de nuevo los resultados",
      ask: "¿Qué debería reforzar?",
    },
    scene: {
      kinds: {
        hook: "Gancho", concept: "Concepto", image: "Ilustración", diagram: "Diagrama con SAM 3.1",
        formula: "Fórmula en LaTeX", manim: "Animación Manim", quiz: "Pregunta", summary: "Resumen",
      } as Record<Kind, string>,
      yourVoiceBadge: "TU VOZ", yourVoice: "tu voz", voicing: "narrando...",
      title: "Título", narration: "Narración", lines: "Textos en pantalla", latex: "Pasos en LaTeX (uno por línea)",
      manim: "Qué muestra la animación", prompt: "Descripción de la ilustración",
      question: "Pregunta", explanation: "Explicación después de responder",
      save: "Guardar", revoice: " y volver a narrar", redraw: "Redibujar", reanimate: "Volver a animar",
      finding: "Muse Spark y SAM 3.1 están buscando las partes...",
      cutOut: (n: number, of: number) => `SAM 3.1 recortó ${n} de ${of} partes`,
      manimSteps: "Escribir, auditar, reparar", vision: "Revisión visual", pass: (n: number) => `Pasada ${n} del auditor`,
      issues: (n: number) => `${n} ${n === 1 ? "problema reparado" : "problemas reparados"}`, looksRight: "se ve bien", clean: "sin errores",
    },
    recorder: {
      recording: (s: number) => `Grabando ${s}s. Lee esto:`, stop: "Detener",
      listening: "Muse Voice Transcribe está escuchando...", record: "Grabar con mi voz",
    },
    agent: {
      steps: {
        read: "Lectura", plan: "Plan", think: "pensando", review: "Revisión", image: "Muse Image", sam: "SAM 3.1",
        manim: "Agente Manim", voice: "Voz", render: "Remotion", watch: "Muse Spark", fix: "Corrección", class: "Classroom",
        done: "Listo", error: "Problema",
      } as Record<string, string>,
      draft: (ok: number, of: number) => `Revisión del primer borrador: ${ok} de ${of} preguntas aprobadas`,
      facts: (n: number) => `, ${n} ${n === 1 ? "error de datos corregido" : "errores de datos corregidos"}`,
      wrong: "Algo salió mal", starting: "Arrancando...", reading: (name: string) => `Leyendo ${name}`,
    },
    tour: {
      welcome: "Te damos la bienvenida al estudio",
      of: (i: number, n: number) => `${i} de ${n}`,
      next: "Siguiente", back: "Atrás", done: "Entendido", skip: "Saltar",
      steps: [
        ["player", "Tu clase, en vivo", "Dale play. Esta es la clase real y se actualiza apenas cambias algo."],
        ["scenes", "Edita cualquier escena", "En Escenas cambias los textos, redibujas una imagen o grabas una frase con tu propia voz."],
        ["export", "Exporta y Muse Spark la mira", "Exporta el MP4 y Muse Spark mira todo el video, deja notas con el minuto exacto y puede corregirlas por su cuenta."],
        ["share", "Compártela con tus estudiantes", "El link de estudiante funciona en cualquier celular y se detiene en cada pregunta. Sus respuestas aparecen en Resultados de la clase, con qué reforzar."],
      ] as [string, string, string][],
    },
  },
};

export const useStudioCopy = () => copy[useLang().lang];

/** What the student sees follows the lesson's language, not the site's. */
const student = {
  Spanish: {
    turn: "Tu turno", anonymous: "Estudiante", correct: "¡Correcto!", almost: "Casi. Mira por qué.",
    name: "Tu nombre", namePh: "Para que tu profe vea tus respuestas",
    stops: (n: number) => `El video se detiene ${n === 1 ? "una vez" : `${n} veces`} para hacerte una pregunta.`,
    start: "Dale play. Cuando llegue una pregunta, el video te espera.",
  },
  English: {
    turn: "Your turn", anonymous: "Student", correct: "Correct!", almost: "Not quite. Watch why.",
    name: "Your name", namePh: "So your teacher sees your answers",
    stops: (n: number) => `The video stops ${n === 1 ? "once" : `${n} times`} to ask you a question.`,
    start: "Press play. When a question comes up, the video waits for you.",
  },
  Portuguese: {
    turn: "Sua vez", anonymous: "Aluno", correct: "Correto!", almost: "Quase. Veja por quê.",
    name: "Seu nome", namePh: "Para seu professor ver suas respostas",
    stops: (n: number) => `O vídeo para ${n === 1 ? "uma vez" : `${n} vezes`} para te fazer uma pergunta.`,
    start: "Aperte o play. Quando chegar uma pergunta, o vídeo espera por você.",
  },
};

export const studentCopy = (language: string) => student[language as keyof typeof student] ?? student.English;
