# Auditoría de serialización — HealthCore API (`services/api`)

**Rama:** `feature/serialization-audit` · **Alcance:** las 30 rutas de la API FastAPI (auth, usuarios, perfiles, proveedores, incidentes, inventario y health check).

## 1. Metodología

1. **Inventario de rutas.** Se recorrió `app.openapi()` para no depender de leer el código a mano. El script de verificación está en la sección 6.
2. **Qué devuelve hoy cada endpoint.** Se llamó a cada uno con datos de prueba (TestClient, con TinyDB temporal y SQLite en lugar de Supabase) y se registraron las claves exactas de la respuesta. La captura del estado original está en la columna *Respuesta original* de las tablas.
3. **Quién consume cada endpoint.** Se rastreó el backoffice (`uis/backoffice`) para listar qué campos lee realmente cada pantalla. Los campos que el modelo tiene y la UI no usa fueron candidatos a salir.
4. **Clasificación:**
   - ✅ **Serializado:** tiene `response_model` y la forma es la adecuada.
   - ⚠️ **Parcial:** tiene `response_model`, pero expone de más o no coincide con lo que necesita el consumidor.
   - ❌ **No serializado:** devuelve un `dict` sin tipo o recibe un `dict` sin schema.
5. **Implementación.** Un commit por grupo de endpoints, con los tests corriendo después de cada uno.

> **Nota de integración.** Antes de auditar se juntaron en esta rama las features que estaban en ramas sin fusionar: `feature/unit-tests` (auth, reset de contraseña, incidentes, manejo de errores, tests), `feature/inventory-backoffice` (inventario en Supabase) y `feature/auth-api` (fix de AUTH-01). Sin esto, la auditoría no habría cubierto las rutas de autenticación, que son las de mayor riesgo. Los conflictos se resolvieron conservando ambos lados, y los 114 tests existentes pasaron antes de empezar.

## 2. Resumen

| Estado | Original | Final |
|---|---|---|
| ✅ Serializado | 13 | **30** |
| ⚠️ Parcial | 9 | 0 |
| ❌ No serializado | 8 | 0 |

**Hallazgos principales**

1. **El registro público (`POST /users`) devolvía el email**, además de `role`, `is_active` y `created_at`. Es un flujo sin autenticación, así que no debe repetir datos de la cuenta.
2. **Ninguna ruta de incidentes tenía schema:** entrada `dict = Body(...)` y salida `dict` armado a partir del documento de TinyDB.
3. **El historial de inventario exponía `user_uuid`**, la llave interna que conecta Supabase con TinyDB. La tabla del backoffice la mostraba tal cual al usuario ("Created by (user_uuid)").
4. **Las listas reutilizaban el schema de detalle.** Por ejemplo, `GET /suppliers` mandaba `notes`, `contact_email`, datos de compliance y `updated_at` en cada fila, cuando la tabla no muestra ninguno de esos campos.
5. **El perfil exponía su `id` y la FK `user_id`.** La API siempre resuelve el perfil desde el token, así que el cliente nunca necesita esos ids.

Ninguna respuesta contenía `hashed_password`: los schemas de usuario ya listaban campos explícitos. Ahora hay un test que lo garantiza (sección 6).

## 3. Auditoría por endpoint

Leyenda de columnas: **Consumidor** = quién llama al endpoint y qué campos lee. **Cambio** = qué se hizo y por qué.

### 3.1 Autenticación (prioridad máxima)

