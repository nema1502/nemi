> **Nota de honestidad sobre este documento:** la estructura de 5 actos, la
> regla del "objeto cotidiano" y los patrones de apertura son criterio de
> diseño propio a partir de lo que ya funcionó en estos 9 videos y de las
> métricas verificadas en `METRICAS_CONTENIDO.md` (los 3 segundos, la
> finalización, la caída a los 15 s). No es un método académico citado.

# Narrativa: cómo engancha y enseña un video de nemaxyz

El problema que resuelve este documento: un video que empieza con un dato
—aunque sea un dato bueno— es información. Un video que empieza con **una
situación que el espectador ya vivió** es una historia, y por eso se queda.

---

## 1. La estructura de 5 actos

Todo video de nemaxyz sigue este arco. Los tiempos son para un video de 30-40 s.

| Acto | Tiempo | Qué hace | Clima musical |
|---|---|---|---|
| **1. El ancla** | 0:00–0:04 | Una escena cotidiana que el espectador reconoce al instante. Nada de teoría. | `misterio` |
| **2. La grieta** | 0:04–0:13 | Algo en esa escena no cuadra. Aparece el problema, con su costo. | `tension` |
| **3. La llave** | 0:13–0:22 | Se revela el mecanismo que lo resuelve. Es el corazón del video. | `revelacion` |
| **4. La prueba** | 0:22–0:28 | Números verificados o consecuencias reales. Le da peso. | `dato` / `alerta` |
| **5. El hilo** | 0:28–0:35 | Resumen de una frase + qué viene después. | `cierre` |

La música cambia sola en cada acto: el motor de audio recibe las fronteras y
sintetiza el clima correspondiente (ver `GUIA_AUDIO.md`).

---

## 2. El acto 1 es el que decide todo

**Regla del objeto cotidiano:** el primer plano del video debe contener algo
que el espectador tocó esta semana. Un celular. Un paquete. Un mensaje. Una
factura. Nunca un concepto abstracto.

| ❌ Empieza con concepto | ✅ Empieza con objeto |
|---|---|
| "Las blockchains no acceden a datos externos" | "Tu celular sabe el precio del dólar. Una blockchain, no." |
| "La clasificación arancelaria es un sistema" | "Todo lo que existe tiene un número. Tu celular, un perro, un cohete." |
| "Los LLM predicen tokens" | "El gato subió al… ¿qué? Eso es lo único que hace ChatGPT." |
| "Las stablecoins agilizan pagos" | "Pagarle a tu proveedor: 3 días y comisión en cada escala." |

**Patrones de apertura que funcionan** (elegir uno por video):

1. **La escena reconocible** — "Pides algo de China. Llega en 20 días…"
2. **La pregunta incómoda** — "¿Sabes cuánto pagaste de impuesto en tu último
   pedido? Casi nadie lo sabe."
3. **La contradicción** — "ChatGPT no sabe nada. Y aun así te cambió el trabajo."
4. **El número imposible** — "Un contrato con un millón de dólares se rompe con
   un solo dato falso."
5. **El "a ti también te pasó"** — "Te llegó un correo importante y lo dejaste
   para después. Otra vez."

---

## 3. Pedagogía: cómo avanza la explicación

Después del ancla, la explicación **escala en un solo eje**, sin saltos:

```
   objeto cotidiano  →  el problema con ese objeto  →  el mecanismo
        (ya lo conoces)      (ahora te importa)        (ahora lo entiendes)
```

Reglas para no perder a nadie:

1. **Una idea nueva por acto.** Si el acto 3 introduce dos mecanismos, uno sobra.
2. **Palabra técnica = se gana el derecho a existir.** Solo aparece después de
   que el espectador entendió el concepto. "Merceología" va al final del video
   de clasificación, no al principio.
3. **La analogía se dibuja.** Bóveda con la puerta de atrás abierta; peaje en
   la frontera; el hilo que entra crudo y sale transformado.
4. **Los números se comparan, no se enuncian.** "3 días vs. minutos" pesa más
   que "liquidación T+2".
5. **La idea clave se dice dos veces:** al revelarla y al cerrar, con las
   mismas palabras.
6. **Honestidad como recurso narrativo.** El acto 4 puede ser un "pero ojo"
   (regulación, límites, riesgos). Genera confianza y comentarios.

---

## 4. El cierre encadena

El último acto siempre nombra el video siguiente **por su gancho**, no por su
título: "en la parte 3, el código de 8 dígitos que decide cuánto pagas" retiene
más que "en el próximo video hablaremos de clasificación arancelaria".

---

## 5. Implementación

En `comun/estilo.py`:

```python
apertura_historia(escena, situacion, giro, color, icono_situacion=None)
```

Monta el acto 1 completo: la situación cotidiana (con su objeto/ícono), una
pausa, y el giro que abre la grieta. Devuelve el grupo para hacerle `FadeOut`.

En la línea de tiempo (`produccion/lineas_tiempo/*.json`) se declaran los
climas por acto:

```json
"secciones": [4.2, 12.6, 21.0, 27.4],
"climas": ["misterio", "tension", "revelacion", "dato", "cierre"]
```

Si no se declaran, el motor infiere el arco estándar según el número de actos.

---

## 6. Lista de verificación narrativa

Antes de renderizar, el guion debe cumplir:

- [ ] El primer plano contiene un objeto cotidiano, no un concepto
- [ ] El gancho se entiende sin haber visto ningún otro video
- [ ] Hay exactamente una idea nueva por acto
- [ ] Ninguna palabra técnica aparece antes de que se entienda el concepto
- [ ] Hay al menos una analogía dibujada, no solo dicha
- [ ] Los números están comparados con algo conocido
- [ ] La idea clave se repite al abrir y al cerrar
- [ ] El cierre nombra el siguiente video por su gancho
- [ ] Los climas musicales acompañan el arco (no todo al mismo tono)
