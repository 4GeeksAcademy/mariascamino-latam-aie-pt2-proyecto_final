# AUDIT.md — Auditoría de rendimiento (antes de los cambios)

## Metodología

- **Modo producción en ambos frontends**, nunca `dev`:
  - Sitio corporativo (HTML estático + Tailwind): `npm run build` → servido desde `dist/` con `http-server` (puerto 4173).
  - Backoffice (Next.js 16): `npm run build && npm run start` (puerto 3000), con la API FastAPI (`services/api`) sembrada con 15 proveedores (`seed.py`) en el puerto 8000.
- **Lighthouse 12.8 (CLI)**, Chromium headless, en **mobile** (preset por defecto: Moto G Power, 4G lento, CPU 4x) y en **desktop** (`--preset=desktop`).
- **3 corridas por página y modo.** Se guarda la corrida con la **mediana** del score de Performance para reducir el ruido entre corridas.
- **Páginas auditadas** (las de mayor tráfico o con más elementos):
  - Corporativo: `/index.html` (home, con imágenes y contenido) y `/application.html` (formulario).
  - Backoffice: `/` y `/suppliers` (la vista más pesada: tabla con datos de la API, filtros y formulario).
- **Evidencia:** capturas en [`audit/before/`](audit/before/) y reportes HTML completos en [`audit/before/reports/`](audit/before/reports/).

## Scores iniciales

| Frontend | Página | Modo | Perf | A11y | Best Pr. | SEO | FCP | LCP | TBT | CLS |
|---|---|---|---|---|---|---|---|---|---|---|
| Corporativo | Home | Mobile | **83** | 100 | 96 | 100 | 2.6 s | **4.1 s** | 0 ms | 0 |
| Corporativo | Home | Desktop | 98 | 100 | 96 | 100 | 0.8 s | 1.0 s | 0 ms | 0.003 |
| Corporativo | Application | Mobile | 99 | 100 | 96 | 100 | 1.6 s | 1.6 s | 0 ms | 0.027 |
| Corporativo | Application | Desktop | 99 | 100 | 96 | 100 | 0.8 s | 0.8 s | 0 ms | 0 |
| Backoffice | Suppliers | Mobile | **83** | **91** | 96 | 100 | 0.8 s | 2.2 s | 60 ms | **0.316** |
| Backoffice | Suppliers | Desktop | **79** | **91** | 96 | 100 | 0.2 s | 0.5 s | 0 ms | **0.517** |
| Backoffice | Home | Mobile | 100 | 100 | 96 | 100 | 0.8 s | 1.6 s | 60 ms | 0 |
| Backoffice | Home | Desktop | 100 | 100 | 96 | 100 | 0.2 s | 0.5 s | 0 ms | 0 |

TTFB fue despreciable en todas las páginas (< 20 ms en servidor local), así que el problema no estaba en la respuesta del servidor sino en lo que pasaba **después** de recibir el HTML.

## Problemas identificados y causa raíz

Ordenados por impacto en Core Web Vitals.

### 1. Backoffice `/suppliers`: CLS 0.517 (desktop) / 0.316 (mobile). Severidad: crítica

- **Síntoma:** Lighthouse señala `<main>` y el formulario "Registrar nuevo proveedor" como elementos que se desplazan. CLS > 0.25 se considera "pobre".
- **Causa raíz:** la página entera era un Client Component (`"use client"`). El HTML que generaba el servidor solo traía una fila con "Cargando proveedores…". Después de la hidratación, `useEffect` pedía `/suppliers` a la API y, al llegar 15 filas, la tabla crecía unos 600 px y empujaba hacia abajo todo lo que venía después. Es un problema de **carga de datos después de la hidratación**, no de CSS. Reservar altura con un `min-height` solo escondería el síntoma, porque la cantidad de filas es variable.
- **Corrección propuesta:** obtener la lista en el servidor (Server Component) y mandarla en el HTML inicial.

### 2. Corporativo home (mobile): LCP 4.1 s. Severidad: alta

- **Síntoma:** el elemento LCP es la imagen del hero (`hero-clinic.webp`). Lighthouse estima **531 KiB** ahorrables en "Properly size images". La página pesa 694 KB en total.
- **Causa raíz:** todas las imágenes se servían en una sola resolución (1200 px, o 1600 px la de ubicaciones; el hero pesa 210 KB), pero en un viewport mobile de 412 px se muestran a unos 380 px. Sin `srcset`, el navegador no tiene otra opción que descargar el archivo grande. El hero ya tenía `fetchpriority="high"`, `width`/`height` y `loading="eager"`, así que el problema no era la prioridad sino el **tamaño**.

### 3. Corporativo (home y application): Google Fonts bloquea el render. Severidad: alta

- **Síntoma:** "Eliminate render-blocking resources", con unos 1.8 s estimados en home mobile (0.9 s solo por la fuente). FCP de 2.6 s en mobile.
- **Causa raíz:** `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope…">` es una hoja de estilos externa que **bloquea el primer pintado**. Además encadena dos orígenes externos: `googleapis.com` entrega un CSS que luego pide los `.woff2` a `gstatic.com`. Son dos conexiones (DNS + TLS) en la ruta crítica, aunque ya había `preconnect`. El `display=swap` evita texto invisible, pero no evita que la hoja CSS bloquee.

### 4. Backoffice `/suppliers`: Accesibilidad 91. Severidad: media

- **Síntoma:** fallan las auditorías `label` (inputs sin nombre accesible), `select-name` (selects sin nombre) y `td-has-header`.
- **Causa raíz:** cada `<label>` estaba al lado de su control, pero **sin `htmlFor`/`id`**, así que el navegador no los asocia: un lector de pantalla anuncia "cuadro de edición" sin decir cuál, y hacer clic en el label no enfoca el input. Además, la columna de acciones tenía un `<th>` vacío, y los checkboxes de categorías usaban `display:none` (`hidden`), lo que los saca del orden de tabulación.

