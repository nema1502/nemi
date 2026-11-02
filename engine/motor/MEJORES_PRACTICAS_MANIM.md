# Mejores prácticas de Manim para videos verticales (TikTok / Reels / Shorts)

Reglas de este estudio de contenido. **Toda escena nueva debe cumplirlas** y pasar el
auditor (`python auditor/auditar.py <archivo> <Escena>`) antes del render final.
Escritas para que cualquier persona o modelo pueda producir al mismo nivel.

---

## 1. Formato vertical

- Resolución: **1080x1920 px, 30 fps**, mapeada a un canvas de **9 x 16 unidades**.
- Nunca configurar la resolución con banderas de CLI: se incrusta en la escena
  llamando `configurar_vertical(color_fondo)` de `comun/estilo.py` a nivel de módulo.
  Así el render es idéntico se ejecute como se ejecute.
- 1 unidad = 120 px. Útil para razonar tamaños: un texto de 0.4 unidades de alto
  son 48 px en pantalla de celular — legible; 0.2 unidades ya es dudoso.

## 2. Zonas seguras (la regla más importante)

```
 y=+8.0 ─────────────── borde real del cuadro
 y=+7.0 ─────────────── límite seguro superior (arriba: reloj/estado del teléfono)
        │   CONTENIDO   │
 y=-6.3 ─────────────── límite seguro inferior (abajo: caption + botones de TikTok)
 y=-8.0 ─────────────── borde real del cuadro

 x: contenido entre -3.95 y +3.95 (el borde derecho lo tapan los botones de like/share)
```

- **Texto y contenido importante:** `x ∈ [-3.8, 3.8]`, `y ∈ [-5.8, 6.5]`.
- Decoración (barra de progreso) puede vivir hasta y=7.6, marcada con
  `mobject.auditor_ignorar = True` para que el auditor no la reporte.
- Elementos centrados en x=0 siempre que sea posible: el ojo del espectador
  vive en el centro de la pantalla en formato vertical.

## 3. Texto

- **Usar siempre `estilo.texto(...)`** — nunca `Text(...)` directo. El helper
  encoge automáticamente cualquier línea que exceda el ancho seguro (7.6 u).
- Fuente: **Segoe UI Bold** (nativa de Windows, gruesa, legible en celular).
- Máximo **2 líneas por idea**; si necesitas más, es otra pantalla.
- Tamaños de referencia (con canvas de 16 u de alto):
  - Gancho / titular: 70–90
  - Subtítulo / idea principal: 48–58
  - Texto de apoyo: 38–44
  - Nota pequeña ("Parte 1 · ..."): 30–34 (mínimo absoluto: que mida ≥ 0.23 u de alto)
- **PROHIBIDO usar emojis dentro de las escenas**: Pango en Windows los renderiza
  mal o en blanco y negro. Los íconos se dibujan con formas (ver `estilo.py`:
  ojo, palomitas, nodos, hexágonos).
- Palabra clave de cada frase en color de acento (AMARILLO o el color de la marca).

## 4. Color y contraste

- Fondo oscuro de marca por serie (Chainlink `#0B0E1A`, n8n `#160B21`) — el fondo
  oscuro hace brillar los acentos y cansa menos en celular.
- Texto principal en BLANCO `#F5F7FF`; secundario en GRIS `#9AA3B8` (nunca para
  la idea principal).
- Máximo **3 colores de acento por video**. Definir la paleta en `comun/estilo.py`,
  no inventar colores sueltos en las escenas.
- Contraste texto/fondo mínimo 4.5:1 (el auditor avisa por debajo de 3:1).

## 5. Composición y ritmo

- **Una idea por pantalla.** Si dos mensajes conviven, uno sobra.
- Estructura probada (ver videos 01):
  1. **Hook** (0–4 s): pregunta o afirmación fuerte, texto gigante. Se decide el scroll aquí.
  2. **Problema / contexto** (~8 s)
  3. **Solución / explicación** (~10–12 s) — el corazón, con la animación más rica
  4. **Prueba / dato de autoridad** (~7 s): números, marcas, contadores
  5. **Cierre + CTA** (~6 s): resumen de una frase + "sígueme porque…" con razón concreta
- `run_time` cortos: 0.5–1.2 s por animación; `wait` de 1.5–2.5 s para leer.
  Nada estático más de 3 s.
