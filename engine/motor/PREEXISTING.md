# Pre-existing code — not built during the hackathon

This folder holds the parts of **nemaxyz-motor** that Nemi uses. nemaxyz-motor is
a Manim animation engine Nicolás Mejía Agreda wrote before the Meta Global AI
Developer Hackathon for his own educational videos. These files are copied
**unchanged** so Nemi can use them as a library.

| | |
|---|---|
| Source | private repo `nema1502/nemaxyz-motor` |
| Commit | `2195bd40dc5a6b0564c0e7a0327079c0076ab16c` |
| Date | 2026-09-03 (before the hackathon started on 2026-10-26) |
| Imported in | the first commit of this repository |

Only what Nemi needs was imported:

| File | How Nemi uses it |
|---|---|
| `comun/estilo.py`, `comun/iconos/` | Style helpers and icons the Manim agent writes its scenes with |
| `plantillas/plantilla_presentacion.py` | Reference scene shown to the Manim agent |
| `auditor/auditar.py` | Geometry auditor that dry-runs each generated scene |
| `MEJORES_PRACTICAS_MANIM.md` | Manim rules given to the Manim agent |
| `NARRATIVA_STORYTELLING.md`, `PEDAGOGIA_EJEMPLOS.md`, `LISTA_7_PREGUNTAS.md` | Teaching criteria given to the lesson planner and reviewer |

**Everything outside `engine/motor/` was written during the hackathon.** Any
later change inside this folder appears as its own commit, so
`git log -- engine/motor` shows exactly what was touched and when.
