# REPORT.md — Mejoras aplicadas e impacto medido

Mismas condiciones que en [AUDIT.md](AUDIT.md): build de producción, Lighthouse 12.8 CLI, 3 corridas y se toma la mediana. Evidencia: [`audit/before/`](audit/before/) vs. [`audit/after/`](audit/after/), con los reportes HTML completos en cada carpeta `reports/`.

## Comparación antes → después

| Frontend | Página | Modo | Performance | Accesibilidad | Best Practices | SEO | LCP | CLS | FCP |
|---|---|---|---|---|---|---|---|---|---|
| Corporativo | Home | Mobile | 83 → **99** | 100 → 100 | 96 → **100** | 100 → 100 | 4.1 s → **2.0 s** | 0 → 0 | 2.6 s → **0.9 s** |
| Corporativo | Home | Desktop | 98 → **100** | 100 → 100 | 96 → **100** | 100 → 100 | 1.0 s → **0.4 s** | 0.003 → 0 | 0.8 s → **0.2 s** |
| Corporativo | Application | Mobile | 99 → **100** | 100 → 100 | 96 → **100** | 100 → 100 | 1.6 s → 1.6 s | 0.027 → **0** | 1.6 s → **0.9 s** |
| Corporativo | Application | Desktop | 99 → **100** | 100 → 100 | 96 → **100** | 100 → 100 | 0.8 s → **0.4 s** | 0 → 0 | 0.8 s → **0.4 s** |
| Backoffice | Suppliers | Mobile | 83 → **99** | 91 → **100** | 96 → **100** | 100 → 100 | 2.2 s → **1.1 s** | 0.316 → **0** | 0.8 s → 0.8 s |
| Backoffice | Suppliers | Desktop | 79 → **100** | 91 → **100** | 96 → **100** | 100 → 100 | 0.5 s → 0.5 s | 0.517 → **0** | 0.2 s → 0.2 s |
| Backoffice | Home | Mobile | 100 → 100 | 100 → 100 | 96 → **100** | 100 → 100 | 1.6 s → 1.2 s | 0 → 0 | 0.8 s → 0.8 s |
| Backoffice | Home | Desktop | 100 → 100 | 100 → 100 | 96 → **100** | 100 → 100 | 0.5 s → 0.4 s | 0 → 0 | 0.2 s → 0.2 s |

**Peso total de la home corporativa:** 694 KB → 213 KB en mobile (−69 %) y 252 KB en desktop.

Todos los Core Web Vitals quedan en rango "bueno": LCP < 2.5 s, CLS < 0.1, TBT < 200 ms. TTFB sigue siendo despreciable (≤ 22 ms).

## Correcciones aplicadas (un commit por cambio)