- Entre secciones: `FadeOut` de TODO lo anterior (agrupado) antes de construir lo
  nuevo. Las transiciones a pantalla limpia evitan solapes heredados.
- Duración total objetivo: **30–45 s** (TikTok ideal 30–60, Shorts <60, Reels <90).

## 6. Barra de progreso

- Toda escena lleva `barra_progreso(self, DURACION_TOTAL, color_marca)` (retención).
- `DURACION_TOTAL` debe ser la **duración real medida** del render:
  `ffprobe -v error -show_entries format=duration -of csv=p=0 video.mp4`
- Flujo: primer render → medir → actualizar `DURACION_TOTAL` → render final.
  El auditor avisa si la duración declarada difiere >1.5 s de la real.

## 7. Errores reales que ya nos pasaron (no repetir)

### 7.1 Mobjects fantasma — `remove(grupo)` vs `remove(*grupo)`
Cinco puntos verdes quedaron flotando sobre el texto de las secciones siguientes.
Causa: los Dots se agregaron a la escena individualmente (al animarlos con
`self.play(p.animate...)`), pero se intentó quitarlos con `self.remove(vgroup)` —
y el VGroup nunca estuvo en escena, así que no quitó nada.

```python
# MAL: si los elementos se agregaron sueltos, esto no quita nada
self.remove(mi_vgroup)
# BIEN: quitar los elementos, no el contenedor
self.remove(*mi_vgroup)
```

### 7.2 Elementos encimados por posiciones "bonitas" en columna
Tres flechas desde pastillas centradas en x=0 se encimaron en una sola línea.
Regla: si varios elementos apuntan al mismo destino, **escalonar los orígenes**
en x y en y (zigzag), y verificar con fotogramas.

### 7.3 Duplicación al reusar un elemento en el cierre
El logo "n8n" quedó dos veces en pantalla (el logo persistente arriba + otro en el
texto resumen). Regla: antes de escribir el cierre, listar qué mobjects siguen
vivos en escena y decidir explícitamente si se reutilizan o se hacen FadeOut.

### 7.4 Flecha que atraviesa texto
Una `Arrow` vertical cruzaba un subtítulo. Regla: las rutas de flechas/pulsos no
deben intersectar cajas de texto; si el layout lo exige, hacer `FadeOut` del texto
antes de dibujar la flecha.

### 7.5 Logo SVG deformado (caso real: Avalanche)
El SVG oficial de Avalanche se importó "sin errores" pero Manim aplastó su
trazado compuesto: quedó un círculo con un triángulo diminuto, irreconocible,
y llegó hasta el video publicado. Reglas desde entonces:
- **Todo asset nuevo (logo, ícono, imagen) se verifica visualmente con
  `python auditor/probar_logos.py` ANTES de usarlo en una escena.** La hoja
  `auditoria/hoja_assets.png` muestra cada asset tal y como lo dibuja Manim.
- Para logos multicolor o con trazados complejos, **preferir el PNG oficial**
  (`logo_png()`, raster exacto que no puede deformarse). SVG solo para marcas
  monocromas simples ya verificadas (`logo_svg()`).
- Un asset que se ve mal se ELIMINA del repo (no dejarlo "por si acaso").

### 7.7 Conectores "muñón" (caso real: las L1s de Avalanche)
Las líneas del centro a las pastillas quedaron como segmentos sueltos flotando:
arrancaban a un radio fijo (1.15 u) del centro y terminaban restando
`max(ancho, alto)/2` de la pastilla. Con cajas anchas y bajitas esas dos
cuentas no dan en el borde: una línea medía 0.24 u y no tocaba nada.
- **Nunca calcular conectores a ojo** (radios fijos, `buff` estimado).
  Usar `estilo.conectar(a, b, color, flecha=False)`, que resuelve la
  intersección exacta de la recta con la caja de cada elemento y funciona con
  cajas anchas, altas o mezcladas.
- Evitar poner dos elementos a la misma altura que el centro: el conector sale
  demasiado corto. Escalonar en vertical.
- El auditor rechaza conectores de menos de 0.5 u ("muñón") y extremos que
  quedan a más de 0.3 u del elemento ("flota en el aire").

### 7.8 El auditor solo veía los `play()`
Una escena construida con `add()` + `wait()` no se auditaba nunca (la escena de
prueba de muñones pasaba "aprobada" estando rota). Ahora el auditor instrumenta
`Scene.play` **y** `Scene.wait`. Moraleja general: **validar el validador** —
cada regla nueva se prueba contra una escena deliberadamente rota antes de
confiar en ella.