### 5. Todas las páginas: Best Practices 96. Severidad: baja

- **Síntoma:** `errors-in-console`, con un 404 en `/favicon.ico`.
- **Causa raíz:** ninguno de los dos frontends declaraba un icono, así que el navegador pide `/favicon.ico` por defecto y recibe un 404.

### Hallazgos documentados pero no corregidos (con justificación)

| Auditoría | Por qué no se corrige |
|---|---|
| `uses-text-compression`, `uses-long-cache-ttl` (corporativo) | Son artefactos del servidor local (`http-server` no comprime y usa `max-age=3600`). En producción Vercel ya comprime con gzip/brotli y `vercel.json` ya define `Cache-Control: immutable` para `/assets`. Corregirlo localmente solo inflaría el score sin cambiar nada real. |
| `legacy-javascript`, `unused-javascript` (backoffice) | Son chunks internos del framework Next.js (polyfills y runtime). Cambiarlos implica reconfigurar el build (browserslist), y el enunciado pide no reestructurar. |
| `unused-css-rules` (~11 KiB) | `output.css` es un único archivo compartido por las dos páginas. Tailwind ya purga las clases no usadas; lo que queda sin usar en una página se usa en la otra. |
| `label-content-name-mismatch` (corporativo) | Es una auditoría experimental con peso 0 en el score. Se deja anotada como mejora de accesibilidad futura. |

## Análisis de refactor: lógica y componentes duplicados

### Caso 1: guardado del idioma duplicado (corporativo)

- **Dónde:** el `<script>` inline de `index.html` y `validation.js` (que usa `application.html`) definían cada uno la misma constante `LANGUAGE_STORAGE_KEY = "healthcoreLang"` y las mismas funciones `readSavedLanguage()` y `saveLanguage()`, con el mismo `try/catch` para el modo privado.
- **Por qué es candidato:** es la **misma regla de negocio** (qué idioma eligió la persona y dónde se guarda) copiada en dos archivos. Si cambia la clave o se agrega un idioma, hay que acordarse de editar ambos; si no, las páginas dejan de compartir la preferencia sin dar ningún error.
- **Abstracción:** un módulo `assets/js/lang-storage.js` que expone `window.HealthCoreLang.{ read, save }`, con la lista de idiomas soportados en un solo lugar. Además es un archivo cacheable, a diferencia del script inline.

### Caso 2: lógica de datos y llamadas a la API en `/suppliers` (backoffice) → Custom Hook

- **Dónde:** `app/suppliers/page.tsx`. El patrón `fetch → if (!res.ok) throw new Error(...) → catch → setError` se repetía **4 veces** (listar, crear, cambiar tarifa, cambiar estado), y toda la lógica de datos estaba mezclada con más de 300 líneas de JSX.
- **Por qué es candidato:** son responsabilidades distintas (datos vs. presentación) dentro de un mismo componente, y el manejo de errores de la API (incluido el formato `detail[]` de Pydantic) está duplicado con pequeñas variaciones.
- **Abstracción:**
  - `lib/suppliers-api.ts`: `apiRequest<T>()` como único punto de entrada a la API (URL base, JSON, normalización de errores), más `getSuppliers()` y el tipo `Supplier`. Se puede usar tanto en el servidor como en el cliente.
  - `hooks/useSuppliers.ts`: un Custom Hook que gestiona la lista, los filtros, el estado de carga/error y las mutaciones (`createSupplier`, `updateRate`, `toggleStatus`). La página solo maneja el estado del formulario.

### Caso 3: el par label + control repetido 7 veces (backoffice) → componente

- **Dónde:** `app/suppliers/page.tsx`: filtros (País, Categoría) y formulario (Nombre, País, Tarifa, Email, Notas). Siempre era el mismo `<div><label className="block text-xs …">…</label><input|select|textarea/></div>`.
- **Por qué es candidato:** además de ser marcado duplicado, **es la causa del problema de accesibilidad #4**. Si se corrige en un solo componente, el error no puede volver a aparecer en campos nuevos.
- **Abstracción:** `components/Field.tsx`: `<Field label="…">{control}</Field>`, que genera un `id` estable con `useId()` y lo conecta a `htmlFor` y al control.

## Agent skills utilizadas

Instaladas con `npx skills add addyosmani/web-quality-skills --skill core-web-vitals --skill performance` (ver `.agents/skills/` y `skills-lock.json`). Así guiaron cada corrección:

| Recomendación de la skill | Aplicada en |
|---|---|
| *core-web-vitals → CLS:* "allocate a stable container before the content arrives"; no insertar contenido dinámico sin reservar espacio | Problema 1: los datos llegan en el HTML del servidor, así que el contenedor es estable desde el primer pintado |
| *core-web-vitals → LCP checklist:* "LCP resource is discoverable in initial HTML and prioritized"; imágenes del tamaño correcto | Problema 2: `srcset`/`sizes`; se mantiene el `fetchpriority="high"` que ya existía y no se agrega un preload redundante (la skill advierte que los preloads duplicados compiten por ancho de banda) |
| *core-web-vitals → LCP:* "Fonts don't block text rendering"; *performance → font optimization:* preload de la fuente crítica + `font-display: swap` | Problema 3: Manrope alojada en el propio sitio con `<link rel="preload" as="font">` |
| *core-web-vitals:* "Measure before optimizing… do not claim failure without runtime evidence" | Metodología: 3 corridas con mediana, en producción, antes y después de cada cambio |
