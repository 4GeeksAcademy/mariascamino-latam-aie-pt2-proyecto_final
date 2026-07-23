# Welcome to HealthCore

## AI Engineering · 4Geeks Academy — Company Briefing

---

HealthCore is an outpatient healthcare services company founded in 2011 in Austin, Texas. It operates a network of **12 clinics** — 9 in the United States (Texas, Florida, and Georgia) and 3 in the United Kingdom (London and Manchester) — offering primary care, specialist consultations, chronic disease management, and preventive health programmes. The company employs approximately **200 people** across clinical staff, operations, administration, and a growing technology unit. Annual revenue sits around **28 million dollars**.

HealthCore was built on a simple idea: accessible, high-quality care that doesn't require patients to wait weeks for an appointment or navigate a confusing system. Same-day bookings, extended hours, and bilingual staff in US markets became the brand's signature. For most of its history, that was enough to grow steadily and earn a loyal patient base in both countries.

It is no longer enough.

## How the company is organised

HealthCore is led by **Dr. Sandra Okonkwo**, a physician who spent years inside large hospital systems before founding the company out of frustration with how much time clinicians spent on administration instead of patients. She is precise, evidence-driven, and deeply sceptical of technology that doesn't solve a real problem — but she has come to understand that without modern systems, HealthCore cannot manage what it has already built, let alone grow further.

The company is organised around the following areas:

**Clinical Operations** is where the medicine happens. Dr. Marcus Reid oversees approximately 120 clinical staff — physicians, nurse practitioners, nurses, and medical assistants — across the 12 locations. Each clinic operates somewhat independently, with its own processes and its own patient records system. The US and UK clinics use different electronic health record platforms, and they do not speak to each other.

**Patient Experience and Access** manages everything that happens before and after the clinical encounter: booking appointments, reminding patients, handling follow-up, and making sure the patient has a smooth journey from first contact to discharge. Priya Nair leads this function from London, and she is acutely aware that a 22% no-show rate across the network represents both a patient failure and a significant financial loss.

**Revenue Cycle and Billing** is responsible for getting paid for the care that HealthCore provides. In the US, that means navigating commercial insurance, Medicare, and Medicaid — a complex claims and reimbursement process where a 14% denial rate (more than double the industry average) is currently costing the company significant money. In the UK, billing is a mix of private pay and a small NHS contract. Tom Callahan manages both revenue streams, but without a unified view of either.

**Compliance and Data Governance** is what keeps HealthCore legally safe. Claire Whitfield manages the company's obligations under HIPAA in the US and UK GDPR in the United Kingdom — two different frameworks with different rules about how patient data can be stored, accessed, and shared. Any system that HealthCore builds or adopts must be evaluated through this lens. Claire's team is small, but her authority in the organisation is significant.

**People and Workforce** handles the 200 employees across 12 locations in two countries, each with different employment law frameworks. Diane Foster manages everything from hiring — clinical roles are hard to fill and take an average of 47 days to close — to onboarding, compliance training, and tracking the continuing medical education hours that clinicians are legally required to complete to maintain their licences.

**Technology** is the team that has been tasked with making all of this work. James Osei, the CTO, leads six people in Austin. They are responsible for a patchwork of legacy systems that were each built or acquired to solve a specific problem and have never been properly integrated. Two different EHR systems. A US billing platform. A UK billing spreadsheet. A phone-based US scheduling system. A manual diary for UK bookings. No shared data layer between any of them.

**Executive Leadership** centres on Dr. Okonkwo, who receives weekly reports from each department head — all formatted differently, sometimes contradictory, and always based on data that is several days old. She is managing a 28-million-dollar, two-country clinical network without being able to answer a basic question like "what is our no-show rate across the network this week?" without making phone calls.

## Where the company stands today

HealthCore has built something genuinely valuable: a network of clinics that patients trust and clinical staff want to work in. But the infrastructure underneath the clinical work has not kept pace with the company's growth. The consequences range from inconvenient to serious.

Patients in the US book by phone while patients in the UK call a front desk — there is no shared online booking system. A fifth of patients do not show up to their appointments, and no proactive outreach system exists to prevent it. Clinical staff spend 35 minutes a day on documentation tasks that AI could assist with. Billing denials cost millions annually. Compliance training is tracked on a spreadsheet. Patient data flows through systems that were never designed to share information.

Operating in healthcare adds a layer of responsibility that does not exist in other industries. Patient data is protected by law — HIPAA in the US, UK GDPR in the UK. Every system that handles that data must meet specific legal standards. Errors are not just inefficiencies; in healthcare, they can have consequences for real patients.

Dr. Okonkwo has created an internal unit called **HealthCore Digital** to build the systems, workflows, and intelligent tools that will allow the company to operate as a modern healthcare provider — safe, efficient, and genuinely centred on the patient.

**You are part of that unit.**

---

## The Departments and Their Problems

### 🏥 Clinical Operations

**Director:** Dr. Marcus Reid (~120 clinical staff across 12 locations)

Each of the 12 clinics operates with its own processes and patient records system. US clinics use one EHR platform, UK clinics use another, and they cannot communicate with each other. Clinical staff spend 35 minutes per day on documentation tasks that could be assisted by AI. When a patient moves between locations or crosses the US-UK boundary, their history does not follow them.

**What they need:** A unified patient record API that surfaces data from both EHR systems, AI-assisted clinical documentation to reduce administrative time, cross-location patient history visibility, and a clinical operations dashboard showing appointment volume, patient flow, and documentation time by location.

---

### 🗓️ Patient Experience and Access

**Manager:** Priya Nair (London)

Patients in the US book appointments by phone. Patients in the UK call a front desk. There is no shared online booking system. A 22% no-show rate across the network represents both poor patient experience and significant financial loss — approximately $1.8 million annually in lost appointment slots. No proactive outreach system exists to remind patients or reschedule at-risk appointments.

**What they need:** A unified online booking platform for both markets, an intelligent appointment reminder system with SMS/email/app notifications, a no-show prediction model that flags high-risk appointments for proactive contact, and a patient experience dashboard tracking booking rates, no-shows, and patient satisfaction by location.

---

### 💰 Revenue Cycle and Billing

**Manager:** Tom Callahan

In the US, a 14% claims denial rate — more than double the industry average of 5-8% — is costing HealthCore significant revenue. Claims are submitted manually with inconsistent coding practices across locations. In the UK, billing is split between private pay and a small NHS contract, managed separately with no unified view. Tom cannot answer "what is our collection rate this month?" without making phone calls.

**What they need:** An AI-assisted claims review system that flags high-risk submissions before they go out, automated coding suggestions based on clinical notes, a unified billing dashboard showing US and UK revenue streams in real time, denial pattern analysis to identify systematic issues, and automated follow-up workflows for denied or unpaid claims.

---

### 🔒 Compliance and Data Governance

**Manager:** Claire Whitfield

HealthCore operates under two different legal frameworks: HIPAA in the United States and UK GDPR in the United Kingdom. Every system that handles patient data must be evaluated through both lenses. Data access logs are maintained separately in each EHR system. Audit trails are incomplete. When a patient requests their data under GDPR or HIPAA, compiling it requires manual work across multiple systems.

