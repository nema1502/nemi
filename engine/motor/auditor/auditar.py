"""Auditor automático de escenas Manim verticales.

Ejecuta la escena SIN renderizar (dry run) y, tras cada animación, revisa el
estado en reposo de todos los mobjects contra las reglas de
MEJORES_PRACTICAS_MANIM.md:

  ERROR  - elemento fuera del cuadro (se corta en pantalla)
  ERROR  - dos textos encimados (solape > 25 % del área del menor)
  AVISO  - elemento fuera de la zona segura (lo tapa la UI de TikTok/Reels)
  AVISO  - texto demasiado pequeño para leerse en celular
  AVISO  - contraste bajo entre el texto y el fondo
  AVISO  - DURACION_TOTAL descalibrada respecto a la duración real

Uso:
    python auditor/auditar.py chainlink/video_01_que_es_chainlink.py QueEsChainlink
    python auditor/auditar.py n8n/video_01_que_es_n8n.py          (todas las escenas)
    python auditor/auditar.py --todos                             (todos los video_*.py)

Sale con código 1 si hay ERRORES (útil para encadenar:  auditar && render).
El reporte se guarda en auditoria/reporte_<Escena>.md.
"""

import argparse
import importlib.util
import inspect
import sys
import warnings
from pathlib import Path

import numpy as np

warnings.filterwarnings("ignore", category=DeprecationWarning)

RAIZ = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(RAIZ))

from manim import (  # noqa: E402
    Arrow, CubicBezier, ImageMobject, Line, Scene, Text, VMobject, config,
)

# Un conector puede ser recto (Line/Arrow) o curvo (CubicBezier). Si solo se
# vigilan los rectos, una curva que atraviesa un texto pasa desapercibida.
CONECTORES = (Line, CubicBezier)
from manim.utils.color import ManimColor  # noqa: E402

# ---------------- Reglas ----------------
# Los limites del cuadro NO son constantes: se leen del `config` que la escena
# fijo al importarse. Si se dejan clavados a 9:16, un video horizontal (una
# charla proyectada, por ejemplo) reporta como "fuera de cuadro" todo lo que
# esta a los costados, y el auditor se vuelve ruido que se aprende a ignorar.
# Estos valores son solo el arranque; calibrar_cuadro() los reemplaza.
LIMITE_X = 4.5          # borde real del cuadro
LIMITE_Y = 8.0
SEGURO_X = 3.95         # zona segura (UI de TikTok/Reels)
SEGURO_Y_SUP = 7.0
SEGURO_Y_INF = -6.3
ALTURA_MIN_TEXTO = 0.23  # ~28 px en 1080x1920: menos ya no se lee en celular
ORIENTACION = "vertical"

# Minimos de legibilidad, en PIXELES (que es lo que de verdad ve el ojo):
# 28 px en un celular a un palmo de la cara; 34 px proyectado, porque hay que
# leerlo desde la ultima fila de la sala.
ALTURA_MIN_PX_VERTICAL = 28
ALTURA_MIN_PX_HORIZONTAL = 34


def calibrar_cuadro():
    """Ajusta limites y zona segura al formato real de la escena.

    Vertical (9:16) -> margenes de la UI de TikTok/Reels, que come mas abajo
    (subtitulos y descripcion) que arriba.
    Horizontal (16:9) -> no hay UI de red social, pero si proyector: se deja
    un 7 % de aire parejo, porque los proyectores recortan bordes y porque en
    la diapositiva el video vive dentro de un marco.
    """
    global LIMITE_X, LIMITE_Y, SEGURO_X, SEGURO_Y_SUP, SEGURO_Y_INF
    global ALTURA_MIN_TEXTO, ORIENTACION

    LIMITE_X = config.frame_width / 2
    LIMITE_Y = config.frame_height / 2
    px_por_unidad = config.pixel_height / config.frame_height

    if config.frame_height >= config.frame_width:
        ORIENTACION = "vertical"
        SEGURO_X = LIMITE_X * 0.878
        SEGURO_Y_SUP = LIMITE_Y * 0.875
        SEGURO_Y_INF = -LIMITE_Y * 0.7875
        ALTURA_MIN_TEXTO = ALTURA_MIN_PX_VERTICAL / px_por_unidad
    else:
        ORIENTACION = "horizontal"
        SEGURO_X = LIMITE_X * 0.93
        SEGURO_Y_SUP = LIMITE_Y * 0.93
        SEGURO_Y_INF = -LIMITE_Y * 0.93
        ALTURA_MIN_TEXTO = ALTURA_MIN_PX_HORIZONTAL / px_por_unidad