| # | Método y ruta | Propósito | Respuesta original | Estado original | Consumidor | Forma final | Cambio | Final |
|---|---|---|---|---|---|---|---|---|
| 1 | `POST /users` | Registro público | `UserResponse`: `id, email, role, is_active, created_at` | ⚠️ | `auth-context.register()`: no lee el body, solo verifica `res.ok` y luego hace login | `RegisterResponse`: `id, detail` | Deja de repetir el email y el estado de la cuenta. El cliente ya conoce lo que envió y su siguiente paso es `/auth/login`. `id` no es una credencial y permite referenciar la cuenta creada. Entrada `UserCreate`, sin cambios. | ✅ |
| 2 | `POST /auth/login` | Login OAuth2 (form) | `Token`: `access_token, token_type` | ✅ | `auth-context.login()` lee `access_token` | igual | — | ✅ |
| 3 | `GET /auth/me` | Sesión actual | `MeResponse`: `email, role, profile{id, user_id, name, phone, address}` | ⚠️ | Nav, perfil y guards: leen `email`, `role` y `profile.name/phone/address` | `MeResponse`: `email, role, profile{name, phone, address}` | El `email` propio **se mantiene** porque la vista de perfil lo usa. El perfil anidado pierde `id` y `user_id` (ids internos). | ✅ |
| 4 | `POST /auth/forgot-password` | Pedir enlace de reseteo | `MessageResponse`: `detail` (mensaje genérico) | ✅ | página forgot-password | igual | Ya era correcto: no repite el email y responde lo mismo exista o no la cuenta, así que no revela qué emails están registrados. | ✅ |
| 5 | `POST /auth/reset-password` | Nueva contraseña con token | `MessageResponse` | ✅ | página reset-password | igual | — | ✅ |
| 6 | `POST /auth/change-password` | Cambio estando logueado | `MessageResponse` | ✅ | cuenta → cambiar contraseña | igual | — | ✅ |

### 3.2 Usuarios y perfiles

| # | Método y ruta | Propósito | Respuesta original | Estado original | Consumidor | Forma final | Cambio | Final |
|---|---|---|---|---|---|---|---|---|
| 7 | `GET /users` | Lista (solo admin) | `list[UserResponse]` (schema de detalle) | ⚠️ | Admin u otro servicio: necesita identificar y gestionar cuentas | `list[UserListItem]`: `id, email, role, is_active` | Schema de lista propio, sin `created_at`. El email se mantiene porque es un endpoint autenticado y solo para admin, y es lo que identifica la cuenta. | ✅ |
| 8 | `GET /users/{id}` | Detalle (dueño o admin) | `UserResponse`: `id, email, role, is_active, created_at` | ✅ | dueño o admin | igual | Campos explícitos, sin credenciales. | ✅ |
| 9 | `PUT /users/{id}` | Editar email/rol | `UserResponse` · entrada `UserUpdate` | ✅ | dueño o admin | igual | La entrada solo acepta `email` y `role`, y `role` solo lo puede cambiar un admin. | ✅ |
| 10 | `DELETE /users/{id}` | Borrar cuenta | `dict` sin tipo `{detail, id}` | ❌ | — | `DeleteResponse`: `detail, id` | Contrato explícito. | ✅ |
| 11 | `GET /profiles/me` | Ver perfil | `ProfileResponse`: `id, user_id, name, phone, address` | ⚠️ | página de perfil (lee `name, phone, address`) | `ProfileResponse`: `name, phone, address` | Fuera el `id` del perfil y la FK `user_id`. | ✅ |
| 12 | `PUT /profiles/me` | Editar perfil | igual que #11 · entrada `ProfileUpdate` | ⚠️ | página de perfil | igual que #11 | Igual que #11. La entrada ya era un schema separado. | ✅ |

### 3.3 Proveedores

