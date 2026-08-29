# AGENTS.md — HealthCore Monorepo

> Reglas de funcionamiento para cualquier agente de IA que trabaje en este repositorio.
> Léelo completo al iniciar cada sesión. Su incumplimiento puede derivar en errores de compilación, pérdida de datos o violaciones de contexto de negocio.

---

## 1. Lectura Inicial Obligatoria — Memory Bank

Al iniciar una sesión, **TODO agente DEBE leer los siguientes archivos** en este orden para adquirir el contexto completo del proyecto antes de realizar cualquier modificación:

| Orden | Archivo                                            | Propósito                                                 |
| ----- | -------------------------------------------------- | --------------------------------------------------------- |
| 1     | `memory-bank/projectbrief.md`                      | Descripción del negocio, problema que resuelve, objetivos |
| 2     | `memory-bank/techContext.md`                       | Pila tecnológica, arquitectura, restricciones técnicas    |
| 3     | `memory-bank/progress.md`                          | Estado actual del proyecto, hitos, tareas pendientes      |
| 4     | `CONTEXT.md`                                       | Documento fuente completo con especificaciones del negocio|
| 5     | `AGENTS.md` (este archivo)                         | Reglas de funcionamiento del agente                       |

> **Importante:** No asumas nada del negocio sin haber leído estos archivos. Los nombres de clínicas, servicios, personas, datos de muestra y reglas de validación están especificados exclusivamente en estos documentos. Inventar datos que no aparezcan aquí rompe el contexto del proyecto.

---

## 2. Flujo de Trabajo Pre-Commit (4 pasos obligatorios)

Antes de solicitar o ejecutar un `git commit` (o un `git add` que preceda a un commit), el agente **DEBE ejecutar secuencialmente** los siguientes 4 pasos. Si algún paso falla, **no se puede proceder con el commit** hasta resolverlo.

### Paso 1 — Análisis de reglas y contexto
- Verificar que los archivos del **Memory Bank** (sección 1) han sido leídos en esta sesión.
- Revisar `CONTEXT.md` para confirmar que los cambios propuestos respetan las especificaciones del negocio (stakeholders, restricciones regulatorias, reglas de validación, datos de muestra).
- Verificar que ningún archivo de la sección **Protegidos** (sección 3) ha sido modificado sin autorización explícita.

### Paso 2 — Verificación de tipos y linting
- Ejecutar TypeScript type-checking en los archivos modificados del `src/`:
  ```bash
  npx tsc --noEmit
  ```
- Si se modificó código en `uis/talent-pipeline-tracker/`, ejecutar:
  ```bash
  cd uis/talent-pipeline-tracker && npm run lint
  ```
- **No se toleran errores de tipo `any`, tipos faltantes o errores de lint.**
- Si hay errores, corregirlos antes de continuar.

### Paso 3 — Verificación de build
- Según el área modificada, ejecutar el build correspondiente:
  - `src/` (sitio público): `npm run build:css` seguido de `npm run build`
  - `uis/talent-pipeline-tracker/`: `cd uis/talent-pipeline-tracker && npm run build`
- Verificar que el build se completa sin errores.
- **No se toleran errores de compilación o warnings críticos.**

### Paso 4 — Actualización de `progress.md`
- Actualizar el archivo `memory-bank/progress.md` reflejando:
  - Nuevos archivos creados o modificados.
  - Nuevas funcionalidades implementadas.
  - Cambios en el estado de los hitos.
  - Decisiones técnicas importantes tomadas durante la sesión.
- La actualización debe ser **descriptiva y específica** (no genérica).

---

## 3. Archivos y Carpetas Protegidas

Los siguientes archivos y carpetas **NO PUEDEN ser modificados, eliminados ni renombrados** sin confirmación explícita del desarrollador mediante un mensaje de autorización:

### Archivos raíz
| Archivo                          | Razón de protección                                                |
| -------------------------------- | ------------------------------------------------------------------ |
| `CONTEXT.md`                     | Documento fuente del negocio — cualquier cambio rompe el contexto  |
| `package.json`                   | Dependencias y scripts del proyecto raíz                           |
| `tsconfig.json`                  | Configuración de compilación TypeScript global                     |
| `tailwind.config.js`             | Configuración de Tailwind CSS v3                                   |
| `vercel.json`                    | Configuración de despliegue en Vercel                              |

### Carpetas protegidas
| Carpeta                          | Razón de protección                                                |
| -------------------------------- | ------------------------------------------------------------------ |
| `memory-bank/`                   | Documentación viva del proyecto — requiere autorización para borrar o reestructurar archivos |
| `data/`                          | Datos, pipelines y evaluaciones — no modificar sin validación previa |
| `infra/`                         | Docker, Terraform, configuraciones de despliegue                   |
| `internal/`                      | CLIs y utilidades internas empaquetadas                            |
| `services/`                      | APIs y workers backend — solo modificar cuando el hito lo requiera |
| `mcps/`                          | Servidores MCP — configuración de herramientas externas            |
| `workflows/`                     | Automatizaciones/orquestación — alto riesgo de efectos colaterales |
| `skills/`                        | Skills reutilizables para agentes — modificarlos afecta a todos los agentes |

### Subproyectos interdependientes
| Archivo/Carpeta                                                            | Razón de protección                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `uis/talent-pipeline-tracker/AGENTS.md`                                    | Reglas específicas de Next.js 16 — no sobreescribir                |
| `uis/talent-pipeline-tracker/package.json`                                 | Dependencias del portal de candidatos Next.js                      |
| `uis/talent-pipeline-tracker/tsconfig.json`                                | Configuración TypeScript del portal Next.js                        |
| `packages/shared/`                                                         | Tipos compartidos entre paquetes (@repo/shared-types)              |

### Excepción
El desarrollador puede autorizar modificaciones en cualquier archivo protegido mediante una respuesta explícita como _"Puedes modificar [archivo]"_, _"Autorizado"_, o similar. Sin esa confirmación, la modificación está prohibida.

---

## 4. Reglas de Conducta

- **No inventes datos.** Usa exclusivamente los nombres de clínicas, servicios, personas y valores especificados en `CONTEXT.md` y el Memory Bank.
- **Respetar el monolingüismo del proyecto:** El sitio web público usa `index.html` (EN) e `index.es.html` (ES) — o mecanismo `data-lang`. No mezcles idiomas en un mismo archivo.
- **Actualiza el Memory Bank.** Si implementas una funcionalidad significativa o tomas una decisión técnica relevante, actualiza `memory-bank/progress.md` y, si aplica, `memory-bank/techContext.md`.
- **No elimines sin preguntar.** Antes de borrar o reestructurar archivos existentes (especialmente en `uis/`, `src/` o `services/`), pregunta al desarrollador.
- **Preserva el tipado estricto.** No uses `any`. Todas las interfaces deben tener tipos explícitos. Las funciones deben ser puras y sin mutaciones, salvo que el contexto lo requiera explícitamente.