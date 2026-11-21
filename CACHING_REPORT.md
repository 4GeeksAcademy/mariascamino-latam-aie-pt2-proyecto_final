# Caching Report — HealthCore (backoffice + API)

**Rama:** `feature/caching-optimisation` · **Base:** `feature/serialization-audit` (todavía no está fusionada en `main`; el PR de esta rama solo agrega los cambios de caching sobre ella).

Regla de este trabajo: **primero medir y después cachear.** Cada decisión de esta página se apoya en un número medido con las herramientas de la sección 1. Las evidencias crudas están en [`docs/caching-evidence/`](docs/caching-evidence/).

---

## 1. Cómo se midió

| Herramienta | Qué hace | Dónde |
|---|---|---|
| **Middleware de tiempos** | Una línea de log por request: `GET /inventory/products → 200 \| 34.5ms \| cache=MISS`. También devuelve la duración en el header `X-Response-Time-ms`. | `services/api/main.py` |
| **Seeder de carga** | Hace crecer las tablas que leen los endpoints más pesados, con datos variados: 14 sedes, 9 categorías, 12 clínicas, fechas repartidas en un año y FKs válidas. Las consumiciones nunca superan las entregas, así que el stock nunca queda negativo. Es determinista (`seed 42`) y no duplica datos si se corre dos veces. | `services/api/seed_load.py` |
| **Benchmark del backend** | Llama 30 veces a cada endpoint de lectura con la misma URL y parámetros (como un dashboard que se refresca) y reporta 1ª llamada, p50 y p95, tamaño y cuántas respuestas vinieron del cache. | `services/api/bench_latency.py` |
| **Benchmark del frontend** | Abre la build de producción en Chromium (Playwright). Mide los KB de JS en la primera carga, los chunks que se descargan después de una interacción y el tiempo hasta que la tabla aparece en pantalla. | `uis/backoffice/scripts/measure-js.mjs` |

Para reproducirlo:

```bash
cd services/api
uv run python seed_load.py            # crecer el dataset
uv run python bench_latency.py -n 30  # tabla de latencias
```

### 1.1 Volumen de datos antes y después del seeder

| Tabla | Antes (seeds normales) | Después (`seed_load.py`) |
|---|---|---|
| Incidentes (TinyDB) | 94 | 6 094 |
| Proveedores (TinyDB) | 15 | 415 |
| Insumos médicos (SQL) | 6 | 246 |
| Órdenes: entregas + consumos (SQL) | 10 | 24 010 |
| Tamaño de `db.json` | ~40 KB | 2,4 MB |

### 1.2 Latencias medidas (p50 de 30 llamadas, en el servidor)

| Endpoint | Dataset chico | Dataset de carga **sin cache** | Dataset de carga **con cache** |
|---|---|---|---|
| `GET /api/incidents/summary` | 1,2 ms | **17,4 ms** (p95 37 ms) | **0,7 ms** (29/30 HIT) |
| `GET /inventory/products` | 3,7 ms | **25,6 ms** (p95 34 ms) | **12,7 ms** (29/30 HIT) |
| `GET /api/incidents` | 1,5 ms | 54,0 ms · 1,2 MB | sin cambio (no se cachea) |
| `GET /suppliers` | 2,1 ms | 24,8 ms | sin cambio (no se cachea) |
| `GET /inventory/orders` | 3,6 ms | **652 ms · 6,3 MB** | sin cambio (no se cachea) |
| `GET /auth/me` | 2,0 ms | 32,3 ms | sin cambio (no se cachea) |

**Lección principal:** con el dataset chico, todo tardaba entre 1 y 4 ms y la tabla no servía para decidir nada. Con datos realistas aparecieron dos causas distintas de lentitud:

