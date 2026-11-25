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
- **Resumen del mes:** podio de las 3 actividades a las que más tiempo le dedicó, ranking completo, horas totales, días activos y lo que más vio. Al empezar un mes nuevo aparece un aviso para ver el anterior.
- **Cuenta de Google:** al entrar, todo se guarda en la nube (Firebase) y se sincroniza entre dispositivos. Cada mes también se guarda un resumen en `users/{uid}/months/{YYYY-MM}`.
- **Respaldo:** copiar y restaurar los datos a mano.

Una actividad pendiente de un día que ya pasó cuenta como "no hecha".

## Estructura

```
index.html        estructura y carga de fuentes
css/styles.css    estilos (variables de color arriba de todo)
js/icons.js       íconos pixel 8×8 dibujados con '#'
js/store.js       categorías, fechas, guardado y cálculo del resumen
js/app.js         vistas (día, series, stats semana/mes), paneles y eventos
js/cloud.js       login con Google y guardado en Firestore
js/firebase-config.js   configuración de tu proyecto de Firebase
firestore.rules   reglas de seguridad (cada uno ve solo lo suyo)
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

## Conectar Firebase (login con Google)

Sin esto la app funciona igual, pero solo guarda en el celular.

1. Entrá a [console.firebase.google.com](https://console.firebase.google.com) → **Agregar proyecto** (Analytics no hace falta).
2. **Authentication → Comenzar → Método de acceso → Google → Habilitar** (elegí el correo de asistencia y guardá).
3. **Authentication → Configuración → Dominios autorizados → Agregar dominio:** `belen-humbert.github.io`. (`localhost` ya viene; si probás con Live Server agregá también `127.0.0.1`.)
4. **Firestore Database → Crear base de datos** → modo producción → ubicación `southamerica-east1` (San Pablo).
5. En **Firestore → Reglas**, pegá el contenido de `firestore.rules` y publicá.
6. **Configuración del proyecto (engranaje) → Tus apps → ícono `</>` (Web)** → registrá la app y copiá el objeto `firebaseConfig` en `js/firebase-config.js`.

Esos datos de configuración no son secretos (identifican el proyecto); lo que protege la información son las reglas de Firestore.

Cómo funciona la sincronización: cada actividad guarda cuándo se cambió por última vez y, al unir datos de dos dispositivos, gana el cambio más nuevo. Los borrados también se sincronizan. Firestore guarda una copia local, así que sin internet se sigue usando y sube los cambios cuando vuelve la conexión.

## Publicar en GitHub Pages

1. Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
2. Abrir `https://belen-humbert.github.io/pixel-calendar/` en el celular.
3. Android (Chrome): menú ⋮ → *Instalar app*. iPhone (Safari): compartir → *Agregar a inicio*.

Cada vez que publiques cambios, subí el número de `CACHE` en `sw.js` (`pixelplan-v6` → `pixelplan-v7`) para que el celular baje la versión nueva.

## Personalizar

- **Colores e íconos por categoría:** `CATS` en `js/store.js`.
- **Dibujar un ícono:** agregá una grilla de 8 filas × 8 caracteres en `GRIDS` (`js/icons.js`).
- **Series precargadas:** `shows` en `DEFAULTS` (`js/store.js`).
- **Ejemplos del primer uso:** `seedDemo()` en `js/store.js`.