### 7.9 Conectores que cruzan OTROS elementos del mismo diagrama
En el video del oráculo, cuatro nodos en dos filas alineadas verticalmente
conectaban a un resultado abajo: los conectores de la fila de arriba pasaban
**por encima de las pastillas de la fila de abajo**. La regla original de
"atraviesa texto" no lo detectó porque usaba un umbral absoluto (0.45 u) y un
texto mide ~0.4 u de alto: la línea lo cruzaba entero sin llegar al umbral.
- Umbral corregido: `min(0.45, 0.9 * lado menor del texto)` — así detecta
  también los textos delgados que la línea atraviesa por completo.
- Regla de layout: en un diagrama de convergencia (varios → uno), **la fila
  superior debe ser más ESTRECHA que la inferior**, para que sus conectores
  bajen por dentro. Filas alineadas en la misma x garantizan cruces.

### 7.10 `set_opacity()` rellena los trazados abiertos (caso real: el isotipo)
La marca de agua se veía como una mancha. Había DOS causas encadenadas:
1. **Grosor fijo al encoger.** `scale_to_fit_height()` **no escala el trazo**:
   una marca de 0.34 u con `stroke_width=8` tiene los trazos más gruesos que
   sus huecos internos. Solución: derivar el grosor del tamaño
   (`max(3.0, alto * 4.5)` en `marca_nema`).
2. **`set_opacity()` activa también el relleno.** En Manim, `set_opacity()`
   toca fill **y** stroke; como la N es un trazado ABIERTO, Manim la rellena
   como si estuviera cerrada y aparece una mancha gris dentro.
   - Crear los trazados abiertos con `fill_opacity=0` explícito.
   - Para bajar la opacidad de un trazo: `set_stroke(opacity=...)`, nunca
     `set_opacity()`.

**Regla de diagnóstico:** un elemento pequeño que "se ve en mala calidad" casi
nunca es la resolución del render — es grosor no escalado o relleno indebido.
Para comprobarlo, **recortar la zona a resolución nativa** (`crop`) en vez de
mirar una miniatura reescalada, que exagera el defecto y confunde el origen.

### 7.11 La marca de agua rozando el contenido
La marca de agua quedó a **2 píxeles** del borde de la etiqueta de sección, y
además se solapaban 87 px en horizontal: parecía pegada al título. Causa doble:
la marca estaba a y=6.85 y las etiquetas de sección llegan hasta y≈6.7, sin aire
entre ambas.
- La marca de agua vive ahora en **y=7.15**, en la banda limpia entre la barra
  de progreso (7.6) y el techo del contenido (≈6.7).
- Las etiquetas de sección no deben pasar de **y=6.2** (con altura ≈0.95).
- El auditor vigila la separación aunque la marca esté marcada como
  `auditor_ignorar`: se le pone `es_marca_agua = True` y **nada de contenido
  puede acercarse a menos de 0.15 u**.

**Cómo medir de verdad si dos cosas se tocan:** no basta el ojo ni una
miniatura. Recortar la banda a resolución nativa y **contar los píxeles** de
cada color (marca vs. contenido) para obtener la separación exacta y el solape
horizontal. Fue así como se confirmó el defecto en vez de discutirlo.

### 7.12 Figuras opacas tapando texto (caso real: la pastilla DISPARADOR)
Una pastilla verde cruzaba el texto "con un DISPARADOR" y **el auditor lo
aprobó**. Dos huecos en la regla:
1. Solo comparaba **texto contra texto**. Una pastilla o tarjeta con relleno
   cubre lo que hay debajo aunque sus letras no se toquen.
2. El umbral del 25 % era el del solape texto-texto. La pastilla cubría el
   **12.7 %** del área del texto: poca área, pero una franja de 0.14 u
   atravesando 3 u de ancho **se ve fatal**.

Reglas nuevas:
- Toda figura con `fill_opacity ≥ 0.3` se compara contra cada texto.
- Si el texto está **dentro** de la figura (>90 %) es un componente (pastilla y
  su etiqueta): correcto. Si solo se cruzan, es colisión.
- Umbral para oclusión: **3 %**, no 25 %.