1. **TinyDB lee el archivo `db.json` completo en cada operación.** Con 2,4 MB eso son unos 10 ms por lectura (medido: `users_table.get(1)` 9,8 ms; `incidents_table.all()` 16,4 ms). Por eso **todas** las rutas autenticadas pagan unos 10 ms solo por validar al usuario en `get_current_user`.
2. **`/inventory/orders` no tiene paginación.** De sus 652 ms, unos 320 ms son la consulta y la hidratación ORM de 24 000 filas, y el resto es serializar 6,3 MB de JSON.

Los dos tienen soluciones que **no son cache** (sección 5). El cache se usó solo donde el patrón calza: mucho costo de cómputo, respuesta idéntica para todos y datos que cambian poco.

---

## 2. Decisiones de backend

Implementación: `services/api/cache.py`, un `TTLCache` en memoria del proceso.

- **TTL obligatorio:** `set()` rechaza un TTL ≤ 0, así que nada vive para siempre.
- **Claves con namespace** (`incidents:summary`, `inventory:products`): cada escritura invalida su namespace completo.
- **Thread-safe:** FastAPI ejecuta los endpoints sync en un thread pool, por eso hay un `Lock`.
- **Protección contra una carrera:** si una escritura invalida mientras otro request todavía está calculando, ese resultado viejo **no** se guarda. Para eso hay un contador de generación por namespace (test: `test_write_during_a_slow_read_is_not_overwritten_by_stale_data`).
- **Header `X-Cache: HIT | MISS`** en los endpoints cacheados, para verificar el comportamiento en DevTools y en el log.

**¿Por qué en memoria y no Redis?** La API corre como **un solo proceso** de uvicorn (`services/Dockerfile` de la rama de infraestructura arranca `uvicorn main:app` sin `--workers`). Un diccionario es la opción correcta más barata: no agrega servicios, no agrega saltos de red y no hay que serializar. Este diseño deja de servir si se escala a varios workers o contenedores: cada uno tendría su propia copia y una invalidación en un worker no llegaría a los demás. En ese momento se mueve la misma interfaz (`get_or_set` / `invalidate`) a Redis y la invalidación pasa a ser un `DEL` del namespace.

### 2.1 `GET /api/incidents/summary` — cacheado

| Eje | Evidencia |
|---|---|
| **Costo** | Lee **todos** los incidentes (6 094 documentos, archivo de 2,4 MB) y los cuenta por 4 dimensiones. p50 17,4 ms y p95 37 ms. El costo crece linealmente con el histórico, y el histórico solo crece. |
| **Frecuencia (estimada)** | Es la vista de resumen del equipo de operaciones. Se abre al entrar al módulo y cada vez que alguien vuelve desde la lista. Varias personas por sede la miran durante el día (14 sedes): del orden de cientos de lecturas por día, concentradas en la mañana. |
| **Estabilidad** | Solo cambia cuando se crea un incidente o cambia su estado. Con el ritmo del seed (unos 6 000 por año, ~16 por día, más ~2 cambios de estado por incidente) son unas 50 escrituras al día frente a cientos de lecturas. |
| **¿Datos privados?** | No. La respuesta es igual para cualquier persona (son conteos agregados, sin datos de pacientes). Una **clave compartida** es segura. |
| **TTL** | **60 s.** |
| **Invalidación** | `POST /api/incidents` y `PATCH /api/incidents/{id}/status` llaman a `cache.invalidate("incidents:summary")` después de escribir. Un POST que falla la validación (400) **no** invalida (test `test_failed_write_keeps_the_cache`). |
| **Resultado** | 17,4 ms → **0,7 ms** p50 (−96 %). En el log se ve el ciclo completo: `MISS 38.5ms` → `HIT 1.0ms` → `POST /api/incidents` → `MISS 18.3ms`. |

### 2.2 `GET /inventory/products` — cacheado

