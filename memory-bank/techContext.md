# Tech Context — HealthCore Monorepo

## Pila tecnológica

### Frontend / Web

| Componente               | Tecnología                                          |
| ------------------------ | --------------------------------------------------- |
| Sitio web público (H1)   | HTML5 + JavaScript (vanilla), Tailwind CSS v3 CDN   |
| Portal de candidatos (H3)| Next.js 16, React 19, TypeScript 5, Tailwind CSS 4  |
| Estilos                  | Tailwind CSS v3 (CDN para sitio público), v4 (Next) |

### Lenguajes

| Lenguaje    | Uso                                          |
| ----------- | -------------------------------------------- |
| TypeScript  | Lógica de negocio (H2), UI con Next.js (H3)  |
| JavaScript  | Sitio web público, validaciones de formulario |
| Python      | Pendiente para servicios backend (H5+)        |

### Infraestructura y herramientas

| Herramienta       | Propósito                                             |
| ----------------- | ----------------------------------------------------- |
| Node.js           | Entorno de ejecución                                  |
| npm               | Gestor de paquetes                                    |
| TypeScript 5.5+   | Tipado estático en todo el código de negocio          |
| Tailwind CSS      | Framework de estilos utility-first                    |
| PostCSS           | Procesador de CSS                                     |
| Autoprefixer      | Compatibilidad cross-browser                          |
| http-server       | Servidor local de desarrollo (npx)                    |
| Next.js 16        | Framework React para app de Talent Pipeline Tracker   |
| ESLint 9          | Linting para el proyecto Next.js                      |

### Estructura del monorepo

```
/
├── uis/                    # Interfaces de usuario
│   └── talent-pipeline-tracker/  # Next.js 16 app
├── services/               # APIs y workers backend (pendiente)
├── packages/shared/        # Paquete compartido @repo/shared-types
├── agents/                 # Patrones de agentes y documentación de tools
├── skills/                 # Skills reutilizables para agentes
├── src/                    # Lógica TypeScript raíz (H2)
│   ├── utils/
│   │   ├── collections.ts  # Filtrado, ordenamiento, agrupación
│   │   ├── search.ts       # Búsqueda lineal y binaria
│   │   ├── transformations.ts  # Cálculos de negocio
│   │   └── validations.ts  # Validaciones de datos
│   ├── types.ts            # Interfaces del dominio
│   ├── data.ts             # Datos de muestra
│   ├── demo.ts             # Demostración
│   └── ...
├── data/                   # Datos, pipelines y evaluaciones
├── assets/                 # Imágenes y CSS compilado
└── docs/                   # Documentación de proyecto y arquitectura
```

## Decisiones de arquitectura

1. **Monorepo multi-milestone:** Cada hito del curso vive dentro del mismo repositorio, organizado por carpetas funcionales (`uis/`, `services/`, etc.). No hay un workspace runner global configurado en la raíz.

2. **Separación estricta por responsabilidad:** Las funciones de lógica de negocio (Hito 2) están separadas en archivos por dominio: `collections.ts` (operaciones de colecciones), `search.ts` (búsquedas), `transformations.ts` (cálculos de negocio), `validations.ts` (validaciones). Ninguna función usa estado global — son funciones puras que solo trabajan con los parámetros recibidos.

3. **Funciones sin mutación:** Las funciones de ordenamiento y filtrado no mutan los arreglos originales. Operan sobre copias mediante spread operator o métodos inmutables.

4. **Sitio público 100% estático:** No hay framework, build step ni bundler para el sitio web público (Hito 1). Tailwind se carga vía CDN. Solo se requiere un servidor HTTP estático para desarrollo.

5. **Talent Pipeline Tracker como Next.js 16 standalone:** La aplicación de candidatos vive en `uis/talent-pipeline-tracker/` con su propio `package.json`, configuración Next.js y dependencias. Es independiente del sitio público.

6. **Paquete compartido de tipos:** `packages/shared/types/index.ts` contiene tipos comunes (@repo/shared-types), aunque actualmente no hay un workspace runner configurado que lo vincule con los demás paquetes.

7. **Sin backend desplegado aún:** El Hito 3 consume una API mock desplegada centralmente (compartida entre todos los contextos del curso). El Hito 5 (Backend Inventory) agregará servicios FastAPI/SQLModel propios.

## Restricciones técnicas

- **Healthcare/Regulated data:** Los sistemas deben cumplir con HIPAA (EE. UU.) y UK GDPR (Reino Unido). Datos de pacientes (PHI) no deben exponerse innecesariamente.
- **Bilingüismo obligatorio:** El sitio web público (Hito 1) debe estar completamente disponible en inglés y español. Sin excepciones.
- **Sin envío real de datos:** El formulario de consulta del Hito 1 simula el envío; no envía datos a ningún servidor.
- **Sin uso de `any` en TypeScript:** Todas las interfaces deben tener tipos definidos explícitamente.
- **Sin efectos secundarios en funciones de negocio:** Las funciones de cálculo y filtrado son puras.
- **Valores crudos de API nunca visibles en UI:** Los estados y etapas (`in_progress`, `personal_interview`) se traducen siempre a etiquetas legibles.