SOLAPE_MAX = 0.25        # texto sobre texto: fracción del área del texto menor
# Figura OPACA sobre texto: el umbral tiene que ser mucho más bajo. Una
# pastilla que cruza un texto por una franja fina cubre poca área pero se ve
# fatal — el caso real medía 12.7 % y pasaba con el umbral del 25 %.
OCLUSION_MAX = 0.03
MUNON_MIN = 0.5          # un conector más corto que esto es un muñón
FLECHA_MIN = 0.35        # asta más corta que esto: la punta se la come
HUECO_MAX = 0.3          # separación máxima entre el extremo y el elemento
CERCA_CONECTOR = 1.0     # a más de esto, la línea no se juzga como conector
MARGEN_MARCA = 0.15      # aire mínimo entre el contenido y la marca de agua
TOL = 0.05
CONTRASTE_MIN = 3.0

NIVEL_ERROR = "ERROR"
NIVEL_AVISO = "AVISO"


# ---------------- Utilidades ----------------
def describir(m):
    if isinstance(m, Text):
        contenido = getattr(m, "original_text", "") or getattr(m, "text", "")
        return f'texto "{str(contenido)[:40]}"'
    return type(m).__name__


def es_visible(m):
    try:
        if m.get_fill_opacity() > 0.02:
            return True
    except Exception:
        pass
    try:
        if m.get_stroke_opacity() > 0.02:
            return True
    except Exception:
        return True
    return False


def caja(m):
    return (m.get_left()[0], m.get_right()[0], m.get_bottom()[1], m.get_top()[1])


PUNTUACION = set(" .,:;·-_—/|()[]%$#")


def solo_puntuacion(t):
    contenido = str(getattr(t, "original_text", "") or getattr(t, "text", ""))
    return contenido != "" and all(c in PUNTUACION for c in contenido)


def separacion_entre_cajas(a, b):
    """Distancia entre dos cajas (0 si se tocan o solapan)."""
    ax1, ax2, ay1, ay2 = caja(a)
    bx1, bx2, by1, by2 = caja(b)
    dx = max(bx1 - ax2, ax1 - bx2, 0.0)
    dy = max(by1 - ay2, ay1 - by2, 0.0)
    return float(np.hypot(dx, dy))


def distancia_a_caja(punto, m):
    """Distancia del punto al borde de la caja de `m` (0 si está dentro)."""
    x1, x2, y1, y2 = caja(m)
    dx = max(x1 - punto[0], 0.0, punto[0] - x2)
    dy = max(y1 - punto[1], 0.0, punto[1] - y2)
    return float(np.hypot(dx, dy))


def ancla_mas_cercana(anclas, punto, linea, excluir=None):
    mejor, mejor_d = None, 1e9
    for a in anclas:
        if a is excluir or a in linea.get_family() or linea in a.get_family():
            continue
        d = distancia_a_caja(punto, a)
        if d < mejor_d:
            mejor, mejor_d = a, d
    return mejor, mejor_d


def unidades_visuales(raiz):
    """Texts completos + imágenes + VMobjects sueltos fuera de cualquier Text."""
    textos = [m for m in raiz.get_family() if isinstance(m, Text)]
    imagenes = [m for m in raiz.get_family() if isinstance(m, ImageMobject)]
    dentro_de_texto = {id(sub) for t in textos for sub in t.get_family()}
    otros = [m for m in raiz.family_members_with_points()
             if isinstance(m, VMobject) and id(m) not in dentro_de_texto]
    return ([t for t in textos if t.get_num_points() or t.submobjects]
            + imagenes + otros)


def fraccion_solape(a, b):
    ax1, ax2, ay1, ay2 = caja(a)
    bx1, bx2, by1, by2 = caja(b)
    inter = max(0.0, min(ax2, bx2) - max(ax1, bx1)) * \
        max(0.0, min(ay2, by2) - max(ay1, by1))
    area_menor = min((ax2 - ax1) * (ay2 - ay1), (bx2 - bx1) * (by2 - by1))
    return inter / area_menor if area_menor > 1e-6 else 0.0