**What they need:** A centralised compliance monitoring dashboard showing data access patterns across both jurisdictions, automated audit trail consolidation, a patient data request automation tool that compiles records from all systems, and a compliance risk scoring system that flags potential violations before they become breaches.

---

### 👥 People and Workforce

**Manager:** Diane Foster

Managing 200 employees across 12 locations in two countries, each with different employment law frameworks, creates significant overhead. Clinical roles are hard to fill and take an average of 47 days to close — nearly 20 days longer than industry benchmarks. Onboarding is manual. Continuing medical education (CME) hours, which clinicians are legally required to track to maintain their licences, are recorded on a spreadsheet.

**What they need:** An internal HR portal for holiday requests, absence management, and policy queries, an automated clinical onboarding flow with credential verification checklists, a CME tracking system with automatic expiry alerts, an HR KPI dashboard tracking time-to-hire, turnover, and absenteeism by location and role, and an HR chatbot that answers common employee questions.

---

### 💻 Technology

**CTO:** James Osei (6-person team in Austin)

HealthCore's technology estate is a patchwork of systems acquired or built over a decade: two different EHR platforms, a US billing system, a UK billing spreadsheet, a phone-based US scheduling system, and manual diaries for UK bookings. There is no shared data layer. No telemetry. No centralised logging. When a system fails, the team finds out when a clinic calls to report it.

**What they need:** A HealthCore central API that unifies patient, appointment, billing, and staff data across both EHR systems, real-time telemetry and monitoring from all 12 locations, a data pipeline feeding clinical, operations, and finance dashboards, automated health checks with alerts, and technical documentation indexed for semantic search.

---

### 📊 Executive Leadership

**CEO:** Dr. Sandra Okonkwo

Dr. Okonkwo manages a 28-million-dollar healthcare network across two countries without a unified dashboard. Her decisions are based on weekly reports from each department head — all formatted differently, sometimes contradictory, and always several days old. She cannot answer basic operational questions like "what is our no-show rate this week?" or "which location has the highest claims denial rate this month?" without making phone calls.

**What she needs:** A unified executive dashboard with real-time KPIs from all departments (appointment volume, no-show rate, claims denial rate, revenue by location, patient satisfaction), an automatically generated weekly report delivered every Monday at 7am, threshold alerts for critical metrics, and a natural-language AI assistant she can query directly.

---

## Why Choose HealthCore?

Choose HealthCore if you are drawn to:

- **Healthcare and regulated data** — building systems that handle protected health information under HIPAA and UK GDPR, where errors have legal consequences and privacy is non-negotiable.
- **Cross-border healthcare operations** — two countries, two regulatory frameworks, two EHR systems, and a unified patient experience that must work across all of it.
- **High-stakes AI applications** — clinical documentation assistance, claims denial prediction, and appointment no-show forecasting are not optional enhancements; they directly impact patient care and company viability.
- **Systems that serve real patients** — every dashboard, API, and automation you build exists to help people get the healthcare they need, when they need it, without unnecessary friction.

The AI challenges at HealthCore include natural language processing of clinical notes for billing code suggestions, predictive models for appointment no-shows trained on multi-location data, RAG systems over compliance documentation in two jurisdictions, and intelligent scheduling that balances patient preferences with clinic capacity. If you want to build systems where technical excellence directly translates to better healthcare delivery, HealthCore is your company.

---

_Internal document — 4Geeks Academy · AI Engineering Track_
_For exclusive use in programme project generation_

# CONTEXT.md — HealthCore

## Hito 1: Sitio web público de tu empresa

_These instructions are [available in English](./CONTEXT-healthcore.en.md)._

> Este documento describe tu empresa y la situación específica para la que estás construyendo este hito. Léelo completo antes de escribir cualquier código. Todo lo que construyas debe reflejar este contexto.

---

## Tu empresa

**HealthCore** es una empresa de servicios de salud ambulatorios fundada en 2011 en Austin, Texas. Opera una red de 12 clínicas ambulatorias — 9 en Estados Unidos (Texas, Florida y Georgia) y 3 en el Reino Unido (Londres y Mánchester) — que ofrecen atención primaria, consultas con especialistas, manejo de enfermedades crónicas y programas de salud preventiva. Emplea aproximadamente a 200 personas y genera alrededor de 28 millones de dólares en ingresos anuales. La ventaja competitiva de HealthCore es la accesibilidad: citas el mismo día, horarios extendidos y personal bilingüe en las sedes de EE. UU.

---

## Tu departamento y el problema que debes resolver

Trabajas en el equipo de **HealthCore Digital**, la unidad interna de tecnología creada por la CEO Dra. Sandra Okonkwo para construir la infraestructura que necesitan los equipos clínicos y operativos. Este hito fue asignado por **Priya Nair**, directora de Experiencia del Paciente.

La presencia online actual de HealthCore es una sola página de marcador de posición de 2019 con un número de teléfono y sin certificado SSL. Pacientes en Texas y Florida reportan que su primera impresión de HealthCore en internet les hace cuestionar si la empresa es real. Mientras tanto, la recepción recibe consultas de pacientes por teléfono sin estructura, dedicando un promedio de 20 minutos por llamada solo para recopilar información básica antes de siquiera considerar una cita. Priya necesita un sitio web profesional bilingüe que presente los servicios y ubicaciones de HealthCore, y que capture datos estructurados de consultas de pacientes para que recepción pueda hacer seguimiento de forma eficiente.

---

## Tu stakeholder

**Priya Nair**, directora de Experiencia del Paciente

> Hola,
>
> Hemos estado perdiendo pacientes frente a la competencia no porque nuestra atención sea peor, sino porque la gente nos busca en Google y no encuentra nada creíble. Necesitamos un sitio web público real, y necesitamos que funcione en **inglés y español**: una gran parte de nuestra población de pacientes en Austin y Miami habla español, y ahora mismo no tenemos nada para ellos.
>
> El sitio debe tener dos partes. Primero, una landing page que presente quiénes somos, qué ofrecemos y dónde están nuestras clínicas. Segundo, un formulario de consulta para pacientes donde las personas puedan enviar su información para que nuestro equipo de recepción las llame y confirme una cita. Ahora mismo ese proceso ocurre totalmente por teléfono y sin ninguna estructura; nos está costando tiempo y pacientes.
>
> Usa exactamente el contenido y las especificaciones de campos de este documento. No inventes nombres de clínicas, números de teléfono ni servicios: usa lo que está aquí. Y por favor haz que se vea profesional. Este es nuestro debut digital.
>
> — Priya

---

## Alcance de idiomas

- El sitio web debe estar completamente disponible en **inglés y español**. Esto no es opcional: una parte significativa de la población de pacientes de HealthCore en Texas y Florida habla español.
- Implementa el cambio de idioma usando dos archivos HTML separados (`index.html` / `index.es.html` y `application.html` / `application.es.html`) o una sola página con un interruptor que cambie el contenido mediante atributos `data-lang` y JavaScript.
- Todas las etiquetas, mensajes de error, textos de placeholder, etiquetas de botones y mensajes de éxito deben estar completamente traducidos. No dejes ningún texto visible para el usuario en inglés cuando la página esté en modo español.

---

## Contenido de la landing page

