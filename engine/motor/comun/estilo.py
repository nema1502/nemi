"""Tema visual compartido para todos los videos verticales (TikTok / Reels / Shorts).

Canvas: 1080x1920 px mapeado a 9 x 16 unidades Manim.
Zona segura: mantener contenido dentro de x en [-3.8, 3.8] e y en [-5.8, 6.5]
(la UI de TikTok/Reels tapa la franja inferior y el borde derecho).
"""

from pathlib import Path

from manim import *

# ---------- Paletas ----------
BLANCO = "#F5F7FF"
GRIS = "#9AA3B8"
VERDE = "#3DDC84"
ROJO = "#FF5C5C"
AMARILLO = "#FFC94D"
VIOLETA = "#A78BFA"

# Chainlink
CL_AZUL = "#2A5ADA"
CL_AZUL_CLARO = "#75A0FF"
CL_FONDO = "#0B0E1A"

# n8n
N8N_ROSA = "#EA4B71"
N8N_NARANJA = "#FF9E64"
N8N_FONDO = "#160B21"

FUENTE = "Segoe UI"

ANCHO_SEGURO = 7.6  # ancho maximo de cualquier linea de texto

# ---------- Marca: nemaxyz ----------
# NEMA = Nicolas Emir Mejia Agreda. En griego, nêma (νῆμα) = "hilo".
# El isotipo es una N dibujada de UN SOLO TRAZO continuo, con hilo que entra
# por abajo-izquierda y sale por arriba-derecha: lo que entra transformado sale.
NEMA_MARCA = "#B8FF3C"     # verde lima: color de marca, EXCLUSIVO (nunca contenido)
NEMA_TINTA = "#070A0F"     # fondo de marca
REDES = "@nemaxyz"         # <- cambiar aqui cuando definas las redes finales


def marca_nema(alto=1.0, color=NEMA_MARCA, grosor=None):
    """Isotipo: la N de un solo trazo, con hilo de entrada y de salida.

    El grosor se calcula proporcional al tamaño: Manim NO escala el trazo al
    hacer scale_to_fit_height, así que un grosor fijo convierte la marca
    pequeña en un borrón (los huecos internos se cierran).
    """
    if grosor is None:
        # el piso evita que la diagonal quede en 1 px y el antialiasing la lave
        grosor = max(3.0, alto * 4.5)
    # fill_opacity=0 explicito: la N es un trazado ABIERTO y Manim lo rellenaria
    # como si estuviera cerrado, convirtiendola en una mancha
    hilo = VMobject(stroke_color=color, stroke_width=grosor, fill_opacity=0)
    hilo.set_points_as_corners([
        [-1.50, -0.90, 0],   # entra el hilo
        [-0.75, -0.90, 0],
        [-0.75, 0.90, 0],    # N
        [0.75, -0.90, 0],
        [0.75, 0.90, 0],
        [1.50, 0.90, 0],     # sale transformado
    ])
    hilo.scale_to_fit_height(alto)
    return hilo


def logotipo_nema(alto=0.9, color=NEMA_MARCA, color_texto=BLANCO):
    """Isotipo + palabra 'nemaxyz'."""
    iso = marca_nema(alto=alto, color=color)
    palabra = Text("nemaxyz", font=FUENTE, weight=BOLD,
                   font_size=int(alto * 78), color=color_texto)
    return VGroup(iso, palabra).arrange(RIGHT, buff=alto * 0.45)