### 7.13 Los conectores curvos también atraviesan texto
La regla de "línea que atraviesa un texto" solo miraba objetos `Line`. Las
conexiones entre nodos son `CubicBezier`, así que un cable curvo que cruzaba la
etiqueta "DISPARADOR" pasó desapercibido. Ahora se vigilan
`CONECTORES = (Line, CubicBezier)`.

**Regla de layout que salió de ahí:** si un nodo tiene un cable saliendo por
abajo, su rótulo **no va debajo** — va al costado. Si no, el cable lo cruza
siempre.

### 7.14 Un auditor clavado a un solo formato es ruido (caso real: la charla)

Las reglas de cuadro estaban escritas para 9:16 (`LIMITE_X = 4.5`). Al auditar
los videos **horizontales** de la charla de AWS, el auditor reporto 79 errores
de "se SALE del cuadro" que eran todos falsos: media pantalla de un 16:9 mide
7.11, no 4.5.

Un auditor que grita en falso es peor que no tener auditor, porque se aprende
a ignorarlo — y el dia que avisa de algo real, tampoco se le hace caso.

**La regla ahora se calibra sola**: `calibrar_cuadro()` lee `config.frame_width`
y `config.frame_height` DESPUES de importar la escena (que es cuando la escena
ya fijo su formato) y ajusta limites, zona segura y altura minima de texto.

- Vertical -> margenes de la UI de TikTok/Reels (mas ajustado abajo).
- Horizontal -> 7 % de aire parejo: no hay UI de red social, pero si proyector.
- La altura minima de texto se define en **pixeles**, no en unidades: 28 px
  para celular, **34 px proyectado** (hay que leerlo desde la ultima fila).

Al validarla contra una escena horizontal rota a proposito, la prueba fallo
primero: un texto que yo daba por "sano" a x=6.0 medía 3.5 de ancho y llegaba a
7.75, o sea que **se salia de verdad**. El auditor tenia razon y la prueba
estaba mal. Vale la pena anotarlo: cuando el validador y la intuicion no
coinciden, hay que ir a medir antes de tocar el validador.

### 7.15 Los silencios son contenido cuando alguien va a hablar encima

En un video del canal el silencio es tiempo muerto. En un video para proyectar
en una charla es al reves: es el hueco donde entra la voz del orador. Si la
animacion corre a su ritmo, el orador termina persiguiendola.

Solucion: la clase `EscenaCharla` con un atributo `AIRE` que multiplica **todos
los `wait()` sin tocar los `run_time`**. Estirar animaciones las vuelve
pastosas; estirar silencios da aire.

El valor de `AIRE` **no se estima**: se mide. Se separa cuanto del video es
animacion y cuanto es silencio (recorriendo el AST y sumando los `wait()`), y
se despeja `AIRE = (objetivo - animacion) / silencio`.

Corolario: si a una escena le hace falta un `AIRE` de 3, **no le falta aire: le
falta contenido**. A `TresServicios` le salio 3.24 y la respuesta correcta no
fue estirarla sino agregarle un acto util ("¿y cual necesito yo?").

### 7.16 Decirle al auditor que ignore algo es crearse un punto ciego

La firma `@nemaxyz` de los videos de charla llevaba `auditor_ignorar = True`
para que no se juzgara a si misma. Resultado: el auditor dejo de mirar esa
esquina por completo, el texto de cierre de `OraculoRed` se le monto encima, y
el defecto llego al video final. Lo cazo el usuario mirando el video, no el
auditor.

La marca de agua necesita **las dos banderas**, como en `comun/estilo.py`:

- `auditor_ignorar` -> no se evalua como contenido (no se juzga a si misma).
- `es_marca_agua` -> la regla 7.11 la toma de referencia y verifica que
  ningun otro elemento se le acerque a menos de `MARGEN_MARCA`.

Con solo la primera, el auditor mira para otro lado. Con solo la segunda, se
compara consigo misma y reporta `0.00 u de separacion`, que es igual de
inutil. Regla general: **cada vez que se silencia algo en un auditor, hay que
preguntarse quien vigila eso ahora.**

### 7.17 Un auditor de texto para las presentaciones (y su primer error)

`auditor/auditar_presentacion.py` revisa lo que el auditor de escenas no ve:
texto que se mete en el pie de la diapositiva, bloques encimados, marcadores
vacios que muestran el ejemplo de la plantilla, erratas mecanicas (palabra
repetida, espacio doble, pregunta sin `¿`) y **mezcla de tuteo con voseo**.