def luminancia(color):
    r, g, b = ManimColor(color).to_rgb()

    def lin(c):
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4

    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)


def contraste(c1, c2):
    l1, l2 = sorted((luminancia(c1), luminancia(c2)), reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)


# ---------------- Auditoría ----------------
class Auditoria:
    def __init__(self, nombre):
        self.nombre = nombre
        self.hallazgos = {}   # clave -> dict
        self.animaciones = 0

    def registrar(self, nivel, clave, mensaje, t):
        if clave in self.hallazgos:
            self.hallazgos[clave]["veces"] += 1
        else:
            self.hallazgos[clave] = {
                "nivel": nivel, "mensaje": mensaje,
                "primera_vez": t, "anim": self.animaciones, "veces": 1,
            }

    # -- revisión de un estado en reposo (tras cada self.play / self.wait) --
    def revisar(self, escena, t):
        self.animaciones += 1
        raices = [m for m in escena.mobjects
                  if not getattr(m, "auditor_ignorar", False)]

        # 1) limites del cuadro y zona segura (solo objetos dibujables:
        #    un ValueTracker guarda su valor como "punto" y no es visual).
        #    Los Text se revisan como unidad completa para reportar su contenido
        #    en lugar del nombre del glifo interno.
        for raiz in raices:
            for m in unidades_visuales(raiz):
                if not es_visible(m):
                    continue
                x1, x2, y1, y2 = caja(m)
                d = describir(m)
                if (x1 < -LIMITE_X - TOL or x2 > LIMITE_X + TOL
                        or y1 < -LIMITE_Y - TOL or y2 > LIMITE_Y + TOL):
                    self.registrar(NIVEL_ERROR, ("cuadro", d),
                                   f"{d} se SALE del cuadro "
                                   f"(x [{x1:.2f}, {x2:.2f}], y [{y1:.2f}, {y2:.2f}])", t)
                elif (x1 < -SEGURO_X - TOL or x2 > SEGURO_X + TOL
                        or y1 < SEGURO_Y_INF - TOL and y1 > -LIMITE_Y
                        or y2 > SEGURO_Y_SUP + TOL):
                    self.registrar(NIVEL_AVISO, ("seguro", d),
                                   f"{d} queda fuera de la zona segura "
                                   f"(x [{x1:.2f}, {x2:.2f}], y [{y1:.2f}, {y2:.2f}])", t)

        # 2) textos: tamaño, contraste y solapes
        textos = []
        for raiz in raices:
            for m in raiz.get_family():
                if (isinstance(m, Text) and es_visible(m) and m not in textos
                        and not getattr(m, "auditor_ignorar", False)):
                    textos.append(m)

        for m in textos:
            d = describir(m)
            # la puntuación suelta (".", "·", ":") es baja por naturaleza
            # Se juzga por el TAMAÑO DE FUENTE cuando se conoce, no por la
            # altura de la caja: "correo" no tiene letras altas y mide 0.21 u
            # donde "teléfono", al mismo tamaño, mide 0.29. Por caja se
            # marcaban como ilegibles palabras que se leen perfecto.
            tam = getattr(m, "tamano_efectivo", None)
            if tam is not None:
                minimo_tam = ALTURA_MIN_TEXTO / 0.0106   # medido: 0.0106 u por punto
                if tam < minimo_tam and not solo_puntuacion(m):
                    self.registrar(NIVEL_AVISO, ("tamano", d),
                                   f"{d} está en tamaño {tam:.0f} "
                                   f"(mínimo legible: {minimo_tam:.0f})", t)
            elif 0 < m.height < ALTURA_MIN_TEXTO and not solo_puntuacion(m):
                self.registrar(NIVEL_AVISO, ("tamano", d),
                               f"{d} mide {m.height:.2f} u de alto "
                               f"(mínimo legible: {ALTURA_MIN_TEXTO:.2f})", t)
            try:
                # el color real vive en los glifos, no en el contenedor del Text
                glifos = m.family_members_with_points()
                color_texto = glifos[0].get_fill_color() if glifos else m.get_fill_color()
                ratio = contraste(color_texto, config.background_color)
                if ratio < CONTRASTE_MIN:
                    self.registrar(NIVEL_AVISO, ("contraste", d),
                                   f"{d} tiene contraste {ratio:.1f}:1 con el "
                                   f"fondo (mínimo {CONTRASTE_MIN}:1)", t)
            except Exception:
                pass

        for i, a in enumerate(textos):
            for b in textos[i + 1:]:
                if b in a.get_family() or a in b.get_family():
                    continue
                s = fraccion_solape(a, b)
                if s > SOLAPE_MAX:
                    self.registrar(
                        NIVEL_ERROR,
                        ("solape", describir(a), describir(b)),
                        f"{describir(a)} y {describir(b)} se enciman "
                        f"({s * 100:.0f} % de solape)", t)

        # 2a) figuras OPACAS tapando texto (regla 7.12)
        # El solape texto-texto no basta: una pastilla o tarjeta con relleno
        # cubre lo que hay debajo aunque sus letras no se toquen.
        opacas = []
        for raiz in raices:
            for m in raiz.get_family():
                if isinstance(m, (Text,) + CONECTORES) or not isinstance(m, VMobject):
                    continue
                try:
                    if (m.get_fill_opacity() >= 0.30 and m.width > 0.3
                            and m.height > 0.3):
                        opacas.append(m)
                except Exception:
                    continue

        for txt in textos:          # ojo: `t` es el TIEMPO, no usarlo aquí
            x1, x2, y1, y2 = caja(txt)
            area_texto = max(1e-6, (x2 - x1) * (y2 - y1))
            for caja_op in opacas:
                if caja_op in txt.get_family() or txt in caja_op.get_family():
                    continue
                cx1, cx2, cy1, cy2 = caja(caja_op)
                inter = (max(0.0, min(x2, cx2) - max(x1, cx1))
                         * max(0.0, min(y2, cy2) - max(y1, cy1)))
                if inter <= 0:
                    continue
                cubierto = inter / area_texto
                # si el texto está DENTRO de la figura, son un componente
                # (una pastilla y su etiqueta): eso es correcto
                if cubierto > 0.9:
                    continue
                if cubierto > OCLUSION_MAX:
                    self.registrar(
                        NIVEL_ERROR, ("tapado", describir(txt)),
                        f"{describir(txt)} queda tapado en un "
                        f"{cubierto * 100:.0f} % por una figura con relleno "
                        f"({type(caja_op).__name__}): se ve encimado", t)

        # 2b) nada de contenido puede invadir la marca de agua (regla 7.11)
        marca = next((m for m in escena.mobjects
                      if getattr(m, "es_marca_agua", False)), None)
        if marca is not None:
            for raiz in raices:
                for u in unidades_visuales(raiz):
                    if not es_visible(u) or u.width < 0.2 or u.height < 0.05:
                        continue
                    sep = separacion_entre_cajas(marca, u)
                    if sep < MARGEN_MARCA:
                        self.registrar(
                            NIVEL_ERROR, ("marca", describir(u)),
                            f"{describir(u)} queda a {sep:.2f} u de la marca de "
                            f"agua (mínimo {MARGEN_MARCA}) — bajar el elemento "
                            f"o subir la marca", t)

        # 3) líneas/flechas que atraviesan un texto (regla 7.4 de las prácticas)
        lineas = [m for raiz in raices for m in raiz.get_family()
                  if isinstance(m, CONECTORES)
                  and not getattr(m, "auditor_ignorar", False)]

        # 3b) conectores rotos: muñones cortos o extremos flotando en el aire
        #     (regla 7.7 — el defecto de las L1s de Avalanche)
        anclas = []
        for raiz in raices:
            for m in unidades_visuales(raiz):
                if isinstance(m, CONECTORES) or m.width < 0.3 or m.height < 0.3:
                    continue
                if isinstance(m, (Text, ImageMobject)):
                    anclas.append(m)
                    continue
                try:
                    if m.get_fill_opacity() > 0.05:
                        anclas.append(m)
                except Exception:
                    pass

        for ln in lineas:
            inicio, fin = ln.get_start(), ln.get_end()
            # el elemento del otro extremo se busca EXCLUYENDO el primero: si no,
            # un muñón corto tiene la misma caja cerca en los dos extremos y se
            # colaría sin ser juzgado
            ancla_a, hueco_a = ancla_mas_cercana(anclas, inicio, ln)
            ancla_b, hueco_b = ancla_mas_cercana(anclas, fin, ln, excluir=ancla_a)
            if ancla_a is None or ancla_b is None:
                continue
            if hueco_a > CERCA_CONECTOR or hueco_b > CERCA_CONECTOR:
                continue

            largo = float(np.linalg.norm(fin - inicio))
            # Un muñón es corto Y flotante. Un conector corto pero pegado a sus
            # dos extremos es un enlace compacto legítimo (un mini-flujo de
            # fichas pequeñas), no un defecto.
            # Una FLECHA muy corta es un defecto aunque toque sus dos extremos:
            # la punta se come el asta y no se lee el sentido del flujo. Pasó
            # en ComoEmpezar, donde dos tarjetas quedaron tan pegadas que la
            # flecha del medio medía casi cero y el diagrama parecía dos cajas
            # sueltas. La regla del muñón no lo veía porque exige que además
            # FLOTE, y esta estaba bien pegada.
            if isinstance(ln, Arrow) and largo < FLECHA_MIN:
                self.registrar(
                    NIVEL_ERROR,
                    ("flecha_corta", describir(ancla_a), describir(ancla_b)),
                    f"la flecha entre {describir(ancla_a)} y "
                    f"{describir(ancla_b)} mide {largo:.2f} u: la punta se come "
                    f"el asta y no se ve el sentido — separar los elementos", t)
            elif largo < MUNON_MIN and max(hueco_a, hueco_b) > 0.15:
                self.registrar(
                    NIVEL_ERROR,
                    ("munon", describir(ancla_a), describir(ancla_b)),
                    f"conector entre {describir(ancla_a)} y {describir(ancla_b)} "
                    f"mide solo {largo:.2f} u: es un muñón — usar "
                    f"estilo.conectar()", t)
            elif max(hueco_a, hueco_b) > HUECO_MAX:
                lejos = ancla_a if hueco_a > hueco_b else ancla_b
                self.registrar(
                    NIVEL_ERROR, ("suelto", describir(lejos)),
                    f"un conector queda a {max(hueco_a, hueco_b):.2f} u de "
                    f"{describir(lejos)} (flota en el aire) — usar "
                    f"estilo.conectar()", t)
        for ln in lineas:
            try:
                largo_total = ln.get_length()
                if largo_total < 0.1:
                    continue
                muestras = [ln.point_from_proportion(k / 19) for k in range(20)]
            except Exception:
                continue
            for tx in textos:
                x1, x2, y1, y2 = caja(tx)
                dentro = sum(
                    1 for p in muestras
                    if x1 + 0.02 < p[0] < x2 - 0.02
                    and y1 + 0.02 < p[1] < y2 - 0.02)
                penetracion = largo_total * dentro / 20
                # umbral relativo: una linea que TRAVIESA un texto delgado
                # penetra poco en valor absoluto pero lo cruza entero
                limite = min(0.45, 0.9 * min(x2 - x1, y2 - y1))
                if penetracion > limite:
                    self.registrar(
                        NIVEL_ERROR, ("atraviesa", describir(tx)),
                        f"una línea/flecha atraviesa {describir(tx)} "
                        f"({penetracion:.1f} u dentro del texto)", t)

    # -- salida --
    def errores(self):
        return [h for h in self.hallazgos.values() if h["nivel"] == NIVEL_ERROR]

    def avisos(self):
        return [h for h in self.hallazgos.values() if h["nivel"] == NIVEL_AVISO]

    def escribir_reporte(self, destino):
        destino.parent.mkdir(parents=True, exist_ok=True)
        lineas = [f"# Auditoría — {self.nombre}", ""]
        veredicto = "RECHAZADO ❌" if self.errores() else "APROBADO ✅"
        lineas.append(f"**Veredicto:** {veredicto} · "
                      f"{len(self.errores())} errores, {len(self.avisos())} avisos · "
                      f"{self.animaciones} estados revisados")
        lineas.append("")
        if self.hallazgos:
            lineas.append("| Nivel | Hallazgo | Aparece en | Repeticiones |")
            lineas.append("|---|---|---|---|")
            orden = sorted(self.hallazgos.values(),
                           key=lambda h: (h["nivel"] != NIVEL_ERROR, h["primera_vez"]))
            for h in orden:
                momento = (f"~{h['primera_vez']:.1f} s" if h["primera_vez"] > 0.01
                           else f"animación #{h['anim']}")
                lineas.append(f"| {h['nivel']} | {h['mensaje']} | {momento} "
                              f"| {h['veces']} |")
        else:
            lineas.append("Sin hallazgos. Todo dentro de las reglas.")
        destino.write_text("\n".join(lineas) + "\n", encoding="utf-8")