def marca_agua(escena, color=NEMA_MARCA):
    """Firma discreta arriba a la izquierda, presente todo el video.

    Va arriba a proposito: la franja inferior y el borde derecho los tapa la
    interfaz de TikTok/Reels. No resta segundos al gancho (ver
    METRICAS_CONTENIDO.md: una intro con logo quema los 3 s que deciden todo).
    """
    logo = logotipo_nema(alto=0.42, color=color, color_texto=BLANCO)
    # NUNCA usar set_opacity() sobre el isotipo: activa tambien el relleno y lo
    # convierte en una mancha. Se baja la opacidad por separado.
    iso, palabra = logo
    iso.set_stroke(opacity=0.72)
    iso.set_fill(opacity=0)
    palabra.set_fill(opacity=0.72)
    # y=7.15 deja una banda limpia entre la barra de progreso (7.6) y las
    # etiquetas de seccion (que llegan hasta ~6.7). A 6.85 se tocaban.
    mx, my = borde()
    # en vertical va pegada arriba (la franja de abajo la tapa la interfaz);
    # en horizontal, el mismo margen relativo respecto del borde real
    y = my * 0.894 if es_vertical() else my * 0.90
    logo.move_to([-mx * 0.80 + logo.width / 2, y, 0])
    logo.auditor_ignorar = True   # no se juzga como contenido...
    logo.es_marca_agua = True     # ...pero el auditor vigila que nada la invada
    escena.add(logo)
    return logo


def firma(texto_parte, color=NEMA_MARCA):
    """Bloque de cierre de marca: logotipo + serie + redes."""
    logo = logotipo_nema(alto=0.5, color=color, color_texto=BLANCO)
    parte = Text(texto_parte, font=FUENTE, weight=BOLD, font_size=28,
                 color=GRIS)
    redes = Text(REDES, font=FUENTE, weight=BOLD, font_size=32, color=color)
    return VGroup(logo, parte, redes).arrange(DOWN, buff=0.3)


def configurar_vertical(color_fondo):
    """Formato 9:16 (1080x1920, 30 fps). Llamar a nivel de modulo, antes de la escena."""
    config.pixel_width = 1080
    config.pixel_height = 1920
    config.frame_width = 9.0
    config.frame_height = 16.0
    config.frame_rate = 30
    config.background_color = color_fondo


def configurar_horizontal(color_fondo):
    """Formato 16:9 (1920x1080, 30 fps) para el video largo de YouTube.

    El corto vertical y el largo horizontal no son el mismo producto: el
    vertical se ve con el pulgar encima y el pecho de la pantalla tapado por
    la interfaz; el horizontal se ve entero, muchas veces en televisor. Por eso
    los helpers de marca (marca de agua, firma, barra de progreso) leen la
    orientacion del `config` en vez de llevar coordenadas clavadas.
    """
    config.pixel_width = 1920
    config.pixel_height = 1080
    config.frame_width = 14.222
    config.frame_height = 8.0
    config.frame_rate = 30
    config.background_color = color_fondo


def es_vertical():
    return config.frame_height > config.frame_width


def borde():
    """(medio ancho, medio alto) del cuadro actual."""
    return config.frame_width / 2.0, config.frame_height / 2.0


def ancho_seguro():
    """Ancho maximo de una linea segun la orientacion, no una constante.

    ANCHO_SEGURO=7.6 estaba calculado para el cuadro vertical de 9 unidades.
    En horizontal el cuadro mide 14.2 y ese limite encogeria todos los titulos
    sin motivo, dejandolos ilegibles en un televisor.
    """
    return ANCHO_SEGURO if es_vertical() else config.frame_width * 0.86


# Tamaño de fuente mínimo legible. En horizontal (1 u = 135 px) un 26
# da ~35 px de altura de mayúscula, que es el piso del auditor.
TAMANO_MIN_LEGIBLE = 26.0


