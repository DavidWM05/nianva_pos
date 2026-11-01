# 04. API (API)

> Aprobado el 2026-10-30. Formato: **Regla** · **Por qué** · **Verifica** · **Desde**.
> Se hereda lo que ya funciona en Pro (`API_SPECIFICATION.md` §1): el sobre `{data, meta}`, la
> paginación con `page`/`rows`/`sort_*`/`filtro_*`, `meta.permisos` y `Rule::exists` con
> scope de tenant.

### API-01 · Versión en la ruta
- **Regla:**
  - todas las rutas de la API viven bajo `/api/v1` (`apiPrefix` en `bootstrap/app.php`);
  - las rutas de sesión de Sanctum (`/login`, `/logout`, `/login/2fa-verify`, `/password/*`,
    `/sanctum/csrf-cookie`) viven en `routes/web.php`, en la raíz y sin versión: son el flujo
    de cookie y CSRF, no recursos;
  - el frontend no fija la dirección del backend: la lee de `config.json` al arrancar
    (`urlApi()` / `urlSesion()`); sin ese archivo usa el mismo origen;
  - un cambio incompatible (quitar un campo, cambiar un tipo o un significado) crea `/api/v2`
    para ese recurso, y `v1` se mantiene hasta que todas las instalaciones locales se
    actualicen;
  - agregar un campo opcional no es un cambio incompatible.
- **Por qué:** con instalaciones de escritorio y LAN, el frontend y el backend de un cliente
  pueden quedar en versiones distintas durante una actualización (C5).
- **Verifica:** `Arquitectura/RutasVersionadasTest` (toda ruta `api/*` empieza con `api/v{n}/`
  y ninguna de `routes/web.php` empieza con `api/`).
- **Desde:** Fase 1.

### API-02 · Sobre de respuesta
- **Regla:**
  - éxito: `{ "data": …, "meta": { … } }`;
  - un listado lleva en `meta` `total`, `page`, `rows` y `permisos`;
  - un recurso individual lleva en `meta` los `permisos` relevantes de esa pantalla;
  - siempre se responde con un `JsonResource`, nunca con un arreglo armado a mano ni con un
    modelo serializado directo;
  - el dinero va como cadena decimal (`"1250.50"`) y las cantidades también (`"0.500"`), sin
    float de JSON; las fechas, en ISO 8601.
- **Por qué:** los floats de JSON pierden centavos, y Pro hoy entrega montos sin un formato
  uniforme (C10).
- **Verifica:** una regla de arquitectura (los controladores devuelven `JsonResource` o
  `ResourceCollection`) y tests del contrato OpenAPI (API-08).
- **Desde:** Fase 1, el sobre y la regla de `JsonResource` (con una lista de pendientes que
  solo baja); Fase 3, el dinero y las cantidades como cadena decimal, con DAT-02.

### API-03 · Errores
- **Regla:** solo hay tres formas de error, sin excepciones:

  | Caso | HTTP | Cuerpo |
  |---|---|---|
  | Validación | 422 | `{ message, errors: { campo: [..] } }` (formato nativo de Laravel) |
  | Negocio | 422 / 409 | `{ message, error_code, ...contexto }` |
  | Autenticación, permiso, feature, no encontrado, servidor | 401 / 403 / 404 / 500 | `{ message, error_code }` (más `correlation_id` en 500) |

  - el `error_code` va en `snake_case` y en español, y es estable (`abono_excede_saldo`,
    `modulo_no_activo`): una vez publicado no se renombra;
  - el frontend decide por `error_code`, nunca analizando el `message`.
- **Por qué:** es el contrato que ya usa Pro, y se conserva.
- **Verifica:** un catálogo `docs/estandares/catalogo_error_code.md`, generado desde las
  excepciones por un comando, y un test que falla si una excepción de negocio no tiene
  `error_code` o si dos comparten código.
- **Desde:** Fase 1.

### API-04 · Cada excepción sabe responder
- **Regla (D4):**
  - cada excepción de negocio extiende `ExcepcionNegocio` y declara `errorCode()`, `status()` y
    `contexto()`;
  - un solo manejador genérico en `bootstrap/app.php` las convierte al sobre de API-03;
  - no se agrega un mapeo por excepción en `bootstrap/app.php`.
- **Por qué:** el mapeo central de Pro (95 menciones en `bootstrap/app.php`) crece con cada
  módulo y se desincroniza (C1).