def cargar_modulo(ruta):
    ruta = Path(ruta).resolve()
    nombre = "auditado_" + ruta.stem
    spec = importlib.util.spec_from_file_location(nombre, ruta)
    modulo = importlib.util.module_from_spec(spec)
    sys.modules[nombre] = modulo
    spec.loader.exec_module(modulo)
    # la escena ya fijo su formato al importarse: recien ahora se puede saber
    # contra que cuadro hay que medir
    calibrar_cuadro()
    return modulo


def escenas_de(modulo):
    return [obj for _, obj in inspect.getmembers(modulo, inspect.isclass)
            if issubclass(obj, Scene) and obj.__module__ == modulo.__name__]


def auditar_escena(modulo, clase):
    aud = Auditoria(clase.__name__)
    original_play, original_wait = Scene.play, Scene.wait

    def _revisar(self):
        try:
            t = float(getattr(self.renderer, "time", 0.0) or 0.0)
        except Exception:
            t = 0.0
        aud.revisar(self, t)

    # se revisa tras cada play Y tras cada wait: una escena puede construirse
    # con add() + wait() y así también queda auditada
    def play_instrumentado(self, *args, **kwargs):
        original_play(self, *args, **kwargs)
        _revisar(self)

    def wait_instrumentado(self, *args, **kwargs):
        original_wait(self, *args, **kwargs)
        _revisar(self)

    Scene.play = play_instrumentado
    Scene.wait = wait_instrumentado
    config.dry_run = True
    config.progress_bar = "none"
    config.verbosity = "ERROR"
    try:
        escena = clase()
        escena.render()
        duracion_real = float(getattr(escena.renderer, "time", 0.0) or 0.0)
    finally:
        Scene.play = original_play
        Scene.wait = original_wait

    declarada = getattr(modulo, "DURACION_TOTAL", None)
    if declarada and duracion_real > 1 and abs(duracion_real - declarada) > 1.5:
        aud.registrar(
            NIVEL_AVISO, ("duracion",),
            f"DURACION_TOTAL={declarada} s pero la escena dura "
            f"{duracion_real:.1f} s — recalibrar la barra de progreso",
            duracion_real)
    return aud