| Eje | Evidencia |
|---|---|
| **Costo** | Calcula el stock de cada insumo con dos `GROUP BY` sobre 24 000 órdenes más dos `LEFT JOIN`: 14,6 ms solo la consulta en SQLite local. **En producción la consulta va a Supabase por red** (pooler en `us-west-2`), así que a cada MISS se le suma al menos un viaje de red. Ese costo extra no se midió aquí; el cache también lo evita. |
| **Frecuencia (estimada)** | Es el endpoint más reutilizado del frontend: lo llaman **tres pantallas** (la lista de insumos y los selectores de los formularios de entrada y de consumo). Registrar una orden implica abrir el formulario (1 lectura) y volver a la lista (otra lectura). Al inicio del turno, cuando las clínicas revisan stock, las lecturas llegan en ráfagas. |
| **Estabilidad** | Cambia con cada orden registrada (~100 por día según el dataset) o insumo creado. Es menos estable que el resumen, por eso el TTL es más corto. |
| **¿Datos privados?** | La ruta exige login, pero la respuesta **es la misma para todos los usuarios**: catálogo y stock, sin campos por usuario (`user_uuid` ya no se expone desde la auditoría de serialización). Por eso se usa **clave compartida**. Un HIT **no** se salta la autenticación: el `Depends(get_current_user)` del router corre antes que el cache (test `test_products_cache_is_shared_but_still_requires_login`). |
| **TTL** | **30 s.** |
| **Invalidación** | `POST /inventory/products`, `POST /inventory/orders/inbound` y `POST /inventory/orders/outbound` invalidan `inventory:products` justo después del `commit()`. |
| **Resultado** | 25,6 ms → **12,7 ms** p50 (−50 %). Los ~12 ms que quedan son la autenticación (lectura de TinyDB, ver sección 5), no el inventario. |

**Regla de seguridad:** la validación de stock de un consumo **nunca** usa el cache. `register_consumption` lee el stock de la base de datos con la fila bloqueada (`SELECT … FOR UPDATE`). El test `test_outbound_stock_check_ignores_a_stale_cache` deja el cache desactualizado a propósito y comprueba que la API igual rechaza el consumo. El cache solo afecta lo que se **muestra**, nunca lo que se **permite**.

---

## 3. Tradeoffs de frescura reconocidos

### 3.1 ¿Por qué se acepta que el stock mostrado tenga hasta 30 s de antigüedad?

Dentro del proceso de la API, la invalidación hace que cualquier escritura se vea **de inmediato**. El TTL solo cubre las escrituras que **la API no ve**:

- el script `seed_inventory.py` / `seed_load.py`,
- un cambio hecho a mano en el dashboard de Supabase,
- un segundo worker, si algún día se escala.

En esos casos, el número de stock de la lista o del selector puede tener hasta 30 s de atraso. Se aceptó porque:

1. **No puede causar un error de negocio.** El caso peligroso (consumir más de lo que hay) lo bloquea la base de datos, no el número en pantalla. Lo peor que pasa es que alguien ve "120" cuando hay 110, intenta consumir 115 y la API le responde *"Insufficient stock… Available: 110"*.
2. **30 s es menos que el tiempo real de una operación de inventario.** Recibir y contar una entrega toma minutos. Nadie toma una decisión que dependa de una diferencia de segundos.
3. **Un TTL más largo (5 min) no ahorraría más.** Las órdenes ya invalidan seguido. Alargarlo solo alargaría la ventana de error en los casos externos, que son justo los que no se ven venir.

### 3.2 ¿Por qué el resumen de incidentes tiene un TTL más largo (60 s)?

Es una vista de **tendencias**: "¿cuántos abiertos hay por sede?". Un conteo con un minuto de atraso, y solo cuando la escritura vino de fuera de la API (por ejemplo, `scripts/seed_incidents.py` importando el CSV), no cambia ninguna decisión. Los datos cambian menos que el stock, así que se puede tolerar más atraso con menos riesgo.

### 3.3 Costo del cache en memoria

Las dos entradas pesan unos 35 KB (la lista de insumos) y menos de 1 KB (el resumen). No hace falta límite de tamaño ni LRU: el número de claves es fijo (no dependen de parámetros del request).

---

## 4. Decisiones de frontend

