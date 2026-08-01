# Progress — HealthCore Project

## Estado actual del proyecto

### Hito 1: Sitio Web Público (Completado)

**Stakeholder:** Priya Nair, Directora de Experiencia del Paciente

Landing page corporativa y formulario de consulta para pacientes, completamente bilingüe (inglés/español).

**Archivos entregados:**
- `index.html` — Landing page con hero, servicios, ubicaciones (tabla EE. UU.), contacto, Schema.org JSON-LD
- `application.html` — Formulario de consulta para pacientes con 16 campos, validaciones completas
- `validation.js` — Lógica de validación del lado del cliente
- `tailwind.config.js` — Configuración de Tailwind CSS v3
- `src/styles.css` — Estilos base con directivas Tailwind

**Funcionalidades implementadas:**
- Hero con titular, subtitular y CTA "Solicitar una cita"
- 3 columnas de servicios (Atención Primaria, Especialistas, Preventiva)
- Sección "Por qué HealthCore" con 4 ventajas
- Tabla de ubicaciones (6 clínicas EE. UU.) con horarios
- Formulario con 13 campos obligatorios + 3 condicionales
- Validaciones específicas: nombre solo letras, fecha nacimiento 0-120 años, teléfono con código de país, fecha preferida 1 día hábil - 60 días
- Validación cruzada: Paediatric Care + edad, Franja horaria + horario clínica
- Validación condicional: campos de seguro, Patient ID para pacientes recurrentes
- Contador de caracteres en vivo para consulta médica
- Checkbox de consentimiento obligatorio
- Mensajes de error específicos por campo
- Mensaje de éxito con instrucciones de seguimiento
- Schema.org MedicalOrganization + MedicalClinic por ubicación
- Nota de partnerships (partnerships@healthcore.com)
- Selector de idioma EN/ES

---

### Hito 2: Programming Fundamentals (Completado)

**Stakeholder:** James Osei, CTO

Lógica de procesamiento de datos operativos para el panel de operaciones interno.

**Archivos entregados:**
- `src/types.ts` — Interfaces `Claim`, `Appointment`, `Clinician`, `Location` + tipos auxiliares
- `src/data.ts` — Datos de muestra (3 locations, 5 claims, 5 appointments, 3 clinicians)
- `src/filters.ts` — Funciones de filtrado
- `src/search.ts` — Búsqueda lineal y binaria
- `src/sorters.ts` — Ordenamiento por ID y fecha
- `src/aggregations.ts` — Agrupación de claims
- `src/validations.ts` — Validaciones de negocio
- `src/utils/collections.ts` — Operaciones de colecciones (filter, sort, group)
- `src/utils/search.ts` — Búsqueda lineal y binaria
- `src/utils/transformations.ts` — Cálculos de denial rate, no-show cost, CME compliance
- `src/utils/validations.ts` — Validaciones de claims y clinicians
- `src/demo.ts` — Demostración de funciones

**Funcionalidades implementadas:**
- Filtrado de claims por ubicación, estado, pagador y tipo de servicio
- Filtrado de appointments por estado
- Ordenamiento de claims por ID (asc/desc)
- Ordenamiento de appointments por fecha (asc/desc)
- Agrupación de claims por ubicación, pagador, estado o servicio
- Cálculo de denial rate total, por pagador y por ubicación
- Identificación de pagadores con alta tasa de denegación (>8%)
- Estimación de costo de no-shows por clínica y semana
- Cálculo de no-show rate por ubicación
- Identificación de ubicaciones con alta tasa de no-shows (>20%)
- Reporte de cumplimiento CME con estados: on_track, at_risk, overdue, complete
- Identificación de clínicos con licencias próximas a vencer (90 y 30 días)
- Validación completa de claims y clinicians

---

### Hito 3: Talent Pipeline Tracker (Completado)

**Stakeholder:** Diane Foster, VP de People

Aplicación Next.js para gestión de candidatos en proceso de selección.

**Archivos entregados:**
- `uis/talent-pipeline-tracker/` — Aplicación Next.js 16 con React 19 y TypeScript 5
- Componentes: `CandidateTable`, `CandidatesView`, `CandidateDetailView`, `CandidateForm`, `EditCandidateView`, `Filters`, `NotesPanel`, `StatusBadge`, `StageBadge`, `LoadingState`, `EmptyState`, `ErrorState`
- Hooks: `useCandidates`, `useCandidate`
- Lib: `api.ts`, `http.ts`, `labels.ts`
- Types: `candidate.ts`
- Páginas: `page.tsx` (lista), `new/page.tsx` (registro), `[id]/page.tsx` (detalle), `[id]/edit/page.tsx` (edición)