Los desbordes no se estiman contando caracteres: se le pregunta a PowerPoint
por COM cuanto mide el texto ya compuesto (`TextRange2.BoundHeight`).

**El error que cometio la version 1**, y que vale mas que la regla: comparaba
el texto contra el rectangulo de su marcador y reporto **14 desbordes en una
presentacion que se veia perfecta**. En esa plantilla los marcadores no llevan
autoajuste, asi que el texto se sale del marcador con total normalidad y cae
en zona vacia. Al publico eso no le molesta.

Lo que si le molesta es que el texto se meta en el pie o se encime con otro
bloque. Esa es la version 2 de la regla, y de los 14 "errores" quedo **uno
solo, real**: la bio se metia en el pie despues de agregarle una linea.

Moraleja: **una regla debe medir lo que ve el publico, no lo que es comodo de
medir.** Un auditor que grita en falso 14 veces se desactiva mentalmente a la
segunda, y el error real numero 15 pasa de largo.

Ojo tambien con los falsos positivos del castellano: la primera version marcaba
"blockchain **deja** de ser un proyecto" como tuteo. `deja` solo es imperativo
cuando abre la frase.

### 7.18 Una flecha corta no es una flecha: es una mancha

En `ComoEmpezar`, tres tarjetas de un flujo quedaron tan pegadas que la flecha
del medio media **0.10 u**: la punta se comia el asta entera y el diagrama se
leia como dos cajas sueltas, sin sentido de flujo. Lo cazo la revision de
fotogramas, no el auditor.

Por que no lo cazo el auditor: la regla del munon (7.7) exige que el conector
sea corto **y ademas flote**. Esta estaba corta pero perfectamente pegada a sus
dos extremos, asi que pasaba. Y ese "y ademas flote" no era un error: se
agrego a proposito para no marcar los mini-flujos de fichas pegadas, que son
legitimos.

La distincion correcta es **si el conector tiene punta o no**:

- Una `Line` corta entre dos elementos pegados es un enlace compacto legitimo.
- Una `Arrow` corta **nunca** lo es: la punta tiene un tamano minimo propio, y
  si el asta mide menos que ella, no se lee la direccion.

De ahi `FLECHA_MIN = 0.35`, que solo aplica a `Arrow`. Se valido contra el caso
que la motivo (reporto los 0.10 u) y contra los videos verticales del canal,
que siguen aprobando.

