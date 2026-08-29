# Coding Standards — HealthCore Monorepo

> **Scope de aplicación:** Siempre activo. Aplica a `uis/**/*.ts`, `uis/**/*.tsx`, `src/**/*.ts`, `packages/shared/**/*.ts`.

---

## 1. TypeScript — Reglas de tipado

### 1.1 Prohibición de `any`
- **No se permite el uso de `any` en ningún archivo.** Usa tipos explícitos, genéricos (`<T>`), `unknown` (con type narrowing), o importa desde `@/types/candidate` o `src/types.ts`.
- Excepción: solo en archivos `.d.ts` de declaración de tipos externos.

### 1.2 Interfaces vs Types
- Usa **`interface`** para objetos del dominio de negocio (ej. `Claim`, `Appointment`, `Candidate`, `Clinician`).
- Usa **`type`** para uniones, tuplas, utilitarios y objetos que extienden o combinan tipos primitivos (ej. `ClaimStatus`, `ServiceType`, `CandidateFilters`).
- Las interfaces del dominio deben declararse en el archivo de tipos correspondiente (no inline en el componente).

### 1.3 Nombrado de tipos
- **Interfaces de entidades de negocio:** PascalCase con nombre semántico (`PatientInquiry`, `SupplyDelivery`, `CMEReport`).
- **Tipos de estado/unión:** PascalCase con sufijo semántico (`ClaimStatus`, `AppointmentStatus`, `CandidateStage`, `ServiceType`).
- **Tipos de props de componentes:** `{Componente}Props` (ej. `CandidateTableProps`, `StatusBadgeProps`).
- **Tipos de respuesta de API:** `{Entidad}ListResponse`, `{Entidad}Input` (ej. `CandidatesListResponse`, `CandidateInput`).

### 1.4 Strict mode
- `strict: true` en `tsconfig.json`. No desactivar `strictNullChecks`, `noImplicitAny` ni `strictFunctionTypes`.
- Usar `readonly` en props que no deben mutarse.
- Preferir `const` sobre `let` salvo que la variable necesite reasignación explícita.

---

## 2. React / Next.js — Convenciones de componentes

### 2.1 Nombrado de archivos
- **Componentes:** PascalCase, un componente por archivo, nombre del archivo igual al del componente (`CandidateTable.tsx`, `StatusBadge.tsx`).
- **Hooks:** camelCase con prefijo `use` (`useCandidates.ts`, `useCandidate.ts`).
- **Páginas Next.js (App Router):** `page.tsx` dentro de carpetas con el nombre de la ruta.
- **Layouts:** `layout.tsx`.
- **APIs/middleware/libs:** camelCase según responsabilidad (`api.ts`, `http.ts`, `labels.ts`).

### 2.2 Estructura del componente
- **Orden dentro del archivo:**
  1. Imports (librerías externas → tipos locales → componentes locales)
  2. Definición de `{Nombre}Props` (si aplica)
  3. Función componente con `export default` o `export function`
  4. Estilos constantes fuera del componente (si son estáticos)
- **Props:** Definir interfaz `{Nombre}Props` y tipar el parámetro del componente con ella. No usar `React.FC`.
- **Fragmentos:** Usar `<>...</>` (fragment implícito) a menos que se necesite `key`.

### 2.3 Hooks
- Colocar hooks personalizados en `uis/talent-pipeline-tracker/hooks/`.
- Nombrar con prefijo `use` seguido de la entidad (`useCandidates`, `useCandidate`).
- Separar lógica de fetching y estado de la presentación. Los componentes no deben contener lógica de llamadas HTTP directamente.

### 2.4 Server vs Client Components (Next.js App Router)
- Por defecto los componentes son **Server Components**. Solo agregar `"use client"` cuando sea estrictamente necesario (event handlers, `useState`, `useEffect`, `useContext`, hooks del navegador).
- Los hooks (`useCandidates`, `useCandidate`) y componentes de interacción (`Filters.tsx`, `CandidateForm.tsx`, `NotesPanel.tsx`) deben marcarse con `"use client"`.

---

## 3. Estilos con Tailwind CSS

### 3.1 Sitio público (Hito 1 — `index.html`, `application.html`)
- Tailwind CSS v3 vía CDN: `<script src="https://cdn.tailwindcss.com"></script>`.
- No crear archivos CSS personalizados salvo que sea estrictamente necesario.
- Usar clases utilitarias de Tailwind directamente en el HTML. No usar `@apply` en CSS propio.