| # | Commit | Problema (AUDIT.md) | Qué se hizo | Impacto medido |
|---|---|---|---|---|
| 1 | `refactor(backoffice): extract useSuppliers hook and apiRequest helper` | Refactor, caso 2 | Se extrajo `hooks/useSuppliers.ts` (Custom Hook) y `lib/suppliers-api.ts` (`apiRequest`), eliminando 4 bloques duplicados de fetch y manejo de errores. | Sin cambio funcional; es la base del commit #2. |
| 2 | `perf(backoffice): server-render initial supplier list…` | #1 CLS | `page.tsx` pasa a ser un Server Component que llama a `getSuppliers()` y le entrega `initialSuppliers` al Client Component (`SuppliersDirectory.tsx`). El hook omite el primer fetch del cliente porque los datos ya vienen en el HTML. `dynamic = "force-dynamic"` mantiene los datos frescos en cada request. Si la API no responde, se usa el fetch del cliente como respaldo. | **CLS 0.517 → 0** (desktop) y 0.316 → 0 (mobile). Perf 79 → 100 / 83 → 99. LCP mobile 2.2 → 1.1 s. |
| 3 | `refactor(backoffice): extract <Field> component…` | #4 A11y, refactor caso 3 | Se creó `components/Field.tsx` con `useId()`, que reemplaza 7 pares label/control. Las categorías pasan a `<fieldset>/<legend>`, los checkboxes usan `sr-only` en vez de `hidden` y la columna de acciones tiene un `<th>` con texto para lectores de pantalla. | **Accesibilidad 91 → 100.** |
| 4 | `fix(backoffice): add app icon…` | #5 | Se agregó `app/icon.svg`; Next.js inyecta el `<link rel="icon">` automáticamente. | Best Practices 96 → 100. |
| 5 | `perf(corporate): serve responsive images with srcset/sizes` | #2 LCP | Se generaron variantes WebP de 480w y 800w y se agregaron `srcset` + `sizes` ajustados al layout real (hero, servicios y ubicaciones). | **LCP mobile 4.1 → 2.6 s**, Perf 83 → 93. Hero en mobile: 210 KB → 20 KB. |
| 6 | `perf(corporate): self-host Manrope with preload…` | #3 Render-blocking | Se quitó Google Fonts y se agregaron los `.woff2` (latin 400/700) en `assets/fonts`, con `@font-face` + `font-display: swap` en `src/styles.css` y `<link rel="preload" as="font">` en ambas páginas. | **FCP mobile 2.5 → 0.9 s**, LCP 2.6 → 1.9 s, Perf 93 → 100 (en la medición individual). |
| 7 | `fix(corporate): add SVG favicon…` | #5 | Se agregó `assets/favicon.svg` (el mismo logo del header) y se declaró en ambas páginas. | Best Practices 96 → 100. |
| 8 | `refactor(corporate): extract shared language storage…` | Refactor, caso 1 | Se creó `assets/js/lang-storage.js` (`window.HealthCoreLang`), que usan `index.html` y `validation.js`. | Sin cambio en los scores; −37 líneas duplicadas. |

El script de build (`package.json`) se actualizó para copiar `assets/fonts`, `assets/js` y el favicon a `dist/`.

## Verificación de que no hay regresiones

- **Backoffice:** se probó end-to-end con Playwright contra el build de producción: carga inicial (15 filas sin "Cargando…"), filtro por país (6 filas UK), alta de proveedor con categoría (clic en la píldora → checkbox marcado), actualización de tarifa y suspensión. Todo funciona y no hay errores en consola. `tsc --noEmit` y `next build` pasan sin errores.
- **Corporativo:** se probó el cambio de idioma ES ↔ EN, la persistencia de la preferencia entre `index.html` y `application.html`, y la carga real de Manrope (`document.fonts.check`). No hay errores en consola.

## ¿Qué tuvo más impacto?

1. **Server-render de los datos del backoffice (commit 2).** Es el cambio con mayor efecto en un solo paso: CLS bajó de 0.517 (el rango "pobre") a 0 y Performance subió 21 puntos en desktop. La lección es que el problema no era visual sino de **arquitectura de carga de datos**: con un fetch en `useEffect`, el primer pintado nunca muestra el contenido real. En un dashboard que el equipo usa todo el día, esto además elimina el parpadeo en cada carga.
2. **Imágenes responsivas (commit 5).** Fue la mayor reducción de bytes (−69 % en la home) y la mayor mejora de LCP en mobile (−1.5 s). Es el arreglo de más alto retorno para el SEO del sitio corporativo, porque Google indexa con un perfil mobile.
3. **Fuente alojada en el propio sitio (commit 6).** Redujo el FCP mobile a un tercio al sacar dos orígenes externos de la ruta crítica.

## Compromisos y notas

- **TTFB de `/suppliers`:** sube de unos 10 ms a unos 20 ms porque ahora el servidor espera la respuesta de la API antes de enviar el HTML. Es un intercambio aceptable (el CLS mejora de 0.5 a 0). Si la API se volviera lenta, el siguiente paso sería usar streaming con `<Suspense>` y un *skeleton* del mismo alto.
- **Tamaño de la página `application.html`:** pasa de 100 a 105 KB porque ahora se precargan las dos variantes de la fuente desde el propio sitio. A cambio, ya no bloquean el render ni dependen de un tercero.
- Los scores de laboratorio varían ±1–3 puntos entre corridas; por eso se usa la mediana de 3. El objetivo siguiente sería validar con datos de campo (CrUX / `web-vitals`) una vez desplegado.
