# SKILL: code-review-and-commit

## Objetivo

Ejecutar una revisión pre-commit completa y cuantitativa sobre los archivos modificados en el directorio de trabajo, verificando tipado, linting, build y actualización de la documentación del proyecto antes de permitir un commit. Esta skill es el mecanismo concreto que implementa el **Flujo de Trabajo Pre-Commit (4 pasos)** definido en `AGENTS.md`.

> **Esta skill NO escribe ni modifica código funcional.** Solo verifica, reporta y, cuando es necesario, actualiza `memory-bank/progress.md`. Si encuentra errores, reporta cada incumplimiento con la evidencia concreta y se detiene hasta que el desarrollador los resuelva.

---

## Inputs requeridos

| Input              | Tipo     | Descripción                                                               |
| ------------------ | -------- | ------------------------------------------------------------------------- |
| `changed_files`    | `string[]` | Lista de rutas relativas de archivos modificados (output de `git diff --name-only --cached` o `git diff --name-only`) |
| `project_root`     | `string` | Ruta absoluta a la raíz del repositorio                                    |
| `commit_message`   | `string` | Mensaje de commit propuesto (opcional, para validar formato)              |
| `session_changes`  | `string` | Resumen breve de los cambios realizados en la sesión                     |

---

## Procedimiento (4 pasos secuenciales)

Cada paso DEBE ejecutarse en orden. Si un paso falla, detener la ejecución y reportar los errores al desarrollador antes de continuar.

### Paso 1: Análisis de reglas y contexto

1. **Verificar lectura del Memory Bank:** Confirmar que los archivos `memory-bank/projectbrief.md`, `memory-bank/techContext.md` y `memory-bank/progress.md` han sido leídos en la sesión actual. Si no, listarlos como incumplimiento.
2. **Validar contra `CONTEXT.md`:** Para cada archivo modificado, verificar que los nombres de entidades, IDs, reglas de validación y datos de muestra respetan las especificaciones de `CONTEXT.md`. Marcar cualquier invención como incumplimiento bloqueante.
3. **Verificar archivos protegidos:** Revisar la lista de archivos protegidos en `AGENTS.md` sección 3. Si algún archivo modificado está en esa lista sin autorización explícita del desarrollador, reportar como incumplimiento bloqueante.

**Criterio de éxito:** Cero incumplimientos. Si hay al menos uno, no pasar al paso 2.

### Paso 2: Verificación de tipos y linting

1. **TypeScript type-check (si hay archivos `.ts` o `.tsx` modificados):**
   - Si hay cambios en `src/`: ejecutar `npx tsc --noEmit` desde la raíz.
   - Si hay cambios en `uis/talent-pipeline-tracker/`: ejecutar `npx tsc --noEmit` desde `uis/talent-pipeline-tracker/`.
   - **Criterio:** Cero errores de tipo. Cualquier error de tipo (incluyendo `implicit any`, `null checks`, tipos incorrectos) bloquea el commit.
2. **Linting (si hay cambios en `uis/talent-pipeline-tracker/`):**
   - Ejecutar `cd uis/talent-pipeline-tracker && npm run lint`.
   - **Criterio:** Cero errores de lint. Los warnings se reportan pero no bloquean el commit.

**Criterio de éxito:** Cero errores de TypeScript + cero errores de lint (si aplica). Cualquier error impide pasar al paso 3.

### Paso 3: Verificación de build

1. **Build del área modificada:**
   - Si hay cambios en `src/`, `index.html`, `application.html`, `validation.js`, `styles.css`, `tailwind.config.js`: ejecutar `npm run build:css && npm run build` desde la raíz.
   - Si hay cambios en `uis/talent-pipeline-tracker/`: ejecutar `cd uis/talent-pipeline-tracker && npm run build`.
   - Si hay cambios en ambas áreas: ejecutar ambos builds secuencialmente.
   - **Criterio:** El build debe completarse con **código de salida 0**. Sin errores de compilación. Sin assets faltantes. Sin warnings que indiquen problemas de configuración.

**Criterio de éxito:** Build exitoso (exit code 0). Si falla, reportar el error específico y no pasar al paso 4.

### Paso 4: Actualización de progress.md

Si todos los pasos anteriores se completaron exitosamente:

1. Leer el contenido actual de `memory-bank/progress.md`.
2. Agregar o actualizar la entrada correspondiente al hito/sesión actual con:
   - Fecha de la sesión.
   - Archivos creados o modificados (lista con rutas).
   - Funcionalidades implementadas (descripción específica, no genérica).
   - Decisiones técnicas tomadas durante la sesión.
   - Estado del hito después de esta sesión.
3. Verificar que la actualización no rompe el formato Markdown del archivo.
4. Guardar los cambios.

**Criterio de éxito:** El archivo `memory-bank/progress.md` se actualizó correctamente con información descriptiva y específica.

---

## Criterios de aceptación verificables

| Criterio                                          | Medición                                          | Exigencia |
| ------------------------------------------------- | ------------------------------------------------- | --------- |
| ✅ TypeScript type-check sin errores               | `npx tsc --noEmit` → exit code 0, stderr vacío    | **Obligatorio** |
| ✅ Linter sin errores (Next.js)                   | `npm run lint` → exit code 0                      | **Obligatorio** |
| ✅ Build exitoso                                   | `npm run build` → exit code 0                     | **Obligatorio** |
| ✅ Sin `any` implícito o explícito en código nuevo | Revisión de `changed_files` con grep `: any`      | **Obligatorio** |
| ✅ Archivos protegidos no modificados sin permiso  | Intersección de `changed_files` vs lista protegida | **Obligatorio** |
| ✅ Datos de negocio consistentes con CONTEXT.md    | Revisión de nombres, IDs y reglas de validación   | **Obligatorio** |
| ✅ `progress.md` actualizado                       | Archivo modificado con contenido descriptivo      | **Obligatorio** |
| ✅ Mensaje de commit con formato válido            | Regex: `^(feat\|fix\|refactor\|docs\|chore\|style): .+` | Recomendado |

---

## Output

```json
{
  "status": "pass" | "fail",
  "step_failed": "analysis" | "typecheck" | "lint" | "build" | "progress_update" | null,
  "errors": [
    {
      "step": "analysis",
      "file": "src/types.ts",
      "message": "El nombre de clinica 'HealthCore Dallas' no existe en CONTEXT.md"
    }
  ],
  "warnings": [],
  "progress_updated": true | false
}
```

## Notas

- Si el paso 4 falla (no se pudo actualizar `progress.md`), el commit igual puede proceder pero se emite una advertencia. Los pasos 1-3 son los únicos bloqueantes.
- Esta skill no modifica código funcional. Si el type-check o el lint encuentran errores, se reportan pero no se corrigen automáticamente — el agente debe pedir autorización al desarrollador para corregirlos.
- Esta skill asume que las dependencias están instaladas (`node_modules` existe). Si no, debe ejecutar `npm install` antes de los pasos 2 y 3.