| # | Método y ruta | Propósito | Respuesta original | Estado original | Consumidor | Forma final | Cambio | Final |
|---|---|---|---|---|---|---|---|---|
| 13 | `POST /suppliers` | Crear | `SupplierResponse` (completo) · entrada `SupplierCreate` | ✅ | formulario del directorio | igual | Entrada separada: `id` y `updated_at` los pone el servidor. | ✅ |
| 14 | `GET /suppliers` | Lista con filtros | `list[SupplierResponse]`: 12 campos, incluidos `notes`, `contact_email`, `compliance_agreement`, `contract_renewal_date` y `updated_at` | ⚠️ | tabla del directorio: lee `id, name, country, categories, monthly_rate, currency, status` | `list[SupplierListItem]`: esos 7 campos | La lista manda solo lo que la tabla muestra. Las notas internas y el contacto quedan en el detalle (#15). | ✅ |
| 15 | `GET /suppliers/{id}` | Detalle | `SupplierResponse` | ✅ | detalle u otro servicio | igual | — | ✅ |
| 16 | `PATCH /suppliers/{id}/rate` | Cambiar tarifa | `SupplierResponse` · entrada `RateUpdate` | ✅ | fila de la tabla | igual | La entrada solo acepta `monthly_rate`. | ✅ |
| 17 | `PATCH /suppliers/{id}/status` | Activar o suspender | `SupplierResponse` · entrada `StatusUpdate` | ✅ | fila de la tabla | igual | La entrada solo acepta `status`. | ✅ |
| 18 | `DELETE /suppliers/{id}` | Borrar | `dict` sin tipo | ❌ | — | `DeleteResponse`: `detail, id` | Contrato explícito. | ✅ |

### 3.4 Incidentes

Todas las rutas recibían `payload: dict = Body(...)` y devolvían `dict(doc)` con el `doc_id` agregado. El resultado era correcto, pero solo de casualidad: dependía de que el documento de TinyDB no tuviera claves de más.

| # | Método y ruta | Propósito | Respuesta original | Estado original | Consumidor | Forma final | Cambio | Final |
|---|---|---|---|---|---|---|---|---|
| 19 | `POST /api/incidents` | Crear | `dict` · entrada `dict` | ❌ | formulario "nuevo incidente" | `IncidentResponse`: `id, title, description, category, status, origin, branch, created_at, updated_at` · entrada `IncidentCreate` | La entrada define los 6 campos escribibles; cualquier otro (por ejemplo `id` o `created_at`) se descarta. | ✅ |
| 20 | `GET /api/incidents` | Lista con filtros | `list[dict]` con `description` y `updated_at` | ❌ | tabla: lee `id, title, category, status, origin, branch, created_at` | `list[IncidentListItem]`: esos 7 campos | La lista no manda la descripción (texto largo) ni `updated_at`. | ✅ |
| 21 | `GET /api/incidents/summary` | Conteos para el dashboard | `dict` | ❌ | página de resumen | `IncidentSummary`: `total, by_status, by_category, by_origin, by_branch` | Contrato explícito. | ✅ |
| 22 | `GET /api/incidents/{id}` | Detalle | `dict` | ❌ | API (sin pantalla de detalle hoy) | `IncidentResponse` | Contrato explícito. | ✅ |
| 23 | `PATCH /api/incidents/{id}/status` | Cambiar estado | `dict` · entrada `dict` | ❌ | selector de estado en la tabla | `IncidentResponse` · entrada `IncidentStatusUpdate`: `status` | La entrada solo acepta `status`. | ✅ |

**Decisión de diseño (entrada de incidentes).** En `IncidentCreate` e `IncidentStatusUpdate` los campos son `Optional[str]`. Las reglas de negocio (valores permitidos, largos, campos obligatorios y transiciones de estado) siguen en `packages/shared/incident_rules.py`, que es compartido con el script de carga desde CSV. Ese módulo responde **400** con `{detail, errors: [{field, message}]}`, y el formulario del backoffice depende de ese formato para marcar cada campo con su error. Si se hubiera movido la validación a Pydantic, esos errores pasarían a ser 422 con otro formato, y se rompería el frontend. El schema decide **qué campos** se pueden escribir; las reglas deciden **qué valores** son válidos. El 400 quedó documentado en OpenAPI (`responses={400: IncidentValidationError}`).

### 3.5 Inventario (Supabase / SQLModel)

Todas las rutas exigen JWT a nivel de router.

| # | Método y ruta | Propósito | Respuesta original | Estado original | Consumidor | Forma final | Cambio | Final |
|---|---|---|---|---|---|---|---|---|
| 24 | `GET /inventory/products` | Lista con stock calculado | `list[MedicalSupplyResponse]`: `id, name, sku, category, unit, country, current_stock` | ✅ | productos, inventario y selectores de los formularios (usan todos los campos) | igual | Ya era una proyección explícita; nunca se devolvía el objeto ORM. | ✅ |
| 25 | `POST /inventory/products` | Crear insumo | `MedicalSupplyResponse` · entrada `MedicalSupplyCreate` | ✅ | formulario de producto | igual | La entrada no tiene `stock`: el stock solo cambia mediante órdenes. | ✅ |
| 26 | `GET /inventory/products/{id}` | Detalle | `MedicalSupplyResponse` | ✅ | — | igual | — | ✅ |
| 27 | `POST /inventory/orders/inbound` | Registrar entrada | `SupplyDeliveryResponse` con `user_uuid` | ⚠️ | formulario de entrada (no lee el body) | `id, supply_id, quantity, vendor_name, clinic_id, created_at` | Fuera `user_uuid`: es una llave interna entre las dos bases, y quien crea la orden ya sabe que fue él. `user_uuid` tampoco está en la entrada: sale del token. | ✅ |
| 28 | `POST /inventory/orders/outbound` | Registrar consumo | `SupplyConsumptionResponse` con `user_uuid` | ⚠️ | formulario de consumo | `id, supply_id, quantity, consumption_type, clinic_id, created_at` | Igual que #27. | ✅ |
| 29 | `GET /inventory/orders` | Historial combinado | `list[OrderResponse]` con `user_uuid` y `supply{id, name, sku, unit, country}` anidado | ⚠️ | tabla de historial: lee `supply.name`, `supply.sku` y mostraba el `user_uuid` crudo | `list[OrderResponse]`: `id, order_type, quantity, clinic_id, created_at, created_by, vendor_name, consumption_type, supply_id, supply_name, supply_sku` | El insumo se aplana (ver 4.3) y `user_uuid` se reemplaza por `created_by`, un nombre legible. Los nombres se resuelven una sola vez por request, no fila por fila. La UI ahora muestra "Created by: Maria" en vez de un UUID. | ✅ |

### 3.6 Sistema

| # | Método y ruta | Propósito | Respuesta original | Estado original | Forma final | Final |
|---|---|---|---|---|---|---|
| 30 | `GET /` | Health check | `dict` sin tipo `{status, service: "supplier-directory-api"}` | ❌ | `HealthResponse`: `status, service` (nombre del servicio actualizado a `healthcore-api`) | ✅ |

## 4. Decisiones sobre relaciones

| Relación | Dónde aparece | Opción elegida | Por qué |
|---|---|---|---|
| Usuario → Perfil | `GET /auth/me` | **Objeto anidado, sin ids** (`profile{name, phone, address}`) | La vista de perfil necesita los tres campos juntos. Los ids del perfil no le sirven al cliente porque el perfil se resuelve desde el token. |
| Perfil → Usuario (`user_id`) | `/profiles/me` | **Se omite** | Es una FK interna; `/me` ya identifica al dueño. |
| Orden → Insumo | `GET /inventory/orders` | **Proyección plana** (`supply_id, supply_name, supply_sku`) | La tabla solo muestra nombre y SKU. `unit` y `country` estaban de sobra en cada fila. `supply_id` se mantiene para poder enlazar al producto. |
| Orden → Insumo | `POST /inventory/orders/*` | **Solo el ID** (`supply_id`) | Es una confirmación de escritura: el cliente acaba de mandar ese id y ya tiene el insumo. |
| Orden → Usuario (`user_uuid`) | inventario | **Reemplazado por `created_by`** (nombre) o **omitido** en las escrituras | El UUID conecta Supabase con TinyDB y no significa nada para una persona. El historial necesita saber *quién* registró la orden, no su llave. Si el usuario no tiene nombre en el perfil, se muestra "Usuario #id"; **nunca el email**. |

## 5. Campos sensibles y schemas de entrada

**Campos que nunca salen de la API** (lo verifica `tests/test_serialization.py`): `password`, `hashed_password`, `uuid`, `user_uuid`, `user_id`, y los tokens de reseteo (viven solo en la tabla `password_reset_tokens` y viajan por correo).

**Email en las respuestas:**
- Registro, login, forgot-password y reset-password **no** devuelven email.
- `GET /auth/me` devuelve el email del propio usuario (lo permite el enunciado).
- `GET /users`, `GET /users/{id}` y `PUT /users/{id}` lo devuelven solo al dueño o a un admin, porque son vistas de gestión de cuentas.

**Entrada ≠ salida.** Todos los endpoints de escritura tienen su propio schema de entrada:

| Endpoint | Entrada | Campos escribibles |
|---|---|---|
| `POST /users` | `UserCreate` | `email, password, name, phone, address` (el `role` no se puede elegir) |
| `PUT /users/{id}` | `UserUpdate` | `email, role` (`role` solo un admin) |
| `PUT /profiles/me` | `ProfileUpdate` | `name, phone, address` |
| `POST /auth/login` | form OAuth2 | `username, password` |
| `POST /auth/forgot-password` · `reset-password` · `change-password` | `ForgotPasswordRequest` · `ResetPasswordRequest` · `ChangePasswordRequest` | solo lo necesario para cada flujo |
| `POST /suppliers` | `SupplierCreate` | todo menos `id` y `updated_at` |
| `PATCH /suppliers/{id}/rate` · `/status` | `RateUpdate` · `StatusUpdate` | un campo cada uno |
| `POST /api/incidents` | `IncidentCreate` | `title, description, category, status, origin, branch` |
| `PATCH /api/incidents/{id}/status` | `IncidentStatusUpdate` | `status` |
| `POST /inventory/products` | `MedicalSupplyCreate` | `name, sku, category, unit, country` (sin stock) |
| `POST /inventory/orders/inbound` · `outbound` | `SupplyDeliveryCreate` · `SupplyConsumptionCreate` | sin `user_uuid` (sale del token) |

## 6. Verificación

- **Tests:** `uv run pytest`. Pasan los **129**: los 114 originales (sin cambiar ningún assert; solo `conftest.py` ahora apunta el inventario a SQLite) y 15 tests nuevos de contrato en `tests/test_serialization.py`. Estos fijan las claves exactas de cada respuesta y fallan si reaparece un campo sensible. El inventario se prueba sobre SQLite (`conftest.py`), así los tests nunca tocan Supabase.
- **Frontend:** `tsc --noEmit`, `next build` y los 32 tests de Jest pasan. Los tipos se actualizaron a las formas nuevas (`Profile`, `Supplier`, `IncidentListItem`, `SupplyOrder`). TypeScript detectó el único lugar que dependía de la forma vieja (la lista de incidentes) y se corrigió.
- **`response_model` en todas las rutas:** se verificó recorriendo el esquema OpenAPI. Los 30 endpoints declaran schema de respuesta y ninguno devuelve un objeto ORM ni un `dict` sin tipo.
- **Prueba manual en `/docs` (Swagger UI)**, con capturas en [`serialization-evidence/`](serialization-evidence/):
  1. `POST /users` → `{"id": 3, "detail": "Cuenta creada. Ya puedes iniciar sesión."}`: sin email. ([captura](serialization-evidence/01-post-users-register.png))
  2. `GET /auth/me` (autorizado con el flujo OAuth2 de Swagger) → `email, role, profile{name, phone, address}`. ([captura](serialization-evidence/02-get-auth-me.png))
  3. `GET /api/incidents` → filas sin `description` ni `updated_at`. ([captura](serialization-evidence/03-get-incidents-list.png))
  4. Sección de schemas generada por FastAPI. ([captura](serialization-evidence/04-schemas.png))

## 7. Observaciones fuera de alcance

- **`/api/incidents` no exige autenticación** (así se construyó en el milestone de incidentes). No es un problema de serialización, pero sí de seguridad: se recomienda agregar `Depends(get_current_user)` en el siguiente sprint, coordinándolo con `lib/incidents.ts`, que ya envía el token.
- **El CLS de `/suppliers`:** con auth, la lista se pide del lado del cliente porque el JWT vive en `localStorage`. La mejora de render en el servidor del performance audit no aplica en esta versión. Una opción a futuro es mover el token a una cookie httpOnly para poder renderizar en el servidor.