Evidencias: `docs/caching-evidence/frontend-1-before.txt` y `frontend-2-after.txt` (Playwright sobre `next build && next start`, con el dataset de carga).

> **Nota sobre cómo leer "first-load JS".** En producción, Next.js **pre-carga** (*prefetch*) el JS de las rutas enlazadas en el menú. Por eso todas las páginas muestran ~560 KB: ese número incluye las rutas vecinas. Para saber si un componente quedó realmente diferido, se revisa si **su chunk** aparece o no en la primera carga.

### 4.1 Lazy loading #1 — `NewSupplierForm` (formulario "Registrar nuevo proveedor")

- **Antes:** el formulario vivía dentro de `SuppliersDirectory`, siempre renderizado debajo de la tabla, y su estado (`form`) estaba en el mismo componente que la tabla.
- **Por qué diferirlo:**
  1. **Está debajo del fold y se usa en pocas visitas.** La mayoría de las visitas al directorio son para consultar o editar tarifas. Registrar un proveedor es ocasional.
  2. **Al teclear se re-renderizaba toda la tabla.** Como el estado del formulario estaba en el mismo componente, cada tecla en "Nombre" volvía a renderizar las 415 filas. El React Profiler lo marca como re-render sin cambio real de props de la tabla.
- **Implementación:** `next/dynamic(() => import("./NewSupplierForm"))`. Se renderiza recién al hacer clic en "▸ Registrar nuevo proveedor". Al pasar el mouse o hacer foco sobre el botón se dispara el `import()` por adelantado (*warm-up*), así que normalmente el formulario ya está descargado cuando llega el clic. El estado del formulario vive ahora **dentro** del componente lazy.
- **Medido:**

| | Antes | Después |
|---|---|---|
| JS del formulario en la primera carga | incluido | **0 KB**: chunk `3m7w…js` (3,5 KB) descargado **solo al abrir el formulario** |
| Trabajo de React por tecla en "Nombre" (mediana de 36 teclas) | **17,8 ms** | **1,0 ms** |

El ahorro en bytes es pequeño porque el formulario no usa librerías pesadas. **La ganancia real es la segunda fila:** 17,8 ms por tecla consumía más de la mitad del presupuesto de un frame (16 ms). En un equipo lento eso se notaría como un input que se traba.

### 4.2 Lazy loading #2 — `ErrorState` → `LazyErrorState`

- **Antes:** `ErrorState` se importaba de forma estática en el **layout protegido** `(app)/layout.tsx`. Eso lo metía en el bundle de **todas** las páginas del backoffice, aunque solo se muestra cuando algo falla (API caída o sesión que no se pudo validar).
- **Por qué diferirlo:** es exactamente el caso de un componente que solo se necesita en ciertos flujos. Se paga en cada carga y se usa en casi ninguna.
- **Implementación:** `components/LazyErrorState.tsx` envuelve `ErrorState` con `next/dynamic`. Mientras llega el chunk, muestra un placeholder con `role="alert"` para que un lector de pantalla igual anuncie el error. Lo usan el layout, incidentes, el resumen de incidentes y proveedores.
- **Medido:** el chunk de `ErrorState` (1,1 KB) **no aparece** en la primera carga de `/suppliers` y se descarga solo cuando se muestra un error.
- **Excepción deliberada:** `app/error.tsx` (el *error boundary* de Next.js) sigue importando `ErrorState` de forma estática. Ese boundary se muestra justamente cuando algo se rompió, y eso puede incluir que **no se pueda descargar un chunk**. Si el boundary dependiera de otra descarga, podría fallar justo cuando se lo necesita. Se aceptó ~1 KB duplicado a cambio de robustez.
- **Honestidad sobre el impacto:** el ahorro en bytes es ~1 KB. Se implementó porque el patrón es correcto y se paga en todas las pantallas. La conclusión de esta parte de la auditoría es que **el backoffice no tiene hoy componentes pesados** (sin librerías de gráficos, editores ni mapas), y el *code splitting* por ruta del App Router ya separa las páginas. El próximo componente pesado que entre (por ejemplo, gráficos en el resumen de incidentes) debe entrar con `next/dynamic` desde el principio.