Tu landing page debe incluir las siguientes secciones, en este orden:

### Encabezado

- Logo o nombre "HealthCore"
- Navegación: Inicio | Servicios | Ubicaciones | Contacto
- Selector de idioma: EN | ES

### Hero

- **Titular:** "Atención médica que se adapta a tu vida"
- **Subtitular:** "12 clínicas ambulatorias en EE. UU. y Reino Unido que ofrecen citas el mismo día, horarios extendidos y atención bilingüe, para que recibas la atención que necesitas, cuando la necesitas."
- **Llamado a la acción:** Botón "Solicitar una cita" que enlace al formulario de consulta

### Servicios (3 columnas)

1. **Atención Primaria y Enfermedades Crónicas**
   - Citas el mismo día con médicos de atención primaria
   - Manejo continuo de diabetes, hipertensión y asma

2. **Consultas con Especialistas**
   - Cardiología, endocrinología, neumología y salud de la mujer
   - Derivaciones coordinadas dentro de la red de HealthCore

3. **Salud Preventiva y Bienestar**
   - Chequeos, vacunación y revisiones anuales
   - Asesoramiento en salud mental y derivaciones a psiquiatría

### Por qué HealthCore (2 columnas)

- **Citas el mismo día** en la mayoría de las ubicaciones
- **Horarios extendidos** — entre semana hasta las 7pm u 8pm, sábados disponibles
- **Personal bilingüe** en inglés y español en ubicaciones de EE. UU.
- **12 clínicas** en Texas, Florida, Georgia y el Reino Unido

### Ubicaciones (solo EE. UU.; mostrar como tabla o cuadrícula de tarjetas)

| Nombre de la clínica      | Ciudad      | Estado | Teléfono       | Horario                       |
| ------------------------- | ----------- | ------ | -------------- | ----------------------------- |
| HealthCore Austin Central | Austin      | TX     | (512) 340-8800 | Lun–Vie 7am–8pm · Sáb 9am–3pm |
| HealthCore Austin North   | Austin      | TX     | (512) 340-8810 | Lun–Vie 8am–7pm               |
| HealthCore San Antonio    | San Antonio | TX     | (210) 720-4400 | Lun–Vie 8am–6pm · Sáb 9am–1pm |
| HealthCore Miami          | Miami       | FL     | (305) 510-7700 | Lun–Vie 7am–8pm · Sáb 9am–4pm |
| HealthCore Orlando        | Orlando     | FL     | (407) 892-6600 | Lun–Vie 8am–6pm               |
| HealthCore Atlanta        | Atlanta     | GA     | (404) 330-9900 | Lun–Vie 8am–7pm               |

> Las clínicas del Reino Unido atienden un mercado independiente y no se incluyen en este sitio web público.

### Contacto

- Consultas generales: info@healthcore.com
- Sede central de Austin: (512) 340-8800
- Miami: (305) 510-7700
- Reino Unido (Londres): +44 20 7946 0100

### Pie de página

- © 2025 HealthCore. Todos los derechos reservados.
- LinkedIn | Facebook | Instagram

---

## Campos del formulario de consulta para pacientes

El formulario (`application.html`) es un **formulario de consulta para pacientes**, no un formulario de reserva. Su propósito es recopilar suficiente información estructurada para que recepción pueda llamar al paciente y confirmar una cita. Todos los atributos `name` de los campos se especifican abajo y deben usarse exactamente como están escritos.

| Campo                                       | Tipo     | Atributo `name`       | Validación                                                                                                                                           | Obligatorio |
| ------------------------------------------- | -------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **Nombre**                                  | text     | `first_name`          | 2–50 caracteres, solo letras                                                                                                                         | Sí          |
| **Apellido**                                | text     | `last_name`           | 2–50 caracteres, solo letras                                                                                                                         | Sí          |
| **Fecha de nacimiento**                     | date     | `date_of_birth`       | No puede ser una fecha futura · El paciente no puede tener más de 120 años                                                                           | Sí          |
| **Correo electrónico**                      | email    | `email`               | Formato de correo válido                                                                                                                             | Sí          |
| **Número de teléfono**                      | tel      | `phone`               | Debe comenzar con código de país (ej., +1 305 555 0191 o +34 612 345 678)                                                                            | Sí          |
| **Idioma preferido**                        | select   | `preferred_language`  | Opciones: English · Spanish                                                                                                                          | Sí          |
| **Clínica preferida**                       | select   | `preferred_clinic`    | Las opciones deben usar los nombres de clínicas de la tabla de Ubicaciones de arriba                                                                 | Sí          |
| **Fecha preferida**                         | date     | `preferred_date`      | Al menos 1 día hábil desde hoy · No más de 60 días hacia adelante                                                                                    | Sí          |
| **Franja horaria preferida**                | select   | `preferred_time`      | Opciones: Morning (7am–12pm) · Afternoon (12pm–5pm) · Evening (5pm–8pm)                                                                              | Sí          |
| **Servicio requerido**                      | select   | `service_type`        | Opciones: Primary Care · Chronic Disease Management · Specialist Consultation · Preventive Health · Women's Health · Paediatric Care · Mental Health | Sí          |
| **¿Es tu primera visita a HealthCore?**     | radio    | `new_patient`         | Opciones: Yes · No                                                                                                                                   | Sí          |
| **¿Tienes seguro médico?**                  | radio    | `has_insurance`       | Opciones: Yes · No                                                                                                                                   | Sí          |
| **Aseguradora**                             | text     | `insurance_provider`  | Obligatorio solo si `has_insurance` = Yes · Máximo 100 caracteres                                                                                    | Condicional |
| **ID de afiliado**                          | text     | `insurance_member_id` | Obligatorio solo si `has_insurance` = Yes · 6–20 caracteres alfanuméricos                                                                            | Condicional |
| **Descripción breve de tu consulta médica** | textarea | `health_concern`      | 20–500 caracteres · Contador de caracteres en vivo                                                                                                   | Sí          |
| **Consiento que HealthCore me contacte**    | checkbox | `contact_consent`     | Debe marcarse para enviar                                                                                                                            | Sí          |

---

## Validaciones específicas

1. **Nombre / Apellido:** Solo letras (incluyendo caracteres acentuados: á, é, í, ó, ú, ñ, ü). Sin números ni caracteres especiales.
2. **Fecha de nacimiento:** No puede ser una fecha futura. El paciente debe tener entre 0 y 120 años.
3. **Teléfono:** Debe comenzar con `+` seguido de código de país. Acepta formatos como `+1 305 555 0191` o `+34 612 345 678`.
4. **Fecha preferida:** Al menos 1 día hábil desde hoy. No más de 60 días en el futuro.
5. **Tipo de servicio + fecha de nacimiento (Paediatric Care):** Si el paciente selecciona "Paediatric Care", su fecha de nacimiento debe indicar que tiene menos de 18 años. Si no, muestra un error específico.
6. **Franja horaria preferida + horario de clínica:** Si el paciente selecciona "Evening (5pm–8pm)", solo son válidas clínicas que atienden después de las 5pm. Muestra una advertencia si la combinación es poco probable que esté disponible (por ejemplo, San Antonio cierra a las 6pm y Austin North a las 7pm).
7. **Campos de seguro:** Si `has_insurance` = Yes, `insurance_provider` y `insurance_member_id` pasan a ser obligatorios y deben validarse.
8. **Paciente recurrente:** Si `new_patient` = No, muestra un campo adicional opcional: **Patient ID** (`name="patient_id"`, formato `HC-` seguido de 6 caracteres alfanuméricos, por ejemplo, `HC-A3F291`).
9. **Consulta médica:** Mínimo 20 caracteres. Máximo 500. Muestra un contador de caracteres en vivo.
10. **Casilla de consentimiento:** Debe estar marcada para enviar. Si no está marcada, el formulario no se envía.

