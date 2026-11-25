# Pixel Plan

Agenda semanal con estética pixel ("noche arcade") para organizar los días: cargar actividades por horario, tildarlas, reprogramarlas y ver un resumen de la semana.

Es una PWA: se instala en el celular desde el navegador y funciona sin internet.

## Qué hace

- **Día:** semana con 7 días, lista de actividades con hora, tilde para marcarlas (suma monedas con sonidito retro).
- **Categorías con íconos pixel:** lectura, ejercicio, programar, estudiar, trabajo, momento play, horario de novia, series/pelis y "otra" (con nombre propio).
- **Opciones de cada actividad:** marcar como hecha, reprogramar a otro día/horario, "no lo hice", editar, borrar.
- **Repetir:** al crear una actividad se puede copiar a otros días de la misma semana.
- **Series y pelis:** lista editable; se toca una y se anota cuándo se vio.
- **Resumen:** % cumplido de lo que ya tocaba hacer, cumplidas / reprogramadas / no hechas (con detalle), y horas hechas contra planificadas por actividad.
- **Respaldo:** copiar y restaurar los datos (viven en el `localStorage` del celular).

Una actividad pendiente de un día que ya pasó cuenta como "no hecha".

## Estructura

```
index.html        estructura y carga de fuentes
css/styles.css    estilos (variables de color arriba de todo)
js/icons.js       íconos pixel 8×8 dibujados con '#'
js/store.js       categorías, fechas, guardado y cálculo del resumen
js/app.js         vistas (día, series, stats), paneles y eventos
manifest.json     datos para instalar la app
sw.js             service worker (cache offline)
icons/            íconos de la app
```

Sin dependencias ni build: HTML, CSS y JavaScript con módulos ES.

## Probar en local

Los módulos ES no funcionan abriendo el archivo directo, hace falta un servidor:

```bash
python3 -m http.server 8000
# o
npx serve .
```

y abrir `http://localhost:8000`.

## Publicar en GitHub Pages

1. Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
2. Abrir `https://belen-humbert.github.io/pixel-calendar/` en el celular.
3. Android (Chrome): menú ⋮ → *Instalar app*. iPhone (Safari): compartir → *Agregar a inicio*.

Cada vez que publiques cambios, subí el número de `CACHE` en `sw.js` (`pixelplan-v2` → `pixelplan-v3`) para que el celular baje la versión nueva.

## Personalizar

- **Colores e íconos por categoría:** `CATS` en `js/store.js`.
- **Dibujar un ícono:** agregá una grilla de 8 filas × 8 caracteres en `GRIDS` (`js/icons.js`).
- **Series precargadas:** `shows` en `DEFAULTS` (`js/store.js`).
- **Ejemplos del primer uso:** `seedDemo()` en `js/store.js`.