- **Verifica:** `bootstrap/app.php` sin referencias a excepciones concretas (test de
  arquitectura) y el test del catálogo de API-03.
- **Desde:** Fase 1.

### API-05 · Validación de entrada
- **Regla:**
  - un FormRequest por endpoint de escritura (ARQ-02);
  - toda FK hacia una entidad con tenant se valida con `Rule::exists(...)->where('tenant_id', …)`
    o resolviendo el modelo con su scope, nunca con `exists:tabla,id` plano (se hereda de
    `API_SPECIFICATION.md` §1.5);
  - los límites (`max`, `min`, `decimal`) coinciden con las columnas;
  - el servidor ignora los campos calculados que lleguen del cliente (totales, precios,
    costos, tipo de producto, unidad) y los recalcula (DAT-02);
  - única excepción: una cotización acepta precio unitario y descuento manuales solo si el
    usuario tiene `cotizaciones.precio_manual`; sin ese permiso se ignoran. Al convertirla
    en venta, la venta recalcula con los precios del sistema.
- **Por qué:** en Lite, el servidor confiaba en precios y totales del navegador hasta que se
  corrigió (convenciones de Lite §4).
- **Verifica:** test de arquitectura (sin `exists:` plano en `rules()`) y tests de manipulación
  (POST con `precio` alterado → se ignora).
- **Desde:** Fase 1.

### API-06 · Listados uniformes
- **Regla:**
  - todo listado acepta `page`, `rows` (como máximo 100), `sort_field` (de una lista blanca),
    `sort_order` y `filtro_<campo>`, más `q` para la búsqueda de texto general;
  - los filtros por defecto de una pantalla los define el backend y vienen en
    `meta.filtros_aplicados`, para que el frontend pinte "Mostrando…" sin adivinar;
  - sin N+1: un listado carga sus relaciones con `with()` (`preventLazyLoading` lo detecta,
    DAT-14).
- **Por qué:**
  - en Lite, cada pantalla tenía sus propios filtros por defecto y su texto "Mostrando…";
  - en Pro hay N+1 en reportes (`consideraciones_futuras.md`).
- **Verifica:** un test de contrato por listado y la suite con `preventLazyLoading`.
- **Desde:** Fase 1.

### API-07 · Idempotencia en operaciones de dinero
- **Regla:**
  - `POST` de venta, abono, pago, devolución, cierre de caja y compra exigen el encabezado
    `Idempotency-Key` (un ULID generado por el cliente al abrir el formulario);
  - una segunda petición con la misma clave devuelve la respuesta original sin repetir la
    operación;
  - las claves se guardan 24 horas por tenant.
- **Por qué:** un doble clic en "Abonar" podía registrar dos abonos (L-04); en LAN, los
  reintentos por red inestable son normales.
- **Verifica:** un test por endpoint (dos POST con la misma clave → una operación y respuestas
  iguales; sin la clave → 428).
- **Desde:** Fase 4.

### API-08 · Contrato OpenAPI
- **Regla:**
  - la especificación OpenAPI se genera desde el código (Scramble o equivalente) en cada build;
  - el frontend genera sus tipos y clientes desde ese archivo, sin interfaces escritas a mano
    para las respuestas;
  - un cambio en el contrato aparece como diff en el PR.
- **Por qué:** en Pro, `API_SPECIFICATION.md` tuvo que corregir lo que decía
  `02_CONTRATO_API.md` (su §1 se titula "reales, no las citadas"): un documento escrito a mano
  se desincroniza.
- **Verifica:** CI regenera la especificación y falla si difiere de la versionada, y un test de
  respuestas contra el esquema en las pruebas HTTP.
- **Desde:** Fase 1, la especificación generada y su diff en CI; Fase 2, los tipos y clientes
  generados en el frontend.

### API-09 · Features y permisos en la respuesta
- **Regla:**
  - `GET /v1/sesion` devuelve el usuario, la sucursal y la terminal activas, los permisos, las
    features del plan, los límites, el perfil de giro y la configuración regional;
  - el frontend arma el menú, los guards y los formatos solo con eso;
  - una feature apagada responde 403 `modulo_no_activo`, y un límite excedido, 422
    `limite_plan_excedido`.
- **Por qué:** un solo punto de verdad para lo que el usuario puede ver y hacer.
- **Verifica:** un test de contrato de `/v1/sesion` por plan.
- **Desde:** Fase 2; los límites, en la Fase 7.

## Excepciones

Ninguna acordada.