---

## Mensajes de error esperados

Cuando un campo no pase la validación, muestra estos mensajes específicos:

- **Nombre:** "El nombre debe contener solo letras y tener al menos 2 caracteres"
- **Apellido:** "El apellido debe contener solo letras y tener al menos 2 caracteres"
- **Fecha de nacimiento:** "Ingresa una fecha de nacimiento válida. El paciente debe tener entre 0 y 120 años"
- **Email:** "Ingresa un correo electrónico válido (ejemplo: nombre@proveedor.com)"
- **Teléfono:** "El teléfono debe incluir un código de país (ejemplo: +1 305 555 0191)"
- **Idioma preferido:** "Selecciona tu idioma preferido"
- **Clínica preferida:** "Selecciona la clínica que te gustaría visitar"
- **Fecha preferida:** "Selecciona una fecha de al menos 1 día hábil desde hoy y no más de 60 días hacia adelante"
- **Franja horaria preferida:** "Selecciona tu franja horaria preferida"
- **Tipo de servicio:** "Selecciona el tipo de atención que estás buscando"
- **Tipo de servicio (Paediatric):** "Paediatric Care está disponible para pacientes menores de 18 años. Revisa la fecha de nacimiento o selecciona un servicio diferente."
- **Paciente nuevo:** "Indica si esta es tu primera visita a HealthCore"
- **Tiene seguro:** "Indica si tienes seguro médico"
- **Aseguradora:** "Ingresa el nombre de tu aseguradora"
- **ID de afiliado:** "El ID de afiliado debe tener entre 6 y 20 caracteres alfanuméricos"
- **Consulta médica:** "Describe tu consulta médica en al menos 20 caracteres (faltan X caracteres)"
- **Consentimiento:** "Debes dar tu consentimiento para ser contactado antes de enviar este formulario"

---

## Mensaje de éxito

Cuando el formulario valide correctamente (simular envío; no enviar datos a ningún lugar), muestra:

> **Gracias por contactar a HealthCore.**
>
> Hemos recibido tu consulta. Un miembro de nuestro equipo de recepción se pondrá en contacto contigo dentro de 1 día hábil para confirmar los detalles de tu cita y responder cualquier pregunta.
>
> Si necesitas asistencia urgente, llama directamente a tu clínica preferida usando los números listados en nuestro sitio web.
>
> Esperamos poder atenderte pronto.

---

## Restricción específica

El formulario de consulta está diseñado para **pacientes que buscan atención médica**, no para empresas ni proveedores de salud que quieran asociarse con HealthCore. El formulario debe incluir una nota visible que diga:

> "¿Eres un proveedor de salud u organización que busca asociarse con HealthCore? Contacta a nuestro equipo de operaciones en partnerships@healthcore.com"

---

## Marcado Schema.org requerido

Implementa los siguientes datos estructurados de Schema.org en tu landing page:

```json
{
  "@context": "https://schema.org",
  "@type": "MedicalOrganization",
  "name": "HealthCore",
  "description": "Outpatient healthcare network offering primary care, specialist consultations, chronic disease management, and preventive health programmes.",
  "url": "https://www.healthcore.com",
  "foundingDate": "2011",
  "logo": "https://www.healthcore.com/logo.png",
  "availableLanguage": ["English", "Spanish"],
  "areaServed": ["US", "GB"],
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Austin",
    "addressRegion": "Texas",
    "addressCountry": "US"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+1-512-340-8800",
    "contactType": "patient services",
    "availableLanguage": ["English", "Spanish"]
  },
  "sameAs": [
    "https://linkedin.com/company/healthcore",
    "https://facebook.com/healthcore",
    "https://instagram.com/healthcore"
  ]
}
```

Además, incluye una entrada `MedicalClinic` para cada ubicación en EE. UU. listada en la tabla de Ubicaciones, con `name`, `telephone`, `openingHours` y `parentOrganization` referenciando a HealthCore.

# CONTEXT — HealthCore

**Milestone 2: Programming Fundamentals**  
**Company:** HealthCore — Outpatient Healthcare Network  
**Your Role:** Junior AI Engineer, HealthCore Digital Team  
**Project Owner:** James Osei, CTO

---

## About HealthCore

HealthCore is an outpatient healthcare services company operating 12 clinics across the United States (Texas, Florida, Georgia) and the United Kingdom (London, Manchester). You're part of HealthCore Digital, the internal technology unit built to modernise clinical and operational workflows. The company processes around 600 patient visits per week, manages insurance billing across US and UK systems, and employs over 200 clinical and administrative staff.

---

## Your Assignment

James Osei, the CTO, needs you to build the core data processing logic for three of HealthCore's most pressing operational problems: billing denial tracking, no-show cost estimation, and CME (continuing medical education) compliance monitoring.

Right now, Tom Callahan's billing team calculates denial rates manually from CSV exports. Marcus Reid's clinical team has no way to estimate how much revenue is lost to no-shows each week. And Diane Foster's people team tracks CME hours in a spreadsheet with no alerts when clinicians fall behind — which creates real regulatory risk.

This milestone focuses on building the TypeScript functions that will power an internal operations dashboard. This is pure programming — no AI, no prompting. James needs to see that you can write solid, well-typed code that handles real business logic correctly.

> "The goal of this milestone is not complexity — it's reliability. These numbers go to Tom, Marcus, and Diane every Monday morning. If they're wrong, I hear about it. Write code you can trust."  
> — James Osei, CTO

---

## What You're Building

You will implement a set of TypeScript utilities to:

1. **Model claims, appointments, and clinician data** using interfaces
2. **Filter and search operational records** by location, status, and date
3. **Calculate billing denial rates** by payer and location
4. **Estimate no-show revenue impact** per clinic per week
5. **Track CME compliance** and flag clinicians at risk
6. **Validate data** before processing

---

## Business Entities

### Claim

A claim represents a billing request submitted to an insurance payer after a patient visit.

**Interface: `Claim`**

```typescript
interface Claim {
  claimId: string; // Format: "CLM-XXXXXX" (e.g., "CLM-000042")
  patientId: string; // Format: "HC-XXXXXX" (e.g., "HC-A3F291")
  locationId: string; // Clinic ID (e.g., "us-tx-001")
  serviceType: ServiceType; // Type of care delivered
  payerName: string; // Insurance provider name (e.g., "BlueCross")
  payerId: string; // Alphanumeric payer code
  submissionDate: string; // ISO 8601 date string
  claimAmount: number; // Amount billed in USD (must be > 0)
  status: ClaimStatus; // Current claim status
  denialReason?: DenialReason; // Only present when status === "denied"
  resubmitted: boolean; // Whether the claim was resubmitted after denial
}

type ClaimStatus = "submitted" | "approved" | "denied" | "pending" | "appealed";

type DenialReason =
  | "missing_authorisation"
  | "coding_error"
  | "duplicate_claim"
  | "patient_not_covered"
  | "service_not_covered"
  | "incomplete_documentation";

type ServiceType =
  | "primary_care"
  | "chronic_disease"
  | "preventive"
  | "specialist"
  | "womens_health"
  | "paediatric"
  | "mental_health";
```