def main():
    parser = argparse.ArgumentParser(description="Auditor de escenas Manim verticales")
    parser.add_argument("archivo", nargs="?", help="ruta del .py con la escena")
    parser.add_argument("escena", nargs="?", help="nombre de la clase (opcional)")
    parser.add_argument("--todos", action="store_true",
                        help="auditar todos los */video_*.py del proyecto")
    args = parser.parse_args()

    objetivos = []
    if args.todos:
        for ruta in sorted(RAIZ.glob("*/video_*.py")):
            objetivos.append((ruta, None))
    elif args.archivo:
        objetivos.append((Path(args.archivo), args.escena))
    else:
        parser.error("indica un archivo o usa --todos")

    hubo_error = False
    for ruta, nombre_escena in objetivos:
        modulo = cargar_modulo(ruta)
        clases = escenas_de(modulo)
        if nombre_escena:
            clases = [c for c in clases if c.__name__ == nombre_escena]
            if not clases:
                print(f"[!] {ruta}: no existe la escena {nombre_escena}")
                hubo_error = True
                continue
        for clase in clases:
            print(f"\n== Auditando {ruta.name} :: {clase.__name__} ==")
            aud = auditar_escena(modulo, clase)
            reporte = RAIZ / "auditoria" / f"reporte_{clase.__name__}.md"
            aud.escribir_reporte(reporte)
            for h in sorted(aud.hallazgos.values(),
                            key=lambda h: h["nivel"] != NIVEL_ERROR):
                print(f"  [{h['nivel']}] {h['mensaje']} (x{h['veces']})")
            estado = "RECHAZADO" if aud.errores() else "APROBADO"
            print(f"  -> {estado}: {len(aud.errores())} errores, "
                  f"{len(aud.avisos())} avisos. Reporte: {reporte.relative_to(RAIZ)}")
            hubo_error = hubo_error or bool(aud.errores())

    sys.exit(1 if hubo_error else 0)


if __name__ == "__main__":
    main()