def encajar(grupo, ancho=None, alto=None, minimo=TAMANO_MIN_LEGIBLE):
    """Encoge un grupo para que quepa en la zona segura. Nunca lo agranda.

    En horizontal es fácil pasarse: tres columnas con textos de largo distinto
    dan un ancho que no se sabe hasta que se arma. Antes de esto se ajustaban
    los `buff` a ojo y el auditor rechazaba una y otra vez. Acá se arma libre
    y se encaja al final, que es la única forma que no depende del contenido.

    **Pero encoger tiene un límite y hay que verlo.** La primera versión de
    este helper arreglaba la geometría y rompía la legibilidad: el auditor
    pasaba de "se sale del cuadro" a "mide 0.14 u, ilegible", que es peor
    porque no se nota mirando una miniatura. Ahora, si para entrar hubiera que
    dejar algún texto por debajo del mínimo legible, **falla acá** con el
    texto culpable. La solución nunca es encoger más: es escribir menos.
    """
    mx, my = borde()
    ancho = ancho if ancho is not None else mx * 2 * 0.92
    alto = alto if alto is not None else my * 2 * 0.92
    f = min(ancho / max(grupo.width, 1e-6), alto / max(grupo.height, 1e-6), 1.0)
    if f >= 1.0:
        return grupo

    for m in grupo.get_family():
        cadena = getattr(m, "text", None)
        tam = getattr(m, "tamano_efectivo", None)
        if isinstance(cadena, str) and cadena.strip() and tam and tam * f < minimo:
            raise ValueError(
                f"para caber en {ancho:.1f} u habría que encoger al "
                f"{f * 100:.0f} % y «{cadena[:40]}» quedaría en tamaño "
                f"{tam * f:.0f} (mínimo legible {minimo:.0f}). "
                f"Acortar el texto o partir la pantalla en dos.")
    grupo.scale(f)
    for m in grupo.get_family():
        if getattr(m, "tamano_efectivo", None):
            m.tamano_efectivo *= f
    return grupo


def texto(cadena, tamano=56, color=BLANCO, peso=BOLD, max_ancho=None):
    """Texto que jamas se sale de la zona segura: se encoge solo si hace falta.

    Deja anotado `tamano_efectivo`: el tamaño de fuente real despues de
    cualquier encogida. Es LO QUE DECIDE la legibilidad. Medirla por la altura
    de la caja engaña: "correo" no tiene ninguna letra alta y mide 0.21 u
    donde "teléfono", al mismo tamaño, mide 0.29. Juzgar por caja marca como
    ilegible una palabra que se lee perfecto.
    """
    if max_ancho is None:
        max_ancho = ancho_seguro()
    t = Text(cadena, font=FUENTE, font_size=tamano, color=color, weight=peso)
    t.tamano_efectivo = float(tamano)
    if t.width > max_ancho:
        t.scale_to_fit_width(max_ancho)
    return t


def pastilla(cadena, color_borde, tamano=40, color_texto=BLANCO, relleno="#000000"):
    """Etiqueta tipo 'badge' con borde redondeado."""
    t = texto(cadena, tamano=tamano, color=color_texto,
               max_ancho=ancho_seguro() - 0.8)
    caja = RoundedRectangle(
        corner_radius=0.25,
        width=t.width + 0.7,
        height=t.height + 0.5,
        stroke_color=color_borde,
        stroke_width=5,
        fill_color=relleno,
        fill_opacity=0.55,
    )
    return VGroup(caja, t.move_to(caja.get_center()))


def tarjeta(cadena, color_borde, ancho=5.6, alto=1.6, tamano=52):
    """Caja principal con titulo centrado (p. ej. 'BLOCKCHAIN')."""
    caja = RoundedRectangle(
        corner_radius=0.3,
        width=ancho,
        height=alto,
        stroke_color=color_borde,
        stroke_width=7,
        fill_color=color_borde,
        fill_opacity=0.12,
    )
    t = texto(cadena, tamano=tamano, max_ancho=ancho - 0.6)
    return VGroup(caja, t.move_to(caja.get_center()))


def nodo_flujo(inicial, etiqueta, color):
    """Nodo estilo n8n: cuadrado redondeado con inicial grande y etiqueta debajo."""
    caja = RoundedRectangle(
        corner_radius=0.28,
        width=1.5,
        height=1.5,
        stroke_color=color,
        stroke_width=6,
        fill_color=color,
        fill_opacity=0.18,
    )
    ini = texto(inicial, tamano=64, color=color).move_to(caja.get_center())
    etq = texto(etiqueta, tamano=30, color=BLANCO, peso=BOLD)
    etq.next_to(caja, DOWN, buff=0.22)
    return VGroup(caja, ini, etq)