Leccion transversal: cuando una regla tiene una excepcion ("corto pero pegado
esta bien"), conviene preguntarse si la excepcion aplica a **todos** los tipos
que la regla cubre. Aca aplicaba a las lineas pero no a las flechas.

### 7.19 En 9:16 no se apila lo que despues se conecta hacia abajo

Al rehacer el video 1 puse tres pastillas de fuentes de datos apiladas en
vertical y las conecte a la BLOCKCHAIN de abajo. El auditor rechazo: la linea
de la pastilla de arriba **atraviesa** a las de abajo camino a su destino.

En formato vertical hay poco ancho y mucho alto, y eso empuja a apilar. Pero
si varios elementos van a converger en UNO que esta debajo, tienen que ir en
**fila horizontal**: cada linea baja limpia y ninguna cruza a un hermano.

Corolario del mismo dia: un grupo con etiqueta (una "isla" con su nombre
arriba) se conecta por su parte DIBUJADA (`grupo[0]`), no por el grupo entero
— la caja del grupo incluye el texto y el conector termina flotando a medio
camino. Y si el elemento esta ABAJO en un triangulo, su etiqueta va abajo:
puesta arriba, las lineas que bajan desde los otros dos la atraviesan.

### 7.20 Toda linea decorativa necesita `auditor_ignorar`

La ranura de la moneda de la maquina expendedora es un `Line` de 0.56 u. El
auditor la juzgo primero como "conector suelto" y despues, cuando la maquina
se escala a 0.6, como "munon de 0.34 u". No era ninguna de las dos: era el
dibujo de una ranura.

Cualquier `Line` que forme parte de un DIBUJO (una ranura, una grieta, un
tachado, un subrayado) tiene que llevar `auditor_ignorar = True`. El auditor
no puede distinguir intencion, y esta bien que no lo intente: la regla es que
lo declare quien dibuja.

### 7.21 La constante de velocidad de la voz estaba mal por 1.8x

Nicolas dijo "siento que no esta junto el video con el audio". El auditor de
sincronia decia APROBADO. Los dos tenian razon, y el error era mio.

Se midio de verdad: se extrajo la pista de voz aislada
(`produccion/tmp/<serie>_NN_voz.wav`), se corrieron los tramos hablados con
`silencedetect` y se compararon con los tiempos declarados. Resultado:

- Cada frase caia en su lugar (+0.17 s de desfase: imperceptible).
- Pero solo el **44 %** del video tenia voz, con huecos de 6, 9 y 11 s.

La causa: `CHARS_POR_SEGUNDO = 9.5`. Medido sobre 7 frases reales con
`es-BO-MarceloNeural` a +6 %: **17.1 c/s** (rango 15.2-20.0). Un factor de
1.8x. Todos los guiones del proyecto se escribieron 44 % mas cortos de lo
necesario, y por eso los videos se sienten medio mudos.

Ahora la constante es 16.0 (algo por debajo del promedio, para dejar aire).

**Como medirlo de nuevo si cambia la voz o el rate:** sintetizar unas frases,
correr `silencedetect` sobre la pista de voz y dividir caracteres entre
segundos hablados. Nunca estimarlo.

### 7.22 "Cada frase en su seccion" no es lo mismo que "sincronizado"

La regla vieja del auditor de sincronia solo miraba si una seccion quedaba
ENTERAMENTE muda. Media seccion callada pasaba como buena.

Regla nueva: **cobertura de voz por seccion** (`COBERTURA_MIN = 0.55`). Se
suma cuanto habla la voz dentro de cada seccion y se compara con su duracion.
Validada contra el caso que la motivo.

Y una trampa de instrumentacion encontrada en el camino: `linea_para()` busca
la linea de tiempo recorriendo `produccion/lineas_tiempo/*.json` ORDENADOS, y
se queda con el primer JSON cuyo video coincida. Un archivo de prueba llamado
`_prueba_vieja.json` gana alfabeticamente y **secuestra la auditoria** de la
escena real. Los archivos de prueba se borran apenas se usan.

### 7.24 Un aviso del auditor senala el sintoma, no la causa

El auditor de audio avisaba "las transiciones suenan a aire (planitud 0.203):
usar subidas tonales en vez de barridos de ruido". Segui el consejo literal y
reescribi el `riser`: su planitud bajo de 0.39 a 0.089. **El aviso no se movio
(0.203 -> 0.205).** El riser nunca fue el problema.

Descomponiendo la mezcla se vio que el culpable era el `platillo` — hi-hat de
ruido blanco, sonando en cada tiempo del compas. Quitandolo, la planitud del
fondo caia de 0.30 a 0.05. Solucion: hi-hat estilo 808, seis ondas cuadradas
con frecuencias que no son multiplos entre si. Suena igual de metalico y no
llena el espectro de siseo.

**El aviso decia la verdad sobre QUE se oia mal y una hipotesis falsa sobre
POR QUE.** La medida se cree; la explicacion se verifica.

### 7.25 Antes de creerle a una medicion, revisar como se mide

Tres instrumentos mintieron en la misma sesion:

1. **Frecuencia de muestreo.** Yo medi la planitud del MP4 final a 44.1 kHz y
   dio 0.004; el auditor daba 0.194. El auditor carga a **16 kHz**. Encima de
   los ~15 kHz el AAC no deja nada, y esos bines vacios hunden la media
   geometrica: a 44.1 kHz todo parece tonal. **Medir en el mismo dominio que
   la herramienta con la que se compara.**
2. **Submuestreo sin filtro anti-alias.** Al reproducir el caso roto baje a
   16 kHz tomando una muestra de cada N. Eso pliega el brillo del ruido hacia
   abajo e inflaba la planitud (0.137 en vez de 0.066). Remuestrear con ffmpeg,
   no a mano.
3. **Detector de voz por comparacion con la pista sin voz.** Daba 26 % de
   cobertura donde habia 54 %. La mezcla lleva *sidechain*: durante la voz la
   musica se agacha, asi que la mezcla puede tener MENOS energia que la pista
   de musica sola. La verdad de terreno es `produccion/tmp/<nombre>_voz.wav`,
   la pista de voz aislada.

### 7.26 Una regla de musica no se mide sobre la mezcla con voz

La regla del aire media la mezcla final. Pero el habla tiene planitud
altisima: las eses y las efes son ruido puro. En el video 1 una frontera con
voz encima daba **0.457** y sin voz **0.054** — nueve veces, por un defecto
inexistente. `producir.py` siempre deja un hermano `_SIN_VOZ.mp4`: esa es la
pista sobre la que se juzga la musica.

**Y el umbral se recalibra despues de cambiar lo que se mide.** Sobre musica
sola y espectro completo, percusion de ruido daba 0.120 y percusion tonal
0.094: indistinguibles, porque el bombo y el bajo pesan tanto que ahogan la
diferencia. Acotando la medida a **1500-7900 Hz**, donde vive el siseo, la
separacion pasa a 1.7x (0.83 contra 0.49) y el umbral tiene margen. Probado
contra los 11 videos del catalogo: el corregido da 0.404 y los 10 que todavia
tienen el hi-hat viejo dan 0.66-0.72. Eso es una regla que sirve.

### 7.23 Una frase por BEAT, no una frase por seccion

Nicolas insistio dos veces en que el audio no iba con el video, y las dos
primeras veces mire el numero equivocado. La revision exhaustiva:

**Lo que hice mal:** extraje fotogramas del MP4 en el instante exacto en que
arranca cada frase y compare lo que se OYE con lo que se VE. Resultado:

- 44 s: la voz explicaba el porque del determinismo — **la pantalla ya habia
  pasado a Chainlink**.
- 64 s: la voz decia "cuando la mayoria se pone de acuerdo" — **ya se veia el
  contador del cierre**.
- 27 s: la voz enumeraba dolar/clima/futbol — **las pastillas todavia no
  habian aparecido**.

**La causa:** mapee la narracion a las 5 SECCIONES gruesas que devuelve
`auditar_sync`. Pero una seccion contiene muchos beats: cada pastilla que
entra, cada texto que aparece, cada tachado. La regla del proyecto ya lo
decia — "una frase por beat visual" — y la incumpli.

**La herramienta que faltaba:** un volcado del mapa de beats. Se instrumenta
`Scene.play`/`Scene.wait` igual que el auditor, pero en vez de buscar cortes
se registra QUE ELEMENTO NUEVO aparece y en que segundo. Para el video 1 dio
17 beats (4.2, 7.7, 13.4, 17.8, 21.9, 27.5, 28.8, 30.1, 31.4, 36.9, 37.8,
45.1, 49.9, 57.8, 58.7, 64.7, 70.7, 75.4). Con ese mapa, cada frase arranca
**0.3-0.5 s despues** de que aparece lo que describe.

**Verificacion final, medida en el audio real:** 14/14 frases sobre su beat,
0 desbordes, y los silencios que quedan (2.5-3.6 s) caen todos en
TRANSICIONES — donde el silencio es correcto porque el espectador esta
leyendo lo que acaba de aparecer.

**Corolario sobre la cobertura:** 57 % bien alineado se percibe mejor que
75 % desalineado. La cobertura sirve para detectar huecos de 9 y 11 segundos
en medio de un acto, no para llenar cada respiro. La alineacion con el beat
manda sobre el porcentaje.

### 7.6 Tachados y decoraciones intencionales
El auditor marca líneas que atraviesan texto (regla 7.4). Si el cruce es
intencional (p. ej. tachar una palabra en el hook), etiquetarlo:
`mi_linea.auditor_ignorar = True` — igual que la barra de progreso.

## 7b. Assets: logos, íconos e imágenes

- Logos de marcas: `comun/logos/` — SVG de cdn.simpleicons.org (monocromos,
  fiables) o PNG oficial de cryptologos.cc / press kit de la marca.
- Íconos de conceptos: `comun/iconos/` — Font Awesome Free solid
  (`https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.7.2/svgs/solid/<nombre>.svg`),
  licencia CC BY 4.0: acreditar "Iconos: Font Awesome" en la descripción del video.
- Helpers: `logo_png()`, `logo_svg()`, `icono()`, `pastilla_icono()` en estilo.py.
- Flujo: descargar → `python auditor/probar_logos.py` → mirar la hoja → usar.

## 7c. Método pedagógico (el público tiene "mente de 5 años")

No es que el público sea tonto: es que te dan 2 segundos de atención en un
scroll infinito. Reglas de enseñanza para cada guion y escena:

1. **Un ícono o imagen por cada sustantivo importante.** Ver un balón > leer
   "resultados deportivos". Ver un banco griego > leer "instituciones".
2. **Una analogía física por concepto abstracto** (blockchain = Excel que nadie
   puede borrar; oráculo = testigo; L2 = segundo piso de la avenida). La
   analogía se DIBUJA, no solo se dice.
3. **Palabra rara = definirla en 3 palabras en la misma frase** ("oráculos:
   testigos que reportan datos"). Si no cabe, no uses la palabra rara.
4. **La idea clave se repite dos veces**: al presentarla y en el cierre, con
   las mismas palabras (el cierre de Deep Learning repite "no le das reglas,
   le das ejemplos").
5. **Visual primero, texto después**: la animación muestra el fenómeno y el
   texto lo etiqueta — nunca al revés.
6. **Números redondos y comparables**: "400 veces más rápido que tu banco"
   vale más que "finalidad de 0.8-1.5 segundos".
7. Etiquetas de una palabra donde se pueda: "Deportes", no "Resultados
   deportivos".

## 8. Trampas de la API (Manim CE 0.19)

- **Contadores:** usar `ValueTracker` + `add_updater` + `clear_updaters()` al
  terminar. `ChangeSpeed` y `contador.animate.set_value()` son frágiles.

```python
valor = ValueTracker(0)
contador = Integer(0, font_size=150)
contador.add_updater(lambda m: m.set_value(valor.get_value()))
self.play(valor.animate.set_value(110), run_time=2, rate_func=rush_from)
contador.clear_updaters()   # SIEMPRE, o seguirá evaluándose para siempre
```

- **`Transform(a, b)`:** después del transform el objeto vivo sigue siendo `a`
  (con la forma de `b`). Los FadeOut posteriores deben apuntar a `a`.
- **`Line`/`Arrow` entre elementos:** NO usar `buff` a ojo — usar
  `estilo.conectar(a, b, color, flecha=True/False)` (ver 7.7).
- **Updaters con `dt`** (como la barra de progreso): no avanzan en `--dry_run`;
  no depender de ellos para posicionar contenido.
- **`Cross(...)`:** crear y `.scale(...)` + `.move_to(...)`; escalar el factor,
  no el stroke.
- **LaTeX:** evitar `Tex`/`MathTex` salvo fórmulas reales; `Text` (Pango) es más
  rápido y no depende de MiKTeX.
- **`arrange` vs posiciones absolutas:** `arrange(DOWN, buff=...)` para listas
  homogéneas; `move_to([x, y, 0])` explícito para layouts compuestos. No mezclar
  ambos sobre el mismo grupo después de posicionarlo.

## 9. Flujo de auditoría obligatorio

```powershell
# 1. Prueba lógica en segundos (sin renderizar)
python -m manim render --dry_run carpeta/video_XX.py Escena

# 2. Auditor automático: zonas seguras, solapes, tamaños, contraste, duración
python auditor/auditar.py carpeta/video_XX.py Escena

# 3. Render real
python -m manim render carpeta/video_XX.py Escena

# 4. Auditoría VISUAL: extraer fotogramas y MIRARLOS uno a uno
python auditor/extraer_fotogramas.py media/videos/.../Escena.mp4
#    (si eres un modelo: usa Read sobre cada PNG y busca solapes/duplicados/cortes)

# 5. Medir duración real y calibrar DURACION_TOTAL, re-render si cambió
ffprobe -v error -show_entries format=duration -of csv=p=0 media/videos/.../Escena.mp4
```

El auditor automático atrapa lo geométrico; **la revisión de fotogramas atrapa lo
semántico** (duplicados, elementos fantasma, composición fea). Las dos son
obligatorias: el bug de los puntos verdes solo se vio en fotogramas.

## 10. Checklist final antes de dar por bueno un video

- [ ] `--dry_run` pasa sin errores
- [ ] Auditor: 0 errores (avisos justificados por escrito si se aceptan)
- [ ] Fotogramas revisados visualmente (mínimo 1 por sección)
- [ ] `DURACION_TOTAL` = duración real ±1 s
- [ ] Duración total entre 30 y 60 s
- [ ] Hook legible en los primeros 2 s
- [ ] CTA con razón concreta ("sígueme porque…")
- [ ] Guion en `guiones/` sincronizado con los tiempos reales
- [ ] Datos/cifras verificados con fuente y fecha