**Validation Rules:**

- `claimAmount` must be > 0
- `submissionDate` must not be a future date
- `locationId` must match one of the known clinic IDs
- If `status === "denied"`, `denialReason` must be present
- `patientId` must match the format `HC-` followed by 6 alphanumeric characters

---

### Appointment

An appointment represents a scheduled patient visit at one of HealthCore's clinics.

**Interface: `Appointment`**

```typescript
interface Appointment {
  appointmentId: string; // Format: "APT-XXXXXX"
  patientId: string; // Format: "HC-XXXXXX"
  locationId: string; // Clinic ID
  serviceType: ServiceType; // Type of care scheduled
  scheduledDate: string; // ISO 8601 date string
  scheduledTime: string; // "HH:MM" in 24-hour format
  status: AppointmentStatus; // Current appointment status
  noShowReason?: string; // Free text, only present when status === "no_show"
  confirmedAt?: string; // ISO 8601 datetime, absent if not yet confirmed
}

type AppointmentStatus =
  | "scheduled"
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled";
```

**Validation Rules:**

- `scheduledTime` must be a valid 24-hour time string in the format "HH:MM"
- `locationId` must match one of the known clinic IDs
- If `status === "no_show"`, `noShowReason` should be present (warn if missing, do not reject)

---

### Clinician

A clinician is a licensed clinical staff member who must maintain continuing medical education hours.

**Interface: `Clinician`**

```typescript
interface Clinician {
  clinicianId: string; // Format: "CLN-XXXXXX"
  firstName: string;
  lastName: string;
  role: ClinicianRole; // Determines CME requirements
  locationId: string; // Assigned clinic
  licenceState: string; // US state code (e.g., "TX") or "UK"
  licenceExpiryDate: string; // ISO 8601 date string
  cmeHoursRequired: number; // Annual CME hours required for this role
  cmeHoursLogged: number; // Hours logged so far in the current cycle
  cmeYearStartDate: string; // ISO 8601 date — start of current CME cycle
}

type ClinicianRole =
  | "physician"
  | "nurse_practitioner"
  | "nurse"
  | "medical_assistant";
```

**Validation Rules:**

- `cmeHoursRequired` must be >= 0
- `cmeHoursLogged` must be >= 0
- `licenceExpiryDate` must be a valid future or present date (past dates are flagged as expired)
- `role` must be one of the four defined values

---

### Location

A location represents one of HealthCore's clinics, including the average fees used for no-show cost calculations.

**Interface: `Location`**

```typescript
interface Location {
  locationId: string;
  name: string;
  city: string;
  stateOrCountry: string;
  country: "US" | "UK";
  phone: string;
  averageConsultationFee: Record<ServiceType, number>; // Average fee in USD per service type
}
```

---

## Required Functions

Implement these functions in the appropriate files according to the structure in the README.

### 1. Collection Operations (`src/utils/collections.ts`)

**`filterClaims(claims: Claim[], filters: Partial<Pick<Claim, "locationId" | "status" | "payerName" | "serviceType">>): Claim[]`**

- Returns claims that match ALL provided filter criteria
- Ignores filter keys that are not provided

**`filterAppointmentsByStatus(appointments: Appointment[], status: AppointmentStatus[]): Appointment[]`**

- Returns appointments whose status matches any of the provided statuses

**`sortClaimsById(claims: Claim[], direction: "asc" | "desc"): Claim[]`**

- Returns claims sorted alphanumerically by `claimId`
- Must not mutate the original array

**`sortAppointmentsByDate(appointments: Appointment[], direction: "asc" | "desc"): Appointment[]`**

- Returns appointments sorted by `scheduledDate`
- Must not mutate the original array

**`groupClaimsBy(claims: Claim[], key: "locationId" | "payerName" | "status" | "serviceType"): Record<string, Claim[]>`**

- Groups claims by the specified key
- Returns an object where each key maps to an array of matching claims

---

### 2. Search Operations (`src/utils/search.ts`)

**`findClaimById(claims: Claim[], claimId: string): Claim | null`**

- Performs linear search to find a claim by its ID
- Returns the claim if found, null otherwise

**`findClinicianById(clinicians: Clinician[], clinicianId: string): Clinician | null`**

- Performs linear search to find a clinician by their ID
- Returns the clinician if found, null otherwise

**`binarySearchClaimById(sortedClaims: Claim[], targetId: string): number`**

- Assumes the array is already sorted by `claimId` ascending (use `sortClaimsById` first)
- Performs binary search to find the index of the claim with the target ID
- Returns the index if found, -1 otherwise

---

### 3. Billing Denial Rate Calculator (`src/utils/transformations.ts`)

**`calculateDenialRate(claims: Claim[]): number`**

- Returns the denial rate as a percentage (0–100), rounded to 2 decimal places
- Only counts claims with status `"denied"` as denied
- Throws an error if the claims array is empty

**`denialRateByPayer(claims: Claim[]): Record<string, number>`**

- Groups claims by `payerName` and calculates the denial rate for each payer
- Returns an object where keys are payer names and values are denial rate percentages (rounded to 2 decimal places)
- Only includes payers that appear in the claims array

**`denialRateByLocation(claims: Claim[]): Record<string, number>`**

- Groups claims by `locationId` and calculates the denial rate for each location
- Returns an object where keys are location IDs and values are denial rate percentages (rounded to 2 decimal places)

**`flagHighDenialPayers(claims: Claim[], threshold: number): string[]`**