def check_item(cadena, color=VERDE, tamano=40):
    """Linea de checklist: palomita dibujada + texto."""
    palomita = VMobject(stroke_color=color, stroke_width=8)
    palomita.set_points_as_corners([
        [-0.18, 0.02, 0], [-0.05, -0.14, 0], [0.22, 0.18, 0],
    ])
    t = texto(cadena, tamano=tamano, max_ancho=ANCHO_SEGURO - 1.2)
    t.next_to(palomita, RIGHT, buff=0.35)
    grupo = VGroup(palomita, t)
    return grupo


RUTA_LOGOS = Path(__file__).resolve().parent / "logos"
RUTA_ICONOS = Path(__file__).resolve().parent / "iconos"


def logo_svg(nombre, alto=1.6, color=None):
    """Logo SVG oficial (comun/logos/<nombre>.svg) escalado a `alto` unidades.

    Si se pasa `color`, se recolorea (para los SVG monocromos como chainlink y
    n8n). REGLA: todo asset nuevo se verifica visualmente con
    `python auditor/probar_logos.py` ANTES de usarlo en una escena — los SVG
    complejos pueden deformarse (nos pasó con el de Avalanche).
    """
    logo = SVGMobject(str(RUTA_LOGOS / f"{nombre}.svg"))
    logo.scale_to_fit_height(alto)
    if color is not None:
        logo.set_fill(color, opacity=1).set_stroke(width=0)
    return logo


def logo_png(nombre, alto=1.6):
    """Logo PNG oficial (raster exacto, no se puede deformar). Preferirlo para
    logos multicolor o con trazados complejos. Es un ImageMobject: animarlo con
    FadeIn/scale/move_to (DrawBorderThenFill no aplica)."""
    logo = ImageMobject(str(RUTA_LOGOS / f"{nombre}.png"))
    logo.scale_to_fit_height(alto)
    return logo


def icono(nombre, alto=0.7, color=BLANCO):
    """Ícono Font Awesome solid (comun/iconos/<nombre>.svg), monocromo."""
    ic = SVGMobject(str(RUTA_ICONOS / f"{nombre}.svg"))
    ic.scale_to_fit_height(alto)
    ic.set_fill(color, opacity=1).set_stroke(width=0)
    return ic


def pastilla_icono(nombre_icono, cadena, color_borde, tamano=32,
                   color_icono=None):
    """Pastilla con ícono a la izquierda del texto — para que un niño de 5 años
    entienda de un vistazo de qué hablamos."""
    ic = icono(nombre_icono, alto=0.52, color=color_icono or color_borde)
    t = texto(cadena, tamano=tamano)
    fila = VGroup(ic, t).arrange(RIGHT, buff=0.3)
    caja = RoundedRectangle(
        corner_radius=0.25,
        width=fila.width + 0.7,
        height=max(fila.height + 0.45, 0.95),
        stroke_color=color_borde,
        stroke_width=5,
        fill_color="#000000",
        fill_opacity=0.55,
    )
    return VGroup(caja, fila.move_to(caja.get_center()))


def apertura_historia(escena, situacion, giro, color, icono_situacion=None,
                      tamano_situacion=48, tamano_giro=66):
    """Acto 1: ancla el video en una escena cotidiana y luego abre la grieta.

    `situacion` es lo que el espectador ya vivió (lista de líneas), `giro` es
    lo que no cuadra. El objeto cotidiano (icono) entra primero: la imagen
    ancla antes que el texto. Ver NARRATIVA_STORYTELLING.md.

    Devuelve el VGroup completo para hacerle FadeOut al cerrar el acto.
    """
    lineas_sit = VGroup(*[
        texto(l, tamano=tamano_situacion, color=BLANCO) for l in situacion
    ]).arrange(DOWN, buff=0.28)

    lineas_giro = VGroup(*[
        texto(l, tamano=tamano_giro, color=color) for l in giro
    ]).arrange(DOWN, buff=0.28)

    objeto = None
    if icono_situacion:
        objeto = icono(icono_situacion, alto=1.5, color=BLANCO)

    bloque = VGroup(*[m for m in (objeto, lineas_sit, lineas_giro)
                      if m is not None])
    bloque.arrange(DOWN, buff=0.75).move_to([0, 1.2, 0])

    if objeto is not None:
        escena.play(DrawBorderThenFill(objeto), run_time=0.6)
    escena.play(FadeIn(lineas_sit, shift=DOWN * 0.25), run_time=0.7)
    escena.wait(0.5)
    escena.play(FadeIn(lineas_giro, scale=1.2), run_time=0.7)
    escena.wait(1.3)
    return bloque


