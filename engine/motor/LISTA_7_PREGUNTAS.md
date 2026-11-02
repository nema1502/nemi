# Las 7 preguntas — se responden ANTES de grabar, no después

Ningún video sale del estudio sin pasar por acá. No es una formalidad: cada
pregunta corresponde a un momento distinto en que el espectador puede irse, y
un video puede ser excelente en seis y morir en la séptima.

**Cómo se responde:** con el guion en la mano, en una frase, y con
**SÍ / NO / DUDOSO**. Un DUDOSO se arregla antes de grabar. Un NO significa
que el video no se hace todavía.

---

## 1. ¿Alguien se detendría?

**El momento:** los primeros 3 segundos, mientras el dedo está bajando.

**Se aprueba si:** en el primer fotograma hay un **objeto reconocible** o una
afirmación que contradice lo que la persona cree. No un título, no un logo, no
una definición.

**Se rechaza si:** empieza con "Hoy vamos a hablar de…", con el nombre de una
tecnología, o con una intro de marca. *(Regla del proyecto: nunca intro con
logo — quema los 3 segundos que deciden todo.)*

## 2. ¿Alguien haría clic?

**El momento:** la miniatura y el título en la grilla.

**Se aprueba si:** el título se entiende **sin saber nada del tema** y la
palabra que la gente busca va **primero** (se corta a ~40 caracteres en Shorts).

**Se rechaza si:** el título necesita que ya sepas qué es la cosa. "¿Qué es
CCIP?" no; "Dos blockchains que no se hablan" sí.

## 3. ¿Vería alguien el video?

**El momento:** del segundo 3 al final.

**Se aprueba si:** hay **algo visualmente nuevo cada 15 segundos** y ninguna
pantalla se queda quieta más de 3 s. En video largo: algo nuevo cada 2 minutos.

**Se rechaza si:** hay un tramo donde solo cambia el texto. El ojo lo lee como
pausa y se va.

## 4. ¿Querrán comentar?

**El momento:** durante y justo al terminar.

**Se aprueba si:** el video deja **una pregunta abierta que el espectador puede
contestar desde su experiencia**, o una afirmación con la que se puede estar en
desacuerdo.

**Se rechaza si:** el cierre es "seguime". Eso no es una pregunta, es un pedido.
Lo que funciona: *"¿qué otro concepto querés que explique con un objeto de todos
los días?"* — cualquiera puede responder eso.

## 5. ¿Estarán satisfechos?

**El momento:** el final.

**Se aprueba si:** **la promesa del gancho quedó cumplida dentro del video.**
Si el gancho dice "te explico por qué", tiene que estar el porqué, no solo el qué.

**Se rechaza si:** el video termina mandando a otro lado para lo importante.
Eso se siente a estafa y es lo que más castiga la retención.

## 6. ¿Lo volverían a ver?

**El momento:** días después.

**Se aprueba si:** sirve como **referencia**: alguien lo guardaría para
mostrárselo a otro. La frase que lo delata: *"guardalo para cuando alguien te
pregunte qué es…"*.

**Se rechaza si:** es una noticia o una opinión del momento. Se ve una vez y
caduca.

## 7. ¿Se suscribirán?

**El momento:** el último segundo.

**Se aprueba si:** hay una **razón concreta y nombrada** para volver: el
siguiente video mencionado **por su gancho**, no por su número.

**Se rechaza si:** dice "parte 3" y nada más. Nadie se suscribe por un número.

---

## Cómo entra en el flujo

Cada guion (`<serie>/guiones/NN_*.md`) lleva una sección **`## Las 7 preguntas`**
con las siete respondidas. Lo verifica:

```powershell
python auditor/auditar_guion.py <serie>/guiones/NN_*.md    # debe dar APROBADO
```

El auditor comprueba que estén las 7, que ninguna esté vacía y que cada una
tenga veredicto. **No puede juzgar si la respuesta es honesta** — eso es tuyo.
Lo que sí garantiza es que nadie las saltee sin darse cuenta.

> **Por qué importa el orden.** Las preguntas 1 y 2 deciden si el video existe
> para el algoritmo. Las 3, 4 y 5 deciden si el algoritmo lo sigue mostrando.
> Las 6 y 7 deciden si construís un canal o juntás vistas sueltas. Fallar la 1
> hace que las otras seis no importen.