### 4.3 `useMemo` — historial de órdenes (`/inventory/orders`)

Con 24 010 órdenes, la página tardaba **~7 s** en mostrar la tabla. Al perfilar se encontraron tres costos, y solo uno se resuelve con `useMemo`:

| Costo | Medido | Arreglo |
|---|---|---|
| Renderizar 24 010 filas en el DOM | la mayor parte de los 7 s | Render incremental: 200 filas y un botón "Show N more" |
| `toLocaleString(...)` por fila: crea un `Intl.DateTimeFormat` nuevo en **cada** llamada | 9,96 ms cada 200 filas; **1 206 ms** para las 24 010 | Un único `Intl.DateTimeFormat` a nivel de módulo: 0,26 ms cada 200 filas (38× más rápido) |
| Totales del histórico (unidades entregadas y consumidas, % de merma, insumo más consumido) | una pasada O(n) con un `Map` sobre 24 010 órdenes | **`useMemo`** |

**El `useMemo`:**

```tsx
const totals   = useMemo(() => summarizeOrders(orders), [orders]);
const filtered = useMemo(() => filterOrders(orders, typeFilter), [orders, typeFilter]);
const visible  = filtered.slice(0, visibleCount); // barato: no se memoiza
```

- **Por qué no es trivial:** `summarizeOrders` recorre **todo** el histórico, que crece con cada orden registrada, y arma un `Map` por insumo. No es un `a + b`.
- **Por qué las dependencias son correctas:** `totals` depende solo de `orders`, el array que devuelve la API, que se reemplaza solo cuando llega una carga nueva. Cambiar el filtro de tipo o hacer clic en "Show more" re-renderiza la página **sin** recalcular los totales. `filtered` depende de `orders` y `typeFilter`, y con "Show more" no se vuelve a filtrar: solo se toma un trozo más grande del mismo array.
- **Qué NO se memoizó y por qué:** `visible` (un `slice` de un array ya filtrado, que cuesta microsegundos) y `formatDateTime` por fila. Memoizar eso agrega complejidad sin beneficio, que es lo que pide el enunciado evitar.
- **Beneficio medido / estimado:** `summarizeOrders` sobre 24 010 órdenes tarda ~0,5 ms en Node. Lo que se gana es **no pagarlo en cada re-render** (cambio de filtro, "Show more"). En un móvil de gama media, con la CPU 4–6× más lenta, son 2–3 ms por interacción. **El ahorro grande de la página (7 s → 1,5 s) viene del render incremental y del formatter compartido, no del `useMemo`.** El `useMemo` asegura que, al agregar una vista derivada costosa (los totales), esa mejora no se pierda.
- **Tests:** `__tests__/inventory-orders.test.ts` cubre `summarizeOrders` y `filterOrders`, que son funciones puras en `lib/inventory.ts`.

| `/inventory/orders` | Antes | Después |
|---|---|---|
| Tiempo hasta ver la tabla | **6 983 ms** | **1 523 ms** |
| Filas en el DOM | 24 010 | 200 (+200 por clic) |

Los ~1,5 s que quedan son el endpoint (650 ms y 6,3 MB). La solución para eso es la paginación en el backend (sección 5).

---

## 5. Qué NO se cacheó (y por qué)