**Funcionalidades implementadas:**
- Lista de candidatos con nombre, posición, estado y etapa visibles
- Filtros por estado y etapa
- Búsqueda por nombre o email sin recargar página
- Vista de detalle con actualización de estado/etapa
- Notas internas por candidato (agregar/eliminar)
- Registro de nuevos candidatos
- Edición de datos existentes
- Traducción de valores crudos de API a etiquetas legibles
- Estados de carga, vacío y error

---

### Hito 5: Backend Inventory Management (En progreso — documentado en CONTEXT.md)

**Stakeholder:** James Osei, CTO

API de gestión de inventario de suministros médicos con FastAPI/SQLModel y Supabase.

---

## Hito 4: AI-driven Engineering

**Rama actual:** `Milestone4`

El Hito 4 está orientado a la construcción de portales, aplicaciones de operaciones y UI impulsadas por inteligencia artificial, según la hoja de ruta del curso.

### Subtarea 4.1: Backoffice Dashboard de Operaciones (Completado)

**Stakeholder:** James Osei, CTO

Aplicación Next.js interna tipo backoffice que consume e integra la lógica de negocio del Hito 2 directamente desde el monorepo.

**Archivos entregados:**
- `uis/backoffice/` — Aplicación Next.js 16.2.10 con React 19 + TypeScript 5
- `uis/backoffice/app/layout.tsx` — Layout raíz con Google Fonts Inter
- `uis/backoffice/app/(dashboard)/layout.tsx` — Dashboard layout con sidebar + topbar
- `uis/backoffice/app/(dashboard)/page.tsx` — Página principal con 5 secciones analíticas
- `uis/backoffice/next.config.ts` — Configuración Turbopack con `root` al monorepo raíz

**Secciones del dashboard:**
1. **Estadísticas de consultas de pacientes** — Distribución por tipo de servicio con tabla de conteos + edad promedio y extremos
2. **Reclamaciones y denegaciones** — Denial rate total, desglose por pagador, alertas de pagadores con alta tasa (>8%)
3. **Tasas de inasistencia (No-show)** — No-show rate por ubicación con alertas de umbral (>20%)
4. **Cumplimiento CME** — Reporte completo con estados (on_track, at_risk, overdue, complete) y alertas de licencias próximas a vencer (90 y 30 días)
5. **Validaciones de negocio** — Resultados de validación de claims y clínicos

**Logro técnico clave:**
- Integración directa de módulos TypeScript desde `../../../../src/*` (raíz del monorepo) sin copiar código
- Solución al límite de resolución de módulos de Turbopack configurando `turbopack.root = path.resolve(__dirname, '../..')` para expandir el ámbito de resolución
- TypeScript (`tsc --noEmit`) y Turbopack build verificados exitosamente
- Puerto de desarrollo: 3002

### Tareas pendientes / planificadas

Basado en las necesidades del negocio documentadas en `CONTEXT.md`, las tareas futuras incluyen:

1. **Sistema de revisión de reclamaciones asistido por IA**
   - Identificación de envíos de alto riesgo antes de su salida
   - Sugerencias automáticas de codificación basadas en notas clínicas
   - Dashboard unificado de facturación con ingresos EE. UU. y Reino Unido en tiempo real
   - Análisis de patrones de denegación

2. **Plataforma unificada de reservas online para ambos mercados (EE. UU. y Reino Unido)**
   - Integración con sistema de recordatorios inteligentes
   - Sistema de predicción de no-shows

3. **Dashboard de cumplimiento normativo centralizado**
   - Acceso a datos unificados bajo HIPAA y UK GDPR
   - Consolidación automatizada de pistas de auditoría
   - Sistema de puntuación de riesgo de cumplimiento

4. **Portal interno de RR.HH.**
   - Solicitudes de vacaciones, gestión de ausencias y consultas de políticas
   - Flujo de onboarding clínico automatizado
   - Sistema de seguimiento CME con alertas de vencimiento
   - Dashboard de KPIs de RR.HH. (tiempo de contratación, rotación, ausentismo)
   - Chatbot de RR.HH. para preguntas frecuentes de empleados

5. **Dashboard ejecutivo unificado**
   - KPIs en tiempo real de todos los departamentos
   - Informe semanal generado automáticamente
   - Alertas de umbral para métricas críticas
   - Asistente NLP para consultas directas de la CEO