def _salida_de_caja(mitad, direccion, pad):
    """Distancia desde el centro de una caja hasta su borde en `direccion`."""
    dx, dy = abs(direccion[0]), abs(direccion[1])
    tx = mitad[0] / dx if dx > 1e-6 else 1e9
    ty = mitad[1] / dy if dy > 1e-6 else 1e9
    return min(tx, ty) + pad


def conectar(a, b, color, ancho=4, opacidad=0.65, pad=0.14, flecha=False):
    """Línea (o flecha) que va del BORDE de `a` al BORDE de `b`.

    Nunca queda por dentro de un elemento ni flotando en el aire: calcula la
    intersección exacta de la recta centro-a-centro con la caja de cada uno,
    así que funciona con cajas anchas, altas o mezcladas. Usar SIEMPRE esto
    para conectar dos elementos: los radios fijos o los `buff` a ojo dejan
    muñones flotantes (nos pasó en Avalanche y en Chainlink).
    """
    ca, cb = a.get_center(), b.get_center()
    d = cb - ca
    dist = float(np.linalg.norm(d))
    if dist < 1e-6:
        raise ValueError("conectar(): los dos elementos están en el mismo punto")
    u = d / dist

    ta = _salida_de_caja((a.width / 2, a.height / 2), u, pad)
    tb = _salida_de_caja((b.width / 2, b.height / 2), u, pad)
    if ta + tb >= dist - 0.05:      # las cajas casi se tocan: no cabe conector
        ta = tb = max(0.0, (dist - 0.1) / 2)

    inicio, fin = ca + u * ta, cb - u * tb
    if flecha:
        return Arrow(inicio, fin, buff=0, stroke_color=color,
                     stroke_width=ancho, fill_color=color,
                     max_tip_length_to_length_ratio=0.14)
    return Line(inicio, fin, stroke_color=color, stroke_width=ancho,
                stroke_opacity=opacidad)


def hexagono_chainlink(radio=1.1):
    """Hexagono doble estilo logo de Chainlink."""
    exterior = RegularPolygon(6, radius=radio, stroke_color=CL_AZUL, stroke_width=9)
    interior = RegularPolygon(6, radius=radio * 0.55, stroke_color=CL_AZUL_CLARO,
                              stroke_width=6)
    grupo = VGroup(exterior, interior)
    grupo.rotate(PI / 6)
    return grupo


def barra_progreso(escena, duracion_total, color):
    """Barra fina arriba que avanza durante todo el video (retencion visual)."""
    mx, my = borde()
    y = my * 0.95
    fondo = Line([-mx, y, 0], [mx, y, 0], stroke_color=GRIS,
                 stroke_width=6, stroke_opacity=0.3)
    barra = Line([-mx, y, 0], [-mx + 0.01, y, 0], stroke_color=color,
                 stroke_width=6)
    fondo.auditor_ignorar = True  # decoracion intencional fuera de zona segura
    barra.auditor_ignorar = True
    escena.add(fondo, barra)
    barra.add_updater(
        lambda m, dt: m.put_start_and_end_on(
            [-mx, y, 0],
            [min(mx, m.get_end()[0] + dt * (2 * mx) / duracion_total), y, 0.0],
        )
    )
    return barra