| Candidato | Por qué parecía buena idea | Por qué no se hizo | Qué hacer en su lugar |
|---|---|---|---|
| `GET /inventory/orders` | Es el endpoint **más lento** (652 ms, 6,3 MB) | (1) Lo invalida **cada** orden, que es la escritura más frecuente del módulo, así que el hit rate sería bajo. (2) Aunque viniera del cache, seguiría enviando 6,3 MB y el navegador seguiría parseándolos: el cache escondería el problema real, que es devolver el histórico completo. | **Paginación** (`?limit=&offset=` o cursor por `created_at`), recomendada para el siguiente sprint. El frontend ya muestra de a 200 filas, así que solo falta pedirlas de a 200. |
| `GET /api/incidents` (lista con filtros) | 54 ms y 1,2 MB | (1) Hay **4 filtros combinables**, que dan cientos de claves posibles con poco reuso cada una. (2) La pantalla cambia estados con *optimistic update* y vuelve a pedir la lista: un dato viejo haría que la fila "salte" al estado anterior. (3) La frescura importa más que en el resumen: es la lista de trabajo del equipo. | Paginación, igual que en órdenes. |
| `GET /auth/me` y `get_current_user` | Todas las rutas autenticadas pagan ~10 ms leyendo `db.json` | **Datos personales y de seguridad.** Cachear el usuario retrasaría hasta el TTL una desactivación (`is_active=false`) o un cambio de rol. Cachear `/auth/me` con clave compartida sería una fuga de datos; con clave por usuario seguiría teniendo el problema de la revocación. | El costo viene de que TinyDB **lee el archivo completo en cada operación**. La solución es migrar `users` a Postgres (como el inventario). El `CachingMiddleware` de TinyDB **no** es una opción segura: cachea escrituras y con dos procesos (API + seed) se pierden datos. |
| `GET /suppliers` | 24,8 ms | El cache solo ahorraría la lectura de proveedores (~10 ms). Los otros ~10–15 ms son la autenticación, que se paga igual. Es la pantalla de compras: pocas visitas y con ediciones de tarifa. Ahorrar ~10 ms en un endpoint poco frecuente no justifica otro namespace que invalidar en 4 escrituras. | Volver a evaluarlo si el directorio pasa a ser consultado por otro servicio. |
| `GET /inventory/products/{id}` | Comparte la consulta de stock | Ninguna pantalla lo llama hoy, así que no tiene frecuencia. | — |
| Componentes por ruta (`/incidents/new`, formularios de órdenes) | Son los formularios más grandes | El App Router de Next.js **ya** separa cada página en su propio chunk. Ponerles `next/dynamic` encima no ahorra nada. | — |

---

## 6. Verificación

- **Backend:** `uv run pytest` → **141 tests pasan**: los 129 anteriores y 12 nuevos en `tests/test_caching.py`. Cubren el TTL con reloj falso, la invalidación por namespace, el TTL obligatorio, la carrera escritura/lectura, MISS→HIT→MISS en ambos endpoints tras cada tipo de escritura, que un 400 no invalida, que la clave compartida sigue exigiendo login y que el stock check ignora el cache. `conftest.py` vacía el cache entre tests.
- **Frontend:** `tsc --noEmit` sin errores, `next build` OK y **38 tests de Jest** (32 anteriores y 6 nuevos).
- **Prueba manual en el navegador (Playwright):** el formulario lazy abre, se puede llenar y crea el proveedor, que aparece en la tabla. El historial muestra los totales, el filtro y "Show more" (`Showing 400 of 12,004 orders`). Capturas: [`docs/caching-evidence/01-orders-totals-and-paging.png`](docs/caching-evidence/01-orders-totals-and-paging.png) y [`02-suppliers-lazy-form-open.png`](docs/caching-evidence/02-suppliers-lazy-form-open.png).
- **Log del middleware** con el ciclo de invalidación: [`docs/caching-evidence/backend-4-timing-middleware-log.txt`](docs/caching-evidence/backend-4-timing-middleware-log.txt).

**Limitaciones de las mediciones:** el backend se midió en local con SQLite en lugar de Supabase, por eso los tiempos de inventario en producción serán **mayores** (red al pooler) y el beneficio del cache también. Las frecuencias de uso son **estimaciones** derivadas del volumen del seed (24 000 órdenes y 6 000 incidentes por año en 12 clínicas), no telemetría real. El siguiente paso sería dejar el middleware de tiempos activo en el VPS una semana y recalcular.
