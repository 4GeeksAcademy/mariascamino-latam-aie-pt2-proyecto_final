# Project Brief — HealthCore

## Descripción del negocio

**HealthCore** es una empresa de servicios de salud ambulatorios fundada en 2011 en Austin, Texas. Opera una red de **12 clínicas ambulatorias** — 9 en Estados Unidos (Texas, Florida y Georgia) y 3 en el Reino Unido (Londres y Mánchester) — que ofrecen atención primaria, consultas con especialistas, manejo de enfermedades crónicas y programas de salud preventiva. La empresa emplea aproximadamente a **200 personas** y genera alrededor de **28 millones de dólares** en ingresos anuales.

Su ventaja competitiva es la accesibilidad: citas el mismo día, horarios extendidos y personal bilingüe (inglés/español) en las sedes de EE. UU.

### El problema que resuelve

HealthCore fue construida sobre la idea de atención accesible y de alta calidad, pero su infraestructura tecnológica no creció al mismo ritmo que la empresa. Actualmente:

- **Sistemas fragmentados:** Las 12 clínicas operan con procesos y sistemas de registros médicos propios. Las sedes de EE. UU. usan una plataforma EHR y las del Reino Unido usan otra distinta. No comparten datos entre sí.
- **Sin plataforma de reservas online:** Los pacientes en EE. UU. reservan por teléfono; los del Reino Unido llaman a recepción. No existe un sistema compartido de reservas en línea.
- **Alta tasa de inasistencias (22%):** Aproximadamente **1.8 millones de dólares anuales** se pierden en citas no presentadas. No existe un sistema de recordatorio proactivo.
- **Alta tasa de denegación de facturación (14%):** Más del doble del promedio de la industria (5–8%). Las reclamaciones se envían manualmente con práctica de codificación inconsistente.
- **Procesos manuales:** La facturación del Reino Unido se gestiona en una hoja de cálculo. El seguimiento de horas de educación médica continua (CME) se hace en una hoja de cálculo. No hay alertas automáticas.
- **Sin visibilidad ejecutiva unificada:** La CEO recibe informes semanales de cada departamento con formatos distintos, a veces contradictorios, basados en datos de días anteriores.

La unidad interna **HealthCore Digital** fue creada por la CEO, Dra. Sandra Okonkwo, para construir la infraestructura tecnológica que permita a HealthCore operar como un proveedor de salud moderno: seguro, eficiente y centrado en el paciente.

## Objetivos principales del proyecto

1. **Sitio web público profesional y bilingüe** (inglés/español) que presente los servicios y ubicaciones de HealthCore y capture datos estructurados de consultas de pacientes para que recepción pueda hacer seguimiento de forma eficiente.

2. **Lógica de procesamiento de datos operativos** para el panel de operaciones interno: seguimiento de denegaciones de facturación, estimación de costo de inasistencias y monitoreo de cumplimiento CME.

3. **Herramienta de gestión de candidatos** para el departamento de People, que permita filtrar, buscar, actualizar estados y gestionar notas internas en procesos de selección.

4. **API de gestión de inventario de suministros médicos** como base para el panel de operaciones clínicas, con seguimiento de entradas (entregas de proveedores) y salidas (consumo clínico).

5. **Sistemas con IA de alto impacto:** asistencias de documentación clínica, predicción de denegación de reclamaciones, predicción de inasistencias, sistemas RAG sobre documentación de cumplimiento normativo en dos jurisdicciones, y programación inteligente que equilibre preferencias del paciente con capacidad de la clínica.

6. **Dashboard ejecutivo unificado** con KPIs en tiempo real de todos los departamentos, informes semanales automatizados y alertas de umbral para métricas críticas.