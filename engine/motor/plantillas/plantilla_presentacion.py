"""Plantilla HORIZONTAL 16:9 — para presentaciones y video largo de YouTube.

Copiar este archivo, renombrar la clase y escribir las láminas.

    python -m manim render plantillas/plantilla_presentacion.py MiPresentacion

Sale un MP4 de 1920x1080 que se puede incrustar en PowerPoint, Keynote o
Google Slides, o reproducir a pantalla completa como si fuera la presentación.

Lo que hay que saber del cuadro horizontal (distinto del vertical):

- El cuadro mide 14.222 x 8 unidades. Zona segura: x entre -6.6 y 6.6,
  y entre -3.7 y 3.7.
- La marca de agua vive en y≈3.6. Ningún título pasa de y=2.75.
- Tres columnas de texto NO entran sin volverse ilegibles. Para comparar
  cosas con frases, usar FILAS (ver `tabla()` abajo). Columnas solo con
  textos de menos de 22 caracteres.
- Los bloques anchos se arman libres y se cierran con `encajar()`, que falla
  si para caber tuviera que dejar texto ilegible. Es a propósito: encoger en
  silencio cambia "se sale del cuadro" por "no se lee", que es peor.
- Toda flecha creada con `conectar()` hay que GUARDARLA para poder apagarla.
  Crearla dentro de un `self.play(...)` sin referencia la deja en pantalla el
  resto del video.

Antes de dar por buena una lámina:

    python auditor/auditar.py plantillas/plantilla_presentacion.py MiPresentacion
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from manim import *
from comun.estilo import (
    AMARILLO, BLANCO, GRIS, ROJO, VERDE, barra_progreso, conectar,
    configurar_horizontal, encajar, firma, icono, marca_agua, pastilla,
    tarjeta, texto,
)

# Paleta de la presentación: máximo 3 acentos además de blanco y gris
ACENTO = "#A78BFA"
ACENTO_2 = "#5EE7DF"
FONDO = "#0C0A1A"

configurar_horizontal(FONDO)

DURACION_TOTAL = 37.9   # medida por el auditor: se pone acá y se vuelve a auditar

TIT = 64        # título de lámina
IDEA = 46       # la idea de la lámina
APOYO = 32      # texto de apoyo
ETIQ = 30       # etiquetas dentro de cajas (mínimo legible: 26)

Y_TITULO = 2.75   # más arriba invade la marca de agua
Y_PIE = -3.05     # más abajo se sale del cuadro


def tabla(datos, x_titulo=-6.2, x_desc=-2.4, y0=1.6, dy=1.15, tam_tit=40):
    """Filas de «título de color | descripción», alineadas a la izquierda.

    Es la forma correcta de comparar cosas en 16:9: el cuadro tiene ancho de
    sobra y poco alto. `datos` es una lista de (titulo, descripcion, color).
    """
    filas = []
    for i, (tit, desc, col) in enumerate(datos):
        t = texto(tit, tamano=tam_tit, color=col)
        d = texto(desc, tamano=APOYO, color=BLANCO)
        y = y0 - i * dy
        t.move_to([x_titulo + t.width / 2, y, 0])
        d.move_to([x_desc + d.width / 2, y, 0])
        filas.append(VGroup(t, d))
    return VGroup(*filas)


class MiPresentacion(Scene):
    def construct(self):
        barra_progreso(self, DURACION_TOTAL, ACENTO)
        marca_agua(self)
        self.lamina_titulo()
        self.lamina_comparacion()
        self.lamina_diagrama()
        self.lamina_cierre()

    # ------------------------------------------------ lámina de apertura
    def lamina_titulo(self):
        bloque = VGroup(
            texto("El título de la charla", tamano=76),
            texto("y la promesa concreta en una línea", tamano=IDEA,
                  color=GRIS),
        ).arrange(DOWN, buff=0.45)
        encajar(bloque).move_to(ORIGIN)
        self.play(FadeIn(bloque[0], shift=UP * 0.25), run_time=1.0)
        self.play(FadeIn(bloque[1]), run_time=0.8)
        self.wait(2.5)
        self.play(FadeOut(bloque), run_time=0.6)

    # ------------------------------------------------ comparar en FILAS
    def lamina_comparacion(self):
        titulo = texto("Tres cosas que conviene no confundir", tamano=IDEA)
        titulo.move_to([0, Y_TITULO, 0])
        self.play(FadeIn(titulo, shift=DOWN * 0.2), run_time=0.8)

        filas = tabla([
            ("PRIMERO", "qué es, dicho sin jerga y en una frase", ACENTO_2),
            ("SEGUNDO", "en qué se diferencia de lo anterior", ACENTO),
            ("TERCERO", "y por qué a vos te importa hoy", AMARILLO),
        ], y0=1.1, dy=1.25)

        for f in filas:
            self.play(FadeIn(f, shift=UP * 0.2), run_time=0.9)
            self.wait(1.8)

        remate = texto("El remate honesto: lo que esto NO resuelve.",
                       tamano=APOYO, color=GRIS)
        encajar(remate, ancho=12.4).move_to([0, Y_PIE, 0])
        self.play(Write(remate), run_time=1.2)
        self.wait(2.5)
        self.play(FadeOut(VGroup(titulo, filas, remate)), run_time=0.6)

    # ------------------------------------------------ diagrama con flechas
    def lamina_diagrama(self):
        titulo = texto("Cómo funciona, en tres pasos", tamano=IDEA)
        titulo.move_to([0, Y_TITULO, 0])
        self.play(FadeIn(titulo, shift=DOWN * 0.2), run_time=0.8)

        pasos = VGroup(*[
            tarjeta(t, c, ancho=3.4, alto=1.4, tamano=40)
            for t, c in (("ENTRA", ACENTO_2), ("PASA", ACENTO),
                         ("SALE", VERDE))
        ])
        # buff generoso: con poco espacio la flecha queda tan corta que la
        # punta se come el asta y el auditor la rechaza
        pasos.arrange(RIGHT, buff=1.2)
        encajar(pasos, ancho=12.6).move_to([0, 0.5, 0])

        flechas = VGroup()          # GUARDARLAS para poder apagarlas después
        for i, p in enumerate(pasos):
            self.play(FadeIn(p, scale=1.08), run_time=0.7)
            if i:
                f = conectar(pasos[i - 1], p, GRIS, ancho=3, flecha=True)
                flechas.add(f)
                self.play(GrowArrow(f), run_time=0.45)
            self.wait(1.2)

        nota = texto("Y el detalle que casi nadie cuenta va acá.",
                     tamano=APOYO, color=AMARILLO)
        encajar(nota, ancho=12.4).move_to([0, -2.2, 0])
        self.play(FadeIn(nota, shift=UP * 0.2), run_time=0.9)
        self.wait(2.5)
        self.play(FadeOut(VGroup(titulo, pasos, flechas, nota)), run_time=0.6)

    # ------------------------------------------------ cierre
    def lamina_cierre(self):
        cierre = VGroup(
            texto("La frase que querés que se lleven.", tamano=62),
            texto("Corta, y que contradiga lo que creían.", tamano=IDEA,
                  color=AMARILLO),
        ).arrange(DOWN, buff=0.4)
        encajar(cierre).move_to([0, 1.0, 0])
        self.play(FadeIn(cierre[0], shift=UP * 0.2), run_time=1.0)
        self.play(FadeIn(cierre[1], scale=1.1), run_time=0.9)
        self.wait(2.5)

        parte = firma("tu serie · tu charla")
        parte.move_to([0, -2.6, 0])
        self.play(FadeIn(parte), run_time=0.7)
        self.wait(2.5)
        self.play(*[FadeOut(m) for m in self.mobjects], run_time=0.8)