### 3.2 Portal Next.js (Hito 3 — `uis/talent-pipeline-tracker/`)
- Tailwind CSS v4 con PostCSS (configuración en `postcss.config.mjs`).
- Preferir clases utilitarias de Tailwind sobre CSS modules o styled-components.
- Los colores, espaciados y tipografía deben usar las variables de diseño de Tailwind (`text-gray-900`, `bg-blue-600`, `p-4`, `text-sm`, etc.).

### 3.3 Reglas generales de estilo
- **Mobile-first:** Todas las clases responsive deben usar el patrón `sm:`, `md:`, `lg:` (ej. `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
- **Accesibilidad:** Usar `focus:ring-2`, `focus:outline-none`, `aria-*` en elementos interactivos. Textos con suficiente contraste (`text-gray-900` sobre fondo blanco, no `text-gray-300`).
- **No mezclar Tailwind con CSS inline** a menos que sea para valores dinámicos calculados en JS.

---

## 4. Convenciones de imports y estructura de archivos

### 4.1 Orden de imports
1. Módulos de Node/Next/React (`next`, `react`, `next/navigation`)
2. Librerías externas
3. Tipos locales (`@/types/...`, `../../src/types`)
4. Componentes locales (`@/components/...`)
5. Hooks locales (`@/hooks/...`)
6. Librerías/APIs locales (`@/lib/...`)
7. Estilos/Assets (si aplica)

Cada grupo separado por una línea en blanco.

### 4.2 Path aliases (Next.js)
- Usar `@/` como alias para la raíz del proyecto en `uis/talent-pipeline-tracker/`.
- Ejemplo: `import { Candidate } from "@/types/candidate"` en lugar de `../../types/candidate`.

### 4.3 Ubicación de archivos por responsabilidad

| Carpeta                        | Contenido                                           |
| ------------------------------ | --------------------------------------------------- |
| `src/`                         | Lógica TypeScript pura (sin React) — Hito 2         |
| `src/utils/`                   | Funciones auxiliares sin estado                     |
| `uis/talent-pipeline-tracker/` | Aplicación Next.js standalone (Hito 3)              |
| `uis/talent-pipeline-tracker/components/` | Componentes React                           |
| `uis/talent-pipeline-tracker/hooks/`      | Custom hooks React                           |
| `uis/talent-pipeline-tracker/lib/`        | Utilidades HTTP, API, mapeo de etiquetas     |
| `uis/talent-pipeline-tracker/types/`      | Tipos específicos de la app de candidatos    |
| `packages/shared/`             | Tipos compartidos entre todos los paquetes           |
| `services/`                    | APIs backend (FastAPI/SQLModel) — Hito 5+           |

---

## 5. Convenciones de nombrado específicas del dominio HealthCore

| Concepto                 | Convención                                                  |
| ------------------------ | ----------------------------------------------------------- |
| IDs de clínicas          | Formato: `{país}-{estado}-{número}` (ej. `us-tx-001`)      |
| IDs de claims            | Formato: `CLM-` + 6 dígitos (ej. `CLM-000042`)             |
| IDs de pacientes         | Formato: `HC-` + 6 alfanuméricos (ej. `HC-A3F291`)         |
| IDs de appointments      | Formato: `APT-` + 6 dígitos (ej. `APT-000001`)              |
| IDs de clinicians        | Formato: `CLN-` + 6 dígitos (ej. `CLN-000001`)             |
| Nombres de clínicas      | "HealthCore" + ciudad + ubicación (ej. "HealthCore Austin Central") |
| Valores en API (raw)     | snake_case (`in_progress`, `personal_interview`, `primary_care`) |
| Labels en UI             | Traducidas, sin snake_case — usar `labels.ts` como mapper   |

---

## 6. Funciones puras y sin efectos secundarios

- Las funciones de lógica de negocio en `src/utils/` **no deben mutar** los parámetros de entrada. Usar spread operator (`...`) o `Array.toSorted()`, `Array.filter()`, `Array.map()` para crear nuevas copias.
- **Sin estado global:** Las funciones solo deben trabajar con los parámetros que reciben. No leer ni escribir variables externas, `localStorage`, `sessionStorage` ni DOM.
- **Sin efectos secundarios en funciones de validación:** `validateClaim`, `validateClinician` deben retornar un objeto `{ valid: boolean, errors: string[] }` sin lanzar excepciones ni modificar nada externo.

---

## 7. Reglas de commit y mensajes

- Prefijo del tipo de cambio: `feat:` (nueva funcionalidad), `fix:` (corrección), `refactor:` (refactorización), `docs:` (documentación), `chore:` (tareas de mantenimiento), `style:` (cambios de formato).
- El mensaje debe describir QUÉ cambió y POR QUÉ, no cómo.
- Ejemplo: `feat: add CME compliance report with at-risk clinician detection`
- Ejemplo: `fix: validate preferred_date rejects weekends and past dates`