"use client";

import { useLang } from "./i18n";

const copy = {
  en: {
    badge: "Beta",
    title: "Your event's launch kit",
    sub: "Bring the logos and the idea. Nemi designs the whole campaign in one style: a 9-post Instagram grid that forms one picture, stories and WhatsApp statuses, a Luma cover, a profile picture and the copy for every network.",
    how: [
      ["Muse Spark", "reads your logos, takes the colors and writes the copy"],
      ["Muse Image", "draws one key visual, with no text"],
      ["SAM 3.1", "cuts out its main character for the profile picture and the stories"],
      ["Remotion", "lays your real logos and crisp text over every format"],
    ],
    name: "Event name", namePh: "Hack Night Santa Cruz",
    date: "Date and time", datePh: "Saturday, November 15, 6 pm",
    place: "Place", placePh: "Santa Cruz de la Sierra, Bolivia",
    community: "Community or technology", communityPh: "AI automation with n8n",
    about: "What happens there", aboutPh: "A night to build AI agents in teams, with mentors, pizza and prizes.",
    logos: "Logos", logosHint: "PNG, JPG or WebP, up to 4: your community, sponsors or the technology. Nemi takes the colors from them.",
    language: "Language",
    create: "Create the kit", creating: "Starting...",
    offline: "The engine is offline right now. Try again in a minute.",
    working: "Nemi is designing your campaign",
    grid: "Instagram grid", gridHint: "9 posts that form one picture on your profile. Post them in order, from post 1 to post 9.",
    story: "Story and WhatsApp status", cover: "Luma cover", avatar: "Profile picture",
    copies: "Copy for every network", copyBtn: "Copy", copied: "Copied",
    export: "Render and download the kit", exporting: "Rendering every format...", download: "Download the kit (.zip)",
    another: "Make another kit",
  },
  es: {
    badge: "Beta",
    title: "El kit de lanzamiento de tu evento",
    sub: "Trae los logos y la idea. Nemi diseña toda la campaña con un mismo estilo: una grilla de 9 publicaciones de Instagram que forma una sola imagen, historias y estados de WhatsApp, portada para Luma, foto de perfil y los textos para cada red.",
    how: [
      ["Muse Spark", "lee tus logos, toma sus colores y escribe los textos"],
      ["Muse Image", "dibuja una imagen principal, sin texto"],
      ["SAM 3.1", "recorta a su protagonista para la foto de perfil y las historias"],
      ["Remotion", "pone tus logos reales y textos nítidos en cada formato"],
    ],
    name: "Nombre del evento", namePh: "Hack Night Santa Cruz",
    date: "Fecha y hora", datePh: "Sábado 15 de noviembre, 18:00",
    place: "Lugar", placePh: "Santa Cruz de la Sierra, Bolivia",
    community: "Comunidad o tecnología", communityPh: "Automatización con IA y n8n",
    about: "De qué se trata", aboutPh: "Una noche para construir agentes de IA en equipo, con mentores, pizza y premios.",
    logos: "Logos", logosHint: "PNG, JPG o WebP, hasta 4: tu comunidad, patrocinadores o la tecnología. Nemi toma los colores de ellos.",
    language: "Idioma",
    create: "Crear el kit", creating: "Arrancando...",
    offline: "El motor no está en línea ahora. Intenta de nuevo en un minuto.",
    working: "Nemi está diseñando tu campaña",
    grid: "Grilla de Instagram", gridHint: "9 publicaciones que forman una sola imagen en tu perfil. Publícalas en orden, de la 1 a la 9.",
    story: "Historia y estado de WhatsApp", cover: "Portada de Luma", avatar: "Foto de perfil",
    copies: "Textos para cada red", copyBtn: "Copiar", copied: "Copiado",
    export: "Renderizar y descargar el kit", exporting: "Renderizando cada formato...", download: "Descargar el kit (.zip)",
    another: "Crear otro kit",
  },
};

export const useEventsCopy = () => copy[useLang().lang];