- Returns the names of payers whose denial rate exceeds the given threshold
- Use 8 as the default threshold (HealthCore's industry benchmark is 5–8%)
- Returns an empty array if no payers exceed the threshold

---

### 4. No-Show Cost Estimator (`src/utils/transformations.ts`)

**`calculateNoShowCost(appointments: Appointment[], location: Location, weekEndingDate: string): number`**

- Calculates the total estimated revenue lost to no-shows at a given location during the 7 calendar days ending on `weekEndingDate` (inclusive)
- Uses `location.averageConsultationFee[serviceType]` to estimate the cost of each missed appointment
- Returns 0 if there are no no-shows in that period
- Returns a number in USD, rounded to 2 decimal places

**`noShowRateByLocation(appointments: Appointment[]): Record<string, number>`**

- Calculates the no-show rate per location as a percentage
- Returns an object where keys are location IDs and values are percentages (rounded to 2 decimal places)

**`flagHighNoShowLocations(appointments: Appointment[], threshold: number): string[]`**

- Returns the IDs of locations whose no-show rate exceeds the given threshold
- Use 20 as the default threshold (HealthCore's internal alert level)

---

### 5. CME Compliance Tracker (`src/utils/transformations.ts`)

**`generateCMEReport(clinicians: Clinician[], asOfDate: string): CMEReport[]`**

Generates one report entry per clinician. Return type:

```typescript
interface CMEReport {
  clinicianId: string;
  fullName: string; // "${firstName} ${lastName}"
  role: ClinicianRole;
  locationId: string;
  hoursRequired: number;
  hoursLogged: number;
  hoursRemaining: number; // Math.max(0, required - logged)
  percentComplete: number; // (logged / required) * 100, rounded to 1 decimal
  daysRemainingInCycle: number; // Calendar days from asOfDate to end of CME cycle
  complianceStatus: CMEStatus;
  licenceExpiryDate: string;
  licenceDaysRemaining: number; // Calendar days from asOfDate to licence expiry
}

type CMEStatus = "on_track" | "at_risk" | "overdue" | "complete";
```

**Compliance status logic:**

- `"complete"` — `hoursLogged >= hoursRequired`
- `"overdue"` — the CME cycle has ended AND `hoursLogged < hoursRequired`
- `"at_risk"` — the cycle is active AND the clinician's `percentComplete` is more than 15 percentage points behind the share of the year that has elapsed
- `"on_track"` — the cycle is active and the clinician is not at risk

**`getCliniciansAtRisk(clinicians: Clinician[], asOfDate: string): Clinician[]`**

- Returns all clinicians whose `complianceStatus` is `"at_risk"` or `"overdue"`

**`getCliniciansWithExpiringLicences(clinicians: Clinician[], asOfDate: string, daysThreshold: number): Clinician[]`**

- Returns clinicians whose licence expires within `daysThreshold` calendar days from `asOfDate`
- Use 90 as the recommended threshold for first alerts, 30 for urgent alerts

---

### 6. Validations (`src/utils/validations.ts`)

**`validateClaim(claim: Claim, knownLocationIds: string[]): { valid: boolean, errors: string[] }`**

- Validates all business rules for a claim
- Returns `{ valid: true, errors: [] }` if all rules pass
- Returns `{ valid: false, errors: ["..."] }` with one message per failed rule

**`validateClinician(clinician: Clinician): { valid: boolean, errors: string[] }`**

- Validates all business rules for a clinician record
- Returns `{ valid: true, errors: [] }` if all rules pass

**`isDenialRateAboveThreshold(rate: number, threshold?: number): boolean`**

- Returns true if `rate` exceeds `threshold` (default: 8)

**`isNoShowRateAboveThreshold(rate: number, threshold?: number): boolean`**

- Returns true if `rate` exceeds `threshold` (default: 20)

---

## Sample Data

Use this data to test your functions. Field names and values must match the interfaces exactly.

### Sample Locations

```typescript
const sampleLocations: Location[] = [
  {
    locationId: "us-tx-001",
    name: "HealthCore Austin Central",
    city: "Austin",
    stateOrCountry: "TX",
    country: "US",
    phone: "(512) 340-8800",
    averageConsultationFee: {
      primary_care: 180,
      chronic_disease: 220,
      preventive: 150,
      specialist: 320,
      womens_health: 240,
      paediatric: 175,
      mental_health: 200,
    },
  },
  {
    locationId: "us-fl-001",
    name: "HealthCore Miami",
    city: "Miami",
    stateOrCountry: "FL",
    country: "US",
    phone: "(305) 510-7700",
    averageConsultationFee: {
      primary_care: 195,
      chronic_disease: 235,
      preventive: 160,
      specialist: 340,
      womens_health: 255,
      paediatric: 185,
      mental_health: 215,
    },
  },
  {
    locationId: "us-ga-001",
    name: "HealthCore Atlanta",
    city: "Atlanta",
    stateOrCountry: "GA",
    country: "US",
    phone: "(404) 330-9900",
    averageConsultationFee: {
      primary_care: 170,
      chronic_disease: 210,
      preventive: 145,
      specialist: 310,
      womens_health: 230,
      paediatric: 165,
      mental_health: 190,
    },
  },
];
```

### Sample Claims

```typescript
const sampleClaims: Claim[] = [
  {
    claimId: "CLM-000001",
    patientId: "HC-A3F291",
    locationId: "us-tx-001",
    serviceType: "primary_care",
    payerName: "BlueCross",
    payerId: "BC001",
    submissionDate: "2025-03-10",
    claimAmount: 180,
    status: "approved",
    resubmitted: false,
  },
  {
    claimId: "CLM-000002",
    patientId: "HC-B7K442",
    locationId: "us-fl-001",
    serviceType: "specialist",
    payerName: "Aetna",
    payerId: "AET002",
    submissionDate: "2025-03-11",
    claimAmount: 340,
    status: "denied",
    denialReason: "missing_authorisation",
    resubmitted: false,
  },
  {
    claimId: "CLM-000003",
    patientId: "HC-C2M881",
    locationId: "us-ga-001",
    serviceType: "chronic_disease",
    payerName: "Medicare",
    payerId: "MED003",
    submissionDate: "2025-03-12",
    claimAmount: 210,
    status: "approved",
    resubmitted: false,
  },
  {
    claimId: "CLM-000004",
    patientId: "HC-D9P553",
    locationId: "us-tx-001",
    serviceType: "preventive",
    payerName: "BlueCross",
    payerId: "BC001",
    submissionDate: "2025-03-13",
    claimAmount: 150,
    status: "denied",
    denialReason: "coding_error",
    resubmitted: true,
  },
  {
    claimId: "CLM-000005",
    patientId: "HC-E4Q117",
    locationId: "us-fl-001",
    serviceType: "mental_health",
    payerName: "Cigna",
    payerId: "CIG004",
    submissionDate: "2025-03-14",
    claimAmount: 215,
    status: "pending",
    resubmitted: false,
  },
];
```

### Sample Appointments

```typescript
const sampleAppointments: Appointment[] = [
  {
    appointmentId: "APT-000001",
    patientId: "HC-A3F291",
    locationId: "us-tx-001",
    serviceType: "primary_care",
    scheduledDate: "2025-03-10",
    scheduledTime: "09:00",
    status: "completed",
    confirmedAt: "2025-03-09T14:00:00Z",
  },
  {
    appointmentId: "APT-000002",
    patientId: "HC-F6R228",
    locationId: "us-fl-001",
    serviceType: "specialist",
    scheduledDate: "2025-03-11",
    scheduledTime: "11:30",
    status: "no_show",
    noShowReason: "Patient did not call to cancel",
  },
  {
    appointmentId: "APT-000003",
    patientId: "HC-G1S774",
    locationId: "us-tx-001",
    serviceType: "chronic_disease",
    scheduledDate: "2025-03-12",
    scheduledTime: "14:00",
    status: "no_show",
    noShowReason: "Unreachable before appointment",
  },
  {
    appointmentId: "APT-000004",
    patientId: "HC-H8T390",
    locationId: "us-ga-001",
    serviceType: "preventive",
    scheduledDate: "2025-03-13",
    scheduledTime: "10:00",
    status: "completed",
    confirmedAt: "2025-03-12T09:30:00Z",
  },
  {
    appointmentId: "APT-000005",
    patientId: "HC-I5U661",
    locationId: "us-fl-001",
    serviceType: "mental_health",
    scheduledDate: "2025-03-14",
    scheduledTime: "16:00",
    status: "no_show",
    noShowReason: "Transportation issue reported",
  },
];
```

### Sample Clinicians

```typescript
const sampleClinicians: Clinician[] = [
  {
    clinicianId: "CLN-000001",
    firstName: "Marcus",
    lastName: "Reid",
    role: "physician",
    locationId: "us-tx-001",
    licenceState: "TX",
    licenceExpiryDate: "2026-06-30",
    cmeHoursRequired: 40,
    cmeHoursLogged: 28,
    cmeYearStartDate: "2025-01-01",
  },
  {
    clinicianId: "CLN-000002",
    firstName: "Sandra",
    lastName: "Flores",
    role: "nurse_practitioner",
    locationId: "us-fl-001",
    licenceState: "FL",
    licenceExpiryDate: "2025-05-15",
    cmeHoursRequired: 30,
    cmeHoursLogged: 6,
    cmeYearStartDate: "2025-01-01",
  },
  {
    clinicianId: "CLN-000003",
    firstName: "David",
    lastName: "Okafor",
    role: "physician",
    locationId: "us-ga-001",
    licenceState: "GA",
    licenceExpiryDate: "2027-01-01",
    cmeHoursRequired: 40,
    cmeHoursLogged: 40,
    cmeYearStartDate: "2025-01-01",
  },
];
```

---

## Business Rules Reference

These thresholds come directly from Tom Callahan (Revenue Cycle) and Diane Foster (People). Encode them exactly — they will be displayed on the Monday morning operations report.

| Rule                                     | Value                                  | Source          |
| ---------------------------------------- | -------------------------------------- | --------------- |
| Billing denial rate — industry benchmark | 8%                                     | Tom Callahan    |
| No-show rate — internal alert threshold  | 20%                                    | Dr. Marcus Reid |
| CME hours required — Physician           | 40 hours/year                          | Diane Foster    |
| CME hours required — Nurse Practitioner  | 30 hours/year                          | Diane Foster    |
| "At risk" CME — trailing threshold       | 15 percentage points behind cycle pace | Diane Foster    |
| Licence alert — first warning            | 90 days before expiry                  | Diane Foster    |
| Licence alert — urgent warning           | 30 days before expiry                  | Diane Foster    |

---

## Acceptance Criteria

Your implementation will be evaluated on:

1. **Type safety:** All interfaces defined with correct field names and types — no `any`
2. **Function correctness:** Each function produces the expected output for the given inputs
3. **Edge case handling:** Functions handle empty arrays, division by zero, and missing optional fields gracefully
4. **Validation logic:** Business rules from the table above are enforced accurately
5. **Code organisation:** Functions are in the correct files according to responsibility
6. **No mutations:** Sorting and filtering functions do not modify the original arrays
7. **Pure functions:** Functions only work with what they receive as parameters — no global state

---

## Questions?

If you're unsure about any requirement, ask your mentor. In a real work environment, you'd message James on Slack or drop a comment on the Jira ticket.

---

_This is a real HealthCore Digital project. What you build here will be refactored into the live operations dashboard._

# CONTEXT — HealthCore · Milestone 3: Talent Pipeline Tracker

> **Repository path:** `03-talent-pipeline-tracker/CONTEXT-healthcore.md`

---

## Your company

You are part of **HealthCore Digital**, the internal technology unit of HealthCore, an outpatient healthcare services company with 12 clinics across the United States and the United Kingdom. Everything you build supports operational processes that affect clinical staff and, indirectly, patient care. Tools that fail silently are not acceptable.

---

## The assignment

Diane Foster, VP of People, has sent the following email with James Osei, CTO, on copy:

> **To:** James Osei (CTO)
> **CC:** HealthCore Digital Team
> **Subject:** URGENT — Candidate management tool needed this week
>
> James,
>
> I need to escalate this directly. We are in the middle of selecting an **Executive Assistant** for the Austin headquarters and the process has completely outgrown our current setup. We have over a hundred applications and my team is managing everything in a shared spreadsheet. This morning I found that two candidates had their status overwritten by mistake and one of them had already been scheduled for an interview.
>
> I spoke with the tech team last week and they confirmed the backend is live. I need someone to build the frontend now. I cannot run a professional recruitment process for our own headquarters on a spreadsheet — especially when we are simultaneously asking clinical teams to trust our systems.
>
> What I need the tool to do:
>
> - Show all candidates in a list with name, position, status, and stage visible immediately.
> - Filter by status and stage, and search by name or email without reloading the page.
> - Open a candidate's full detail and update their status or stage from there.
> - Add internal notes after each call or interview, and remove them when they are no longer relevant.
> - Register candidates who come through referrals and correct data when it arrives incorrectly.
>
> Please make this your team's priority this week.
>
> Diane

---

## Context of the active search

| Field    | Value                                                                                                                            |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Position | Executive Assistant                                                                                                              |
| Company  | HealthCore                                                                                                                       |
| Location | Austin headquarters                                                                                                              |
| Profile  | Executive support experience, calendar and travel management, professional English, discretion in handling sensitive information |

---

## API and data

The mock API is centrally deployed and shared across all company contexts in the course. Fields, values, and structure are as defined in the backend technical specification. No adaptation is required.

### `status` values

| API value     | UI label    |
| ------------- | ----------- |
| `received`    | Received    |
| `in_progress` | In progress |
| `selected`    | Selected    |
| `discarded`   | Discarded   |

### `stage` values

| API value             | UI label            |
| --------------------- | ------------------- |
| `pending`             | Pending review      |
| `review`              | Under review        |
| `personal_interview`  | Personal interview  |
| `technical_interview` | Technical interview |
| `offer_presented`     | Offer presented     |

> Raw API values (`in_progress`, `personal_interview`, etc.) must never be visible in the interface. Always use the labels from this table.

---

## Specific acceptance criteria

- Status and stage fields show human-readable labels, never raw API values.
- Notes are visible only within the candidate detail view.
- The registration form includes all fields required by the API.

---

_Internal document — 4Geeks Academy · AI Engineering Track_
_For exclusive use in programme project generation_

# CONTEXT — Milestone 5: Backend Inventory Management

## Company: HealthCore

**Path:** `05-backend-inventory-orm/CONTEXT-healthcore.md`

---

## Your Company

**HealthCore** is an outpatient healthcare services company operating 12 clinics across the USA (Texas, Florida, Georgia) and the UK (London, Manchester). Each clinic consumes medical supplies daily — syringes, PPE, wound care materials, rapid diagnostic tests, and medications — and receives restocking shipments from certified healthcare vendors.

Tracking what supplies are available at each clinic is both an operational necessity and a compliance requirement. Running out of PPE mid-shift or using expired supplies creates clinical risk. Until now, each location has managed stock in a local spreadsheet with no central visibility.

**James Osei (CTO)** has prioritised this as part of the HealthCore Digital platform build.

> **From James (CTO) — Jira ticket HCR-0188:**
> "We need a medical supply inventory API as the foundation for the clinical operations dashboard. Supply entries are deliveries from vendors. Supply exits are clinical consumptions logged by clinic staff. Stock is always the net of entries minus exits — direct modification is not allowed. All routes under `/inventory`. User UUIDs come from TinyDB. Claire has confirmed: supply inventory data is operational, not PHI — no HIPAA barriers on this API, but access must be authenticated."

---

## Entity Names and Field Specification

Use these names exactly in your models, schemas, and API responses.

### `MedicalSupply` (maps to README's `Product`)

| Field           | Type       | Notes                                                                                            |
| --------------- | ---------- | ------------------------------------------------------------------------------------------------ |
| `id`            | `int` (PK) | Auto-increment                                                                                   |
| `name`          | `str`      | e.g., `"Nitrile gloves (box of 100)"`, `"Rapid strep test kit"`                                  |
| `sku`           | `str`      | Internal catalogue code, e.g., `"HCR-PPE-001"`, `"HCR-DIAG-003"`                                 |
| `category`      | `str`      | `"ppe"`, `"wound_care"`, `"diagnostics"`, `"medications"`, `"consumables"`                       |
| `unit`          | `str`      | `"box"`, `"unit"`, `"pack"`, `"vial"`                                                            |
| `country`       | `str`      | `"US"` or `"UK"` — regulatory jurisdiction                                                       |
| `current_stock` | `int`      | **Computed field — not stored.** Derived from supply movements. Include in response schema only. |

### `SupplyDelivery` (maps to README's `InboundOrder`)

A vendor shipment received at a HealthCore clinic.

| Field         | Type                       | Notes                                                                     |
| ------------- | -------------------------- | ------------------------------------------------------------------------- |
| `id`          | `int` (PK)                 | Auto-increment                                                            |
| `supply_id`   | `int` (FK → MedicalSupply) |                                                                           |
| `quantity`    | `int`                      | Units received                                                            |
| `vendor_name` | `str`                      | e.g., `"MedLine Industries"`, `"Cardinal Health UK"`                      |
| `clinic_id`   | `int`                      | Receiving clinic (1–12). Not a FK — clinic data is managed separately.    |
| `created_at`  | `datetime`                 | Auto-set on creation                                                      |
| `user_uuid`   | `str`                      | UUID of the clinic administrator who confirmed the delivery (from TinyDB) |

### `SupplyConsumption` (maps to README's `OutboundOrder`)

A clinical use event: supplies consumed during patient care.

| Field              | Type                       | Notes                                                                               |
| ------------------ | -------------------------- | ----------------------------------------------------------------------------------- |
| `id`               | `int` (PK)                 | Auto-increment                                                                      |
| `supply_id`        | `int` (FK → MedicalSupply) |                                                                                     |
| `quantity`         | `int`                      | Units consumed                                                                      |
| `consumption_type` | `str`                      | `"clinical_use"` (used in patient care) or `"expiry_waste"` (expired and discarded) |
| `clinic_id`        | `int`                      | Clinic where consumption occurred                                                   |
| `created_at`       | `datetime`                 | Auto-set on creation                                                                |
| `user_uuid`        | `str`                      | UUID of the clinical or admin staff member who logged the consumption (from TinyDB) |

---

## API Router

All endpoints must be registered under the `/inventory` prefix. The router file lives at `services/routers/inventory.py`.

| Method | Path                         | Description                                           |
| ------ | ---------------------------- | ----------------------------------------------------- |
| `GET`  | `/inventory/products`        | List all medical supplies with `current_stock`        |
| `POST` | `/inventory/products`        | Register a new supply item                            |
| `GET`  | `/inventory/products/{id}`   | Get one supply with current stock                     |
| `POST` | `/inventory/orders/inbound`  | Log a vendor delivery (`SupplyDelivery`)              |
| `POST` | `/inventory/orders/outbound` | Log a clinical consumption (`SupplyConsumption`)      |
| `GET`  | `/inventory/orders`          | List all deliveries and consumptions with supply data |

---

## Business Rules

1. **`current_stock` is always computed**, never stored. For any supply: `current_stock = SUM(SupplyDelivery.quantity) − SUM(SupplyConsumption.quantity)`.
2. **A `SupplyConsumption` cannot be registered if it would result in negative stock.** Return `HTTP 400` with the message: `"Insufficient stock for supply '{name}'. Available: {available}, requested: {quantity}."`. Reject before writing.
3. **`consumption_type` must be either `"clinical_use"` or `"expiry_waste"`**. Validate in the request schema.
4. **No user table in Supabase.** The `user_uuid` fields reference TinyDB users. Do not create a User model in SQLModel.
5. **US and UK supplies coexist in the same table.** The `country` field (`"US"` or `"UK"`) identifies the regulatory jurisdiction. It must be present in both the model and response schema.
6. **Clinic IDs range from 1–12** (9 US clinics, 3 UK clinics). They are stored as integers, not as foreign keys in this milestone.

---

## Seed Data

Create the following records when setting up your local development database.

### MedicalSupplies (minimum 6)

| name                           | sku          | category    | unit | country |
| ------------------------------ | ------------ | ----------- | ---- | ------- |
| Nitrile gloves (box of 100)    | HCR-PPE-001  | ppe         | box  | US      |
| Surgical mask (pack of 50)     | HCR-PPE-002  | ppe         | pack | UK      |
| Adhesive wound dressing        | HCR-WND-001  | wound_care  | box  | US      |
| Rapid strep test kit           | HCR-DIAG-001 | diagnostics | unit | US      |
| Blood glucose test strips (50) | HCR-DIAG-002 | diagnostics | box  | UK      |
| 0.9% Saline solution 500ml     | HCR-MED-001  | medications | vial | US      |

### SupplyDeliveries (minimum 4)

Log at least 2 deliveries for `HCR-PPE-001` in different quantities. Use vendor names like `"MedLine Industries"`, `"Cardinal Health UK"`, `"Bound Tree Medical"`. Mix clinic IDs across both countries.

### SupplyConsumptions (minimum 3)

Include at least one `"clinical_use"` and one `"expiry_waste"` event. Quantities must not exceed seeded deliveries for the affected supply. Use `user_uuid` values from your TinyDB instance.

---

## File Structure (within `services/`)

```text
services/
├── main.py
├── database.py          # TinyDB client + SQLModel engine + get_db dependency
├── models.py            # MedicalSupply, SupplyDelivery, SupplyConsumption (SQLModel)
├── schemas.py           # Pydantic request/response schemas
└── routers/
    └── inventory.py     # APIRouter(prefix="/inventory")
```

---

## Acceptance Notes for HealthCore

- The evaluator will log a `SupplyConsumption` exceeding available stock and expect `HTTP 400`.
- The evaluator will attempt a `SupplyConsumption` with an invalid `consumption_type` value and expect a validation error.
- The evaluator will verify that `current_stock` in `GET /inventory/products` reflects the net of seeded deliveries and consumptions.
- The `country` field must be present in both the model and response schema.
- The `clinic_id` field must be present on both `SupplyDelivery` and `SupplyConsumption`.

---

_Internal document — 4Geeks Academy · AI Engineering Track_
_Milestone 5 · HealthCore scenario_

Ver aca todo el milestone 7

https://github.com/4GeeksAcademy/ai-engineering-syllabus/tree/main/content/contexts/07-trainning-rag/healthcore

