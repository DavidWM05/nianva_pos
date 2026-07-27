# Arquitectura del Núcleo Reutilizable

> Diseñado a partir del inventario real de **Angara Dental** (Laravel + Angular, 52 tablas)
> y **Nianva POS Ropa** (PHP MVC, single-tenant multi-sucursal).
> Motor: **MySQL 8**. Convención: `snake_case`, tablas en plural, `BIGINT UNSIGNED` como PK.
> Fecha: 2026-07-17

---

## 1. Principio de arquitectura

**Monolito modular**, no microservicios. Cada producto (Angara Dental, POS Ropa, Barbería, Escuela...)
es una instalación independiente de Laravel que consume los módulos del núcleo que necesita.
Los módulos exclusivos de cada vertical (expediente clínico, citas, boletas escolares) viven
**fuera** de este núcleo, en el propio proyecto.

**Multi-tenancy:** shared database con `tenant_id` en cada tabla de negocio. La resolución de
tenant vive en una capa de servicio (middleware), no repartida en cada módulo — esto permite que,
si algún cliente grande exige aislamiento total, se resuelva cambiando esa capa sin tocar los
módulos.

**Licenciamiento en dos niveles** (importante, no confundir) — **ya no es un diseño pendiente,
el servidor central existe y Núcleo ya lo consume** (ver `MANUAL_TECNICO.md` para el
patrón cliente-servidor completo; el detalle de §4 más abajo queda resuelto):
- **Servidor central de licencias** (proyecto aparte, repo `Servidor_Licencias`): tu panel
  personal, dueño de `productos`, `clientes_finales`, `licencias_maestras`/`licencia_maestra`,
  `activaciones`, `llaves_firma`. Cruza TODOS tus productos y TODOS tus clientes. Expone un
  único endpoint público server-to-server, `POST /api/validar-licencia`.
- **Núcleo de cada producto** (lo que se diseña aquí): guarda una **caché local** de la
  licencia vigente (`licencia_local`), actualizada por `LicenciaClienteService` (activación vía
  `licencia:activar`, revalidación periódica vía `licencia:revalidar` + scheduler), con un
  período de gracia si el servidor central no responde — para que cada instalación funcione
  aunque no tenga internet en el momento.

---

## 2. Mapa de módulos

| # | Módulo | Resuelve | Tablas |
|---|--------|----------|--------|
| 1 | Núcleo | tenants, sucursales, usuarios, roles/permisos, métodos de pago, licencia local, 2FA/dispositivo confiable, identificador de instalación | 13 |
| 2 | Auditoría y Logs | quién creó/editó/eliminó, errores del sistema | 2 |
| 3 | Inventario | catálogo, stock, kardex, compras, proveedores | 9 |
| 4 | Precios y Promociones | descuentos %, monto fijo, 2x1/bundle, cupones | 2 |
| 5 | CRM | clientes, financiamiento propio del negocio | 3 |
| 6 | TPV / Ventas | ventas, pagos mixtos, caja, corte de caja | 4 |
| 7 | Apartados | layaway con abonos, pagos mixtos por abono | 4 |
| 8 | Devoluciones | devoluciones, cambios, pagos mixtos en reembolso | 3 |
| 9 | Gastos | egresos de caja | 1 |
| 10 | Configuración | datos de la empresa, backups | 1 |

**Total: 42 tablas** (39 del inventario original + 3 agregadas después sin rediseñar el mapa:
`dispositivos_confiables`, `configuracion_seguridad` y `instalacion_nucleo` — ver §3.10). Queda
fuera del núcleo: expediente clínico, citas, odontograma, boletas escolares, o cualquier tabla
100% específica de una vertical.

---

## 3. Decisiones de diseño que resuelven lo encontrado en ambos sistemas

### 3.1 Stock: una sola fuente de verdad
Tanto Angara (`products.stock_quantity` + `inventory_movements.stock_after`) como POS Ropa
(`producto_variantes.stock_actual` legado + `inventario_sucursales.stock_actual` real) tienen
dos lugares donde "vive" el stock. En el núcleo:
- `inventario_stock` es la **única** fuente de verdad (una fila por sucursal + variante).
- `kardex.stock_resultante` es una **fotografía histórica** del saldo en ese momento (para
  reportes rápidos), nunca se lee como fuente de verdad, solo se escribe.
- Ambas escrituras ocurren en la **misma transacción** — nunca se actualiza una sin la otra.

### 3.2 Variantes siempre presentes
POS Ropa modela todo alrededor de `variante_id` (incluso el kardex y las ventas apuntan ahí).
Angara no tiene variantes. El núcleo adopta el patrón de POS Ropa como estándar: **todo producto
tiene al menos una variante** (aunque sea única, sin talla/color). Esto simplifica el resto de
módulos, que solo necesitan conocer `variante_id`, nunca `producto_id` directamente.

### 3.3 RBAC real, no roles binarios
POS Ropa tiene `usuarios.rol ENUM('admin','vendedor')` sin tabla de permisos. El núcleo usa el
modelo de Angara (`permisos` con formato `modulo.accion`) como estándar. Al migrar POS Ropa se
siembran dos roles (`admin`, `vendedor`) con los permisos equivalentes a su lógica actual, sin
romper nada.

### 3.4 Auditoría unificada
Angara tiene tres tablas de logs (`audit_logs`, `activity_logs`, `system_logs`) con propósitos
solapados — su propio inventario ya lo señala como deuda técnica. POS Ropa solo tiene
`sistema_logs` con cobertura parcial. El núcleo usa **una sola tabla** `auditoria` para cambios
de negocio (create/update/delete con diff en JSON) y **una sola tabla** `logs_sistema` para
errores técnicos — separadas porque tienen consumidores distintos (el dueño del negocio revisa
auditoría; tú revisas logs de errores).

### 3.5 Precios y promociones, un solo sistema
POS Ropa tiene **dos sistemas paralelos** (`promociones` y `descuentos_cantidad`) con la misma
jerarquía de prioridad (variante > producto > categoría > todo) pero tablas separadas. El núcleo
los unifica en `reglas_precio` con un campo `tipo` que cubre los cuatro casos (porcentaje, monto
fijo, nxm, bundle). Los cupones se quedan aparte porque son un descuento global sobre el total,
no sobre un ítem — su naturaleza es distinta.

### 3.6 Venta "sombra" → campo explícito
El truco de POS Ropa (`forma_pago = 'cambio'` como valor mágico que hay que recordar excluir en
cada reporte) se reemplaza por un booleano explícito `ventas.es_venta_sombra`. Cualquier query
financiero simplemente agrega `WHERE es_venta_sombra = 0` — más difícil de olvidar que un valor
de ENUM.

### 3.7 Nomenclatura de "planes" — tres conceptos, tres nombres
Confirmado por ambos inventarios que esto ya causa (o causaría) confusión real:

| Concepto | Nombre en el núcleo | Vive en |
|---|---|---|
| Tu tier de suscripción SaaS (básica/avanzada/pro) | `planes_suscripcion` + `licencias.plan_id` | Núcleo |
| Financiamiento que el negocio da a SU cliente final | `planes_pago_cliente` | CRM |
| Plan de tratamiento (dental, ortodoncia, etc.) | *(fuera del núcleo, específico de vertical)* | — |

### 3.8 Otras correcciones de nomenclatura aplicadas
- `departamento` → `departamentos` (plural, consistente)
- `correo` / `email` mezclados entre tablas → estandarizado a `correo` en todo el núcleo
- `licencia` como archivo `.key` → tabla `licencia_local`, campo `token_firmado`

### 3.9 Pago mixto: patrón estándar, sin campo redundante ni valor mágico
POS Ropa implementó pago mixto (feature/babyshopjr) con una tabla `venta_pagos` — validó el
enfoque, pero mantuvo `ventas.forma_pago = 'mixto'` como bandera especial, el mismo patrón frágil
que ya habíamos resuelto para la venta sombra. El núcleo va un paso más allá:

- **`ventas` ya no tiene columna de método de pago.** Toda venta, tenga uno o varios métodos,
  siempre tiene 1+ filas en `venta_pagos`. Sin valor mágico, sin `COALESCE` en los reportes — el
  corte de caja simplemente suma `venta_pagos` agrupado por `metodo_pago_id`.
- **El mismo patrón se aplica a `apartado_abonos`** (vía `apartado_abono_pagos`) y a
  **`devoluciones`** (vía `devolucion_pagos`, para el reembolso o cobro de diferencia). POS Ropa
  dejó ambos casos fuera de su primera implementación por alcance — en el núcleo se modelan
  parejos desde el diseño, aunque hoy nunca se use más de un método ahí.
- **Regla de negocio a preservar en la lógica de aplicación** (no en el schema): solo el método
  `efectivo` puede recibir más del monto pendiente y generar vuelto; el resto de los métodos se
  autolimitan al saldo restante.

### 3.10 Extensiones posteriores al inventario original (2FA, licenciamiento)

Estas dos no vienen de comparar Angara/POS Ropa — se agregaron después, ya con el núcleo en
construcción. Se documentan aquí solo a nivel de qué tablas suman al schema; el razonamiento y
los detalles de implementación viven en `MANUAL_TECNICO.md` (§2.4 y §2.6), no se
duplican en este documento:

- **2FA / dispositivo confiable**: 3 columnas nuevas en `usuarios`
  (`two_factor_secret`/`two_factor_recovery_codes`/`two_factor_confirmed_at`, todas encriptadas
  vía cast de Eloquent) + 2 tablas nuevas, `dispositivos_confiables` (tokens de "recordar este
  dispositivo", hasheados) y `configuracion_seguridad` (días de vigencia configurables por
  tenant).
- **Cliente de licenciamiento**: 1 tabla nueva, `instalacion_nucleo` — a diferencia de todo lo
  demás en este documento, es **una sola fila global, sin `tenant_id`**: identifica la
  instalación física/lógica de Núcleo en sí (potencialmente varios tenants sobre la misma base
  de datos), no un tenant en particular.
- Además, 2 columnas nuevas en tablas ya existentes: `clientes.es_sistema` (marca el cliente
  "Público General" sembrado por tenant, igual criterio que `roles.es_sistema`) y
  `configuracion_tenant.codigo_barras_automatico` (flag para autogenerar códigos de barras de
  variantes nuevas).

---

## 4. Servidor central de licencias — ya no es diseño pendiente

Las 3 preguntas que quedaban abiertas cuando se escribió este documento, resueltas por el
servidor real (repo `Servidor_Licencias`, verificado contra su código — no contra memoria):

- **¿Base de datos propia o meta-producto sobre este mismo núcleo?** Proyecto y base de datos
  100% separados — no reutiliza nada de este repo.
- **¿Cómo se genera y rota la llave RSA?** Una llave activa por producto (`LlaveFirma`,
  `producto_id` + `activa` boolean) — rotar es marcar la vieja `activa=false` (con
  `fecha_revocacion`) y crear una nueva; la próxima validación que necesite regenerar un token
  usa automáticamente la llave activa vigente. Un token ya emitido con una llave luego revocada
  sigue siendo válido hasta su propia `fecha_expiracion` (revocar la llave no es retroactivo).
- **¿Un endpoint por tipo de licencia o uno solo?** Uno solo, `POST /api/validar-licencia`, para
  los 4 tipos (`saas`/`pago_unico`/`anual`/`demo`) — la rama de lógica según `tipo` vive del
  lado del servidor (`LicenciaValidacionService`), el cliente en Núcleo no necesita saber cuál es.

---

## 5. Schema SQL

Listo para ejecutar en MySQL 8. Orden topológico de dependencias — ninguna tabla referencia
una tabla creada después. Sigue las reglas de la skill de diseño de bases de datos (backticks en
palabras reservadas, índices `KEY` inline, sin trailing comma).

> Actualizado para incluir las 3 tablas y 3 columnas de §3.10 (2FA/dispositivo confiable,
> licenciamiento) — no estaban en el diseño original del 2026-07-17.

```sql
-- ============================================================
-- Schema: Núcleo reutilizable (Luvid)
-- Motor:  MySQL 8
-- Fecha:  2026-07-17
-- ============================================================

-- ============================================================
-- MÓDULO 1 — NÚCLEO
-- ============================================================

CREATE TABLE tenants (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre          VARCHAR(150) NOT NULL,
    razon_social    VARCHAR(200) NULL,
    rfc             VARCHAR(20) NULL,
    telefono        VARCHAR(20) NULL,
    correo          VARCHAR(150) NULL,
    direccion       VARCHAR(255) NULL,
    pais            CHAR(2) NOT NULL DEFAULT 'MX',
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at      DATETIME NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sucursales (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id       BIGINT UNSIGNED NOT NULL,
    nombre          VARCHAR(150) NOT NULL,
    direccion       VARCHAR(255) NULL,
    telefono        VARCHAR(20) NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY             idx_sucursales_tenant (tenant_id),
    CONSTRAINT      fk_sucursales_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE planes_suscripcion (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nombre              VARCHAR(80) NOT NULL,
    slug                VARCHAR(80) NOT NULL UNIQUE,
    limite_usuarios     INT UNSIGNED NULL COMMENT 'NULL = ilimitado',
    limite_sucursales   INT UNSIGNED NULL COMMENT 'NULL = ilimitado',
    precio_mensual      DECIMAL(10,2) NULL,
    precio_anual        DECIMAL(10,2) NULL,
    features            JSON NULL,
    activo              TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE licencia_local (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NOT NULL,
    tipo                ENUM('saas','pago_unico','anual','demo') NOT NULL,
    plan_id             BIGINT UNSIGNED NULL COMMENT 'NULL si no aplica (pago_unico)',
    fecha_inicio        DATE NOT NULL,
    fecha_expiracion    DATE NULL COMMENT 'NULL = perpetua (pago_unico)',
    estado              ENUM('activa','vencida','revocada','prueba') NOT NULL DEFAULT 'activa',
    token_firmado       TEXT NULL COMMENT 'JWT firmado por el servidor central -- NULL para tipo=saas, que se valida por consulta directa y nunca firma uno (ver LicenciaClienteService)',
    ultima_validacion   DATETIME NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY                 idx_licencia_local_tenant (tenant_id),
    KEY                 idx_licencia_local_plan (plan_id),
    CONSTRAINT          fk_licencia_local_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT          fk_licencia_local_plan FOREIGN KEY (plan_id) REFERENCES planes_suscripcion(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE roles (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id       BIGINT UNSIGNED NULL COMMENT 'NULL = rol de sistema, reusable por todos los tenants',
    nombre          VARCHAR(80) NOT NULL,
    descripcion     TEXT NULL,
    es_sistema      TINYINT(1) NOT NULL DEFAULT 0,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY             idx_roles_tenant (tenant_id),
    CONSTRAINT      fk_roles_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permisos (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    modulo          VARCHAR(80) NOT NULL,
    accion          VARCHAR(80) NOT NULL,
    nombre          VARCHAR(160) NOT NULL UNIQUE COMMENT 'formato modulo.accion',
    descripcion     TEXT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rol_permisos (
    rol_id          BIGINT UNSIGNED NOT NULL,
    permiso_id      BIGINT UNSIGNED NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (rol_id, permiso_id),
    CONSTRAINT      fk_rol_permisos_rol FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT      fk_rol_permisos_permiso FOREIGN KEY (permiso_id) REFERENCES permisos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NULL COMMENT 'NULL = superadmin',
    sucursal_id         BIGINT UNSIGNED NULL,
    nombre              VARCHAR(150) NOT NULL,
    apellido            VARCHAR(150) NULL,
    alias               VARCHAR(50) NULL,
    correo              VARCHAR(150) NOT NULL UNIQUE,
    `password`          VARCHAR(255) NOT NULL,
    two_factor_secret             TEXT NULL COMMENT 'encriptado via cast de Eloquent, nunca en texto plano',
    two_factor_recovery_codes     TEXT NULL COMMENT 'encriptado via cast de Eloquent',
    two_factor_confirmed_at       DATETIME NULL,
    telefono            VARCHAR(20) NULL,
    avatar_url          VARCHAR(500) NULL,
    activo              TINYINT(1) NOT NULL DEFAULT 1,
    ultimo_login        DATETIME NULL,
    remember_token      VARCHAR(100) NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          DATETIME NULL,
    KEY                 idx_usuarios_tenant (tenant_id),
    KEY                 idx_usuarios_sucursal (sucursal_id),
    CONSTRAINT          fk_usuarios_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT          fk_usuarios_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuario_roles (
    usuario_id      BIGINT UNSIGNED NOT NULL,
    rol_id          BIGINT UNSIGNED NOT NULL,
    sucursal_id     BIGINT UNSIGNED NULL COMMENT 'scope opcional: rol aplica solo en esta sucursal',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (usuario_id, rol_id),
    KEY             idx_usuario_roles_sucursal (sucursal_id),
    CONSTRAINT      fk_usuario_roles_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    CONSTRAINT      fk_usuario_roles_rol FOREIGN KEY (rol_id) REFERENCES roles(id) ON DELETE CASCADE,
    CONSTRAINT      fk_usuario_roles_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE metodos_pago (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id               BIGINT UNSIGNED NULL COMMENT 'NULL = catalogo global por defecto',
    nombre                  VARCHAR(80) NOT NULL,
    tipo                    ENUM('efectivo','tarjeta','transferencia','digital','otro') NOT NULL,
    incluir_en_financiero   TINYINT(1) NOT NULL DEFAULT 1,
    activo                  TINYINT(1) NOT NULL DEFAULT 1,
    KEY                     idx_metodos_pago_tenant (tenant_id),
    CONSTRAINT              fk_metodos_pago_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregada despues del diseño original (ver §3.10) -- "recordar este
-- dispositivo" tras completar 2FA en el login.
CREATE TABLE dispositivos_confiables (
    id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usuario_id                  BIGINT UNSIGNED NOT NULL,
    identificador_dispositivo   VARCHAR(64) NOT NULL UNIQUE COMMENT 'hash del token, no el token en claro',
    user_agent                  VARCHAR(500) NULL,
    ip_registro                 VARCHAR(45) NULL,
    fecha_creacion              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion            DATETIME NOT NULL,
    KEY                         idx_dispositivos_confiables_usuario (usuario_id),
    CONSTRAINT                  fk_dispositivos_confiables_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregada despues del diseño original (ver §3.10) -- separada de
-- configuracion_tenant a proposito: seguridad no se mezcla con
-- moneda/ticket/branding.
CREATE TABLE configuracion_seguridad (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id               BIGINT UNSIGNED NOT NULL UNIQUE,
    dias_dispositivo_normal TINYINT UNSIGNED NOT NULL DEFAULT 30,
    dias_dispositivo_admin  TINYINT UNSIGNED NOT NULL DEFAULT 14,
    CONSTRAINT              fk_configuracion_seguridad_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregada despues del diseño original (ver §3.10) -- UNA SOLA FILA,
-- GLOBAL, sin tenant_id: identifica la instalacion de Nucleo en si, no un
-- tenant. Usada por LicenciaClienteService en cada llamada al servidor
-- central de licencias.
CREATE TABLE instalacion_nucleo (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    identificador   CHAR(36) NOT NULL UNIQUE COMMENT 'UUID, generado una sola vez, nunca regenerado',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MÓDULO 2 — AUDITORÍA Y LOGS
-- ============================================================

CREATE TABLE auditoria (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id       BIGINT UNSIGNED NOT NULL,
    tabla_afectada  VARCHAR(100) NOT NULL,
    registro_id     BIGINT UNSIGNED NOT NULL,
    accion          ENUM('create','update','delete') NOT NULL,
    usuario_id      BIGINT UNSIGNED NULL,
    cambios         JSON NULL COMMENT 'antes/despues por campo',
    ip              VARCHAR(45) NULL,
    user_agent      VARCHAR(255) NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY             idx_auditoria_tenant (tenant_id),
    KEY             idx_auditoria_tabla_registro (tabla_afectada, registro_id),
    KEY             idx_auditoria_usuario (usuario_id),
    CONSTRAINT      fk_auditoria_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT      fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE logs_sistema (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NULL,
    producto_origen     VARCHAR(80) NOT NULL,
    modulo_origen       VARCHAR(80) NOT NULL,
    nivel               ENUM('info','warning','error','critical') NOT NULL,
    mensaje             VARCHAR(500) NOT NULL,
    stack_trace         TEXT NULL,
    contexto            JSON NULL,
    usuario_id          BIGINT UNSIGNED NULL,
    resuelto            TINYINT(1) NOT NULL DEFAULT 0,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY                 idx_logs_sistema_tenant (tenant_id),
    KEY                 idx_logs_sistema_nivel (nivel),
    CONSTRAINT          fk_logs_sistema_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT          fk_logs_sistema_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MÓDULO 3 — INVENTARIO
-- ============================================================

CREATE TABLE categorias (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id       BIGINT UNSIGNED NOT NULL,
    nombre          VARCHAR(120) NOT NULL,
    descripcion     TEXT NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY             idx_categorias_tenant (tenant_id),
    CONSTRAINT      fk_categorias_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE departamentos (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id       BIGINT UNSIGNED NOT NULL,
    nombre          VARCHAR(120) NOT NULL,
    descripcion     TEXT NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY             idx_departamentos_tenant (tenant_id),
    CONSTRAINT      fk_departamentos_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE proveedores (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id       BIGINT UNSIGNED NOT NULL,
    razon_social    VARCHAR(200) NOT NULL,
    rfc             VARCHAR(20) NULL,
    telefono        VARCHAR(20) NULL,
    correo          VARCHAR(150) NULL,
    direccion       TEXT NULL,
    activo          TINYINT(1) NOT NULL DEFAULT 1,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY             idx_proveedores_tenant (tenant_id),
    CONSTRAINT      fk_proveedores_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE productos (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NOT NULL,
    categoria_id        BIGINT UNSIGNED NULL,
    departamento_id     BIGINT UNSIGNED NULL,
    nombre              VARCHAR(200) NOT NULL,
    descripcion         TEXT NULL,
    precio_compra       DECIMAL(10,2) NOT NULL DEFAULT 0,
    precio_venta        DECIMAL(10,2) NOT NULL DEFAULT 0,
    imagen_url          VARCHAR(500) NULL,
    no_resurtible       TINYINT(1) NOT NULL DEFAULT 0,
    sin_descuento       TINYINT(1) NOT NULL DEFAULT 0,
    activo              TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at          DATETIME NULL,
    KEY                 idx_productos_tenant (tenant_id),
    KEY                 idx_productos_categoria (categoria_id),
    KEY                 idx_productos_departamento (departamento_id),
    CONSTRAINT          fk_productos_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT          fk_productos_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE SET NULL,
    CONSTRAINT          fk_productos_departamento FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE producto_variantes (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    producto_id             BIGINT UNSIGNED NOT NULL,
    talla                   VARCHAR(30) NULL,
    color                   VARCHAR(30) NULL,
    codigo_barras           VARCHAR(50) NULL UNIQUE,
    activo                  TINYINT(1) NOT NULL DEFAULT 1,
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY                     idx_variantes_producto (producto_id),
    CONSTRAINT              fk_variantes_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE inventario_stock (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sucursal_id         BIGINT UNSIGNED NOT NULL,
    variante_id         BIGINT UNSIGNED NOT NULL,
    stock_actual        INT NOT NULL DEFAULT 0,
    stock_minimo        INT NOT NULL DEFAULT 0,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY          uq_inventario_stock_sucursal_variante (sucursal_id, variante_id),
    CONSTRAINT          fk_inventario_stock_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE CASCADE,
    CONSTRAINT          fk_inventario_stock_variante FOREIGN KEY (variante_id) REFERENCES producto_variantes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE kardex (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    variante_id         BIGINT UNSIGNED NOT NULL,
    sucursal_id         BIGINT UNSIGNED NOT NULL,
    tipo                ENUM('entrada','salida') NOT NULL,
    cantidad            INT NOT NULL,
    motivo              ENUM('venta','compra','devolucion','merma','ajuste','apartado') NOT NULL,
    referencia_tabla    VARCHAR(60) NULL COMMENT 'ej. ventas, compras, devoluciones',
    referencia_id       BIGINT UNSIGNED NULL,
    stock_resultante    INT NOT NULL COMMENT 'foto del saldo tras este movimiento, no es fuente de verdad',
    usuario_id          BIGINT UNSIGNED NOT NULL,
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY                 idx_kardex_variante_sucursal (variante_id, sucursal_id),
    KEY                 idx_kardex_usuario (usuario_id),
    KEY                 idx_kardex_referencia (referencia_tabla, referencia_id),
    CONSTRAINT          fk_kardex_variante FOREIGN KEY (variante_id) REFERENCES producto_variantes(id) ON DELETE RESTRICT,
    CONSTRAINT          fk_kardex_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT,
    CONSTRAINT          fk_kardex_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE compras (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NOT NULL,
    proveedor_id        BIGINT UNSIGNED NOT NULL,
    sucursal_id         BIGINT UNSIGNED NOT NULL,
    usuario_id          BIGINT UNSIGNED NOT NULL,
    numero_comprobante  VARCHAR(60) NULL,
    comprobante_url     VARCHAR(500) NULL,
    total               DECIMAL(10,2) NOT NULL,
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY                 idx_compras_tenant (tenant_id),
    KEY                 idx_compras_proveedor (proveedor_id),
    KEY                 idx_compras_sucursal (sucursal_id),
    KEY                 idx_compras_usuario (usuario_id),
    CONSTRAINT          fk_compras_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT          fk_compras_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE RESTRICT,
    CONSTRAINT          fk_compras_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT,
    CONSTRAINT          fk_compras_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE compra_detalles (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    compra_id           BIGINT UNSIGNED NOT NULL,
    variante_id         BIGINT UNSIGNED NOT NULL,
    cantidad            INT NOT NULL,
    precio_compra       DECIMAL(10,2) NOT NULL,
    subtotal            DECIMAL(10,2) NOT NULL,
    KEY                 idx_compra_detalles_compra (compra_id),
    KEY                 idx_compra_detalles_variante (variante_id),
    CONSTRAINT          fk_compra_detalles_compra FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE CASCADE,
    CONSTRAINT          fk_compra_detalles_variante FOREIGN KEY (variante_id) REFERENCES producto_variantes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MÓDULO 4 — PRECIOS Y PROMOCIONES
-- ============================================================

CREATE TABLE reglas_precio (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NOT NULL,
    nombre              VARCHAR(120) NOT NULL,
    tipo                ENUM('porcentaje','monto_fijo','nxm','bundle') NOT NULL,
    valor               DECIMAL(10,2) NULL COMMENT 'usado en porcentaje/monto_fijo',
    cantidad_compra     INT NULL COMMENT 'N en nxm/bundle',
    cantidad_paga       INT NULL COMMENT 'M en nxm',
    precio_bundle       DECIMAL(10,2) NULL COMMENT 'solo bundle',
    aplica_a            ENUM('todo','categoria','producto','variante') NOT NULL,
    categoria_id        BIGINT UNSIGNED NULL,
    producto_id         BIGINT UNSIGNED NULL,
    variante_id         BIGINT UNSIGNED NULL,
    fecha_inicio        DATE NULL,
    fecha_fin           DATE NULL,
    activo              TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY                 idx_reglas_precio_tenant (tenant_id),
    KEY                 idx_reglas_precio_categoria (categoria_id),
    KEY                 idx_reglas_precio_producto (producto_id),
    KEY                 idx_reglas_precio_variante (variante_id),
    CONSTRAINT          fk_reglas_precio_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT          fk_reglas_precio_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id) ON DELETE CASCADE,
    CONSTRAINT          fk_reglas_precio_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
    CONSTRAINT          fk_reglas_precio_variante FOREIGN KEY (variante_id) REFERENCES producto_variantes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cupones (
    id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id                   BIGINT UNSIGNED NOT NULL,
    codigo                      VARCHAR(50) NOT NULL,
    nombre                      VARCHAR(120) NOT NULL,
    tipo                        ENUM('porcentaje','monto_fijo') NOT NULL,
    valor                       DECIMAL(10,2) NOT NULL,
    uso_maximo                  INT NULL,
    uso_maximo_por_cliente      INT NULL,
    fecha_inicio                DATE NULL,
    fecha_fin                   DATE NULL,
    activo                      TINYINT(1) NOT NULL DEFAULT 1,
    created_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY                  uq_cupones_tenant_codigo (tenant_id, codigo),
    CONSTRAINT                  fk_cupones_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MÓDULO 5 — CRM
-- ============================================================

CREATE TABLE clientes (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NOT NULL,
    nombre              VARCHAR(200) NOT NULL,
    documento_fiscal    VARCHAR(30) NULL,
    telefono            VARCHAR(20) NULL,
    correo              VARCHAR(150) NULL,
    direccion           TEXT NULL,
    activo              TINYINT(1) NOT NULL DEFAULT 1,
    es_sistema          TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'agregada despues (§3.10): marca "Publico General" sembrado por tenant',
    fecha_registro      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY                 idx_clientes_tenant (tenant_id),
    CONSTRAINT          fk_clientes_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE planes_pago_cliente (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id       BIGINT UNSIGNED NOT NULL,
    cliente_id      BIGINT UNSIGNED NOT NULL,
    concepto        VARCHAR(200) NOT NULL,
    monto_total     DECIMAL(10,2) NOT NULL,
    fecha_inicio    DATE NOT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY             idx_planes_pago_cliente_tenant (tenant_id),
    KEY             idx_planes_pago_cliente_cliente (cliente_id),
    CONSTRAINT      fk_planes_pago_cliente_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT      fk_planes_pago_cliente_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE planes_pago_cliente_cuotas (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    plan_pago_cliente_id    BIGINT UNSIGNED NOT NULL,
    numero_cuota            INT NOT NULL,
    monto                   DECIMAL(10,2) NOT NULL,
    fecha_vencimiento       DATE NOT NULL,
    fecha_pago              DATETIME NULL,
    estado                  ENUM('pendiente','pagada','vencida') NOT NULL DEFAULT 'pendiente',
    KEY                     idx_cuotas_plan (plan_pago_cliente_id),
    CONSTRAINT              fk_cuotas_plan FOREIGN KEY (plan_pago_cliente_id) REFERENCES planes_pago_cliente(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MÓDULO 6 — TPV / VENTAS
-- ============================================================

CREATE TABLE caja_sesiones (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sucursal_id             BIGINT UNSIGNED NOT NULL,
    usuario_id              BIGINT UNSIGNED NOT NULL,
    monto_apertura          DECIMAL(10,2) NOT NULL,
    monto_cierre            DECIMAL(10,2) NULL,
    total_ventas_sistema    DECIMAL(10,2) NULL,
    diferencia              DECIMAL(10,2) NULL,
    fecha_apertura          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_cierre            DATETIME NULL,
    estado                  ENUM('abierta','cerrada') NOT NULL DEFAULT 'abierta',
    KEY                     idx_caja_sesiones_sucursal (sucursal_id),
    KEY                     idx_caja_sesiones_usuario (usuario_id),
    CONSTRAINT              fk_caja_sesiones_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT,
    CONSTRAINT              fk_caja_sesiones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ventas (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id               BIGINT UNSIGNED NOT NULL,
    sucursal_id             BIGINT UNSIGNED NOT NULL,
    caja_sesion_id          BIGINT UNSIGNED NOT NULL,
    usuario_id              BIGINT UNSIGNED NOT NULL,
    cliente_id              BIGINT UNSIGNED NOT NULL,
    cupon_id                BIGINT UNSIGNED NULL,
    fecha                   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total                   DECIMAL(10,2) NOT NULL,
    descuento_cupon         DECIMAL(10,2) NOT NULL DEFAULT 0,
    descuento_manual        DECIMAL(10,2) NOT NULL DEFAULT 0,
    abono_previo            DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'liquidacion de apartado: lo ya cobrado antes',
    es_venta_sombra         TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'true = venta generada por un cambio; excluir de reportes financieros',
    estado                  ENUM('completada','anulada') NOT NULL DEFAULT 'completada',
    motivo_anulacion        VARCHAR(255) NULL,
    fecha_anulacion         DATETIME NULL,
    usuario_anulacion_id    BIGINT UNSIGNED NULL,
    KEY                     idx_ventas_tenant (tenant_id),
    KEY                     idx_ventas_sucursal (sucursal_id),
    KEY                     idx_ventas_caja_sesion (caja_sesion_id),
    KEY                     idx_ventas_usuario (usuario_id),
    KEY                     idx_ventas_cliente (cliente_id),
    KEY                     idx_ventas_cupon (cupon_id),
    KEY                     idx_ventas_usuario_anulacion (usuario_anulacion_id),
    CONSTRAINT              fk_ventas_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT              fk_ventas_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT,
    CONSTRAINT              fk_ventas_caja_sesion FOREIGN KEY (caja_sesion_id) REFERENCES caja_sesiones(id) ON DELETE RESTRICT,
    CONSTRAINT              fk_ventas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT              fk_ventas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    CONSTRAINT              fk_ventas_cupon FOREIGN KEY (cupon_id) REFERENCES cupones(id) ON DELETE SET NULL,
    CONSTRAINT              fk_ventas_usuario_anulacion FOREIGN KEY (usuario_anulacion_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE venta_pagos (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    venta_id            BIGINT UNSIGNED NOT NULL,
    metodo_pago_id      BIGINT UNSIGNED NOT NULL,
    monto               DECIMAL(10,2) NOT NULL,
    KEY                 idx_venta_pagos_venta (venta_id),
    KEY                 idx_venta_pagos_metodo_pago (metodo_pago_id),
    CONSTRAINT          fk_venta_pagos_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    CONSTRAINT          fk_venta_pagos_metodo_pago FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE venta_detalles (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    venta_id            BIGINT UNSIGNED NOT NULL,
    variante_id         BIGINT UNSIGNED NOT NULL,
    regla_precio_id     BIGINT UNSIGNED NULL,
    cantidad            INT NOT NULL,
    precio_unitario     DECIMAL(10,2) NOT NULL,
    descuento_aplicado  DECIMAL(10,2) NOT NULL DEFAULT 0,
    subtotal            DECIMAL(10,2) NOT NULL,
    KEY                 idx_venta_detalles_venta (venta_id),
    KEY                 idx_venta_detalles_variante (variante_id),
    KEY                 idx_venta_detalles_regla_precio (regla_precio_id),
    CONSTRAINT          fk_venta_detalles_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    CONSTRAINT          fk_venta_detalles_variante FOREIGN KEY (variante_id) REFERENCES producto_variantes(id) ON DELETE RESTRICT,
    CONSTRAINT          fk_venta_detalles_regla_precio FOREIGN KEY (regla_precio_id) REFERENCES reglas_precio(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MÓDULO 7 — APARTADOS
-- ============================================================

CREATE TABLE apartados (
    id                      BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id               BIGINT UNSIGNED NOT NULL,
    sucursal_id             BIGINT UNSIGNED NOT NULL,
    cliente_id              BIGINT UNSIGNED NOT NULL,
    usuario_id              BIGINT UNSIGNED NOT NULL,
    venta_id                BIGINT UNSIGNED NULL COMMENT 'venta generada al liquidar',
    total                   DECIMAL(10,2) NOT NULL,
    total_abonado           DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado                  ENUM('activo','completado','cancelado') NOT NULL DEFAULT 'activo',
    fecha_creacion          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento       DATE NULL,
    fecha_completado        DATETIME NULL,
    fecha_cancelado         DATETIME NULL,
    usuario_cancelacion_id  BIGINT UNSIGNED NULL,
    motivo_cancelacion      TEXT NULL,
    notas                   TEXT NULL,
    KEY                     idx_apartados_tenant (tenant_id),
    KEY                     idx_apartados_sucursal (sucursal_id),
    KEY                     idx_apartados_cliente (cliente_id),
    KEY                     idx_apartados_usuario (usuario_id),
    KEY                     idx_apartados_venta (venta_id),
    KEY                     idx_apartados_usuario_cancelacion (usuario_cancelacion_id),
    CONSTRAINT              fk_apartados_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT              fk_apartados_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT,
    CONSTRAINT              fk_apartados_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    CONSTRAINT              fk_apartados_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT              fk_apartados_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL,
    CONSTRAINT              fk_apartados_usuario_cancelacion FOREIGN KEY (usuario_cancelacion_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE apartado_detalles (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    apartado_id         BIGINT UNSIGNED NOT NULL,
    variante_id         BIGINT UNSIGNED NOT NULL,
    cantidad            INT NOT NULL,
    precio_unitario     DECIMAL(10,2) NOT NULL,
    subtotal            DECIMAL(10,2) NOT NULL,
    KEY                 idx_apartado_detalles_apartado (apartado_id),
    KEY                 idx_apartado_detalles_variante (variante_id),
    CONSTRAINT          fk_apartado_detalles_apartado FOREIGN KEY (apartado_id) REFERENCES apartados(id) ON DELETE CASCADE,
    CONSTRAINT          fk_apartado_detalles_variante FOREIGN KEY (variante_id) REFERENCES producto_variantes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE apartado_abonos (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    apartado_id     BIGINT UNSIGNED NOT NULL,
    monto           DECIMAL(10,2) NOT NULL,
    fecha           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    usuario_id      BIGINT UNSIGNED NOT NULL,
    notas           TEXT NULL,
    KEY             idx_apartado_abonos_apartado (apartado_id),
    KEY             idx_apartado_abonos_usuario (usuario_id),
    CONSTRAINT      fk_apartado_abonos_apartado FOREIGN KEY (apartado_id) REFERENCES apartados(id) ON DELETE CASCADE,
    CONSTRAINT      fk_apartado_abonos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE apartado_abono_pagos (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    abono_id            BIGINT UNSIGNED NOT NULL,
    metodo_pago_id      BIGINT UNSIGNED NOT NULL,
    monto               DECIMAL(10,2) NOT NULL,
    KEY                 idx_apartado_abono_pagos_abono (abono_id),
    KEY                 idx_apartado_abono_pagos_metodo_pago (metodo_pago_id),
    CONSTRAINT          fk_apartado_abono_pagos_abono FOREIGN KEY (abono_id) REFERENCES apartado_abonos(id) ON DELETE CASCADE,
    CONSTRAINT          fk_apartado_abono_pagos_metodo_pago FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MÓDULO 8 — DEVOLUCIONES
-- ============================================================

CREATE TABLE devoluciones (
    id                          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id                   BIGINT UNSIGNED NOT NULL,
    sucursal_id                 BIGINT UNSIGNED NOT NULL,
    venta_id                    BIGINT UNSIGNED NOT NULL COMMENT 'ticket origen',
    venta_sombra_id             BIGINT UNSIGNED NULL COMMENT 'venta generada si tipo=cambio; permite devolucion recursiva',
    usuario_id                  BIGINT UNSIGNED NOT NULL,
    tipo                        ENUM('devolucion','cambio') NOT NULL,
    monto_devolucion            DECIMAL(10,2) NOT NULL,
    monto_cambio                DECIMAL(10,2) NOT NULL DEFAULT 0,
    diferencia                  DECIMAL(10,2) NOT NULL COMMENT 'negativo = reembolso, positivo = cobro adicional',
    motivo                      TEXT NULL,
    fecha                       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY                         idx_devoluciones_tenant (tenant_id),
    KEY                         idx_devoluciones_sucursal (sucursal_id),
    KEY                         idx_devoluciones_venta (venta_id),
    KEY                         idx_devoluciones_venta_sombra (venta_sombra_id),
    KEY                         idx_devoluciones_usuario (usuario_id),
    CONSTRAINT                  fk_devoluciones_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT                  fk_devoluciones_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT,
    CONSTRAINT                  fk_devoluciones_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE RESTRICT,
    CONSTRAINT                  fk_devoluciones_venta_sombra FOREIGN KEY (venta_sombra_id) REFERENCES ventas(id) ON DELETE SET NULL,
    CONSTRAINT                  fk_devoluciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE devolucion_pagos (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    devolucion_id       BIGINT UNSIGNED NOT NULL,
    metodo_pago_id      BIGINT UNSIGNED NOT NULL,
    monto               DECIMAL(10,2) NOT NULL COMMENT 'monto de este metodo en el reembolso o cobro de diferencia',
    KEY                 idx_devolucion_pagos_devolucion (devolucion_id),
    KEY                 idx_devolucion_pagos_metodo_pago (metodo_pago_id),
    CONSTRAINT          fk_devolucion_pagos_devolucion FOREIGN KEY (devolucion_id) REFERENCES devoluciones(id) ON DELETE CASCADE,
    CONSTRAINT          fk_devolucion_pagos_metodo_pago FOREIGN KEY (metodo_pago_id) REFERENCES metodos_pago(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE devolucion_items (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    devolucion_id       BIGINT UNSIGNED NOT NULL,
    variante_id         BIGINT UNSIGNED NOT NULL,
    tipo                ENUM('devuelto','nuevo') NOT NULL,
    cantidad            INT NOT NULL,
    precio_unitario     DECIMAL(10,2) NOT NULL,
    subtotal            DECIMAL(10,2) NOT NULL,
    va_a_merma          TINYINT(1) NOT NULL DEFAULT 0,
    KEY                 idx_devolucion_items_devolucion (devolucion_id),
    KEY                 idx_devolucion_items_variante (variante_id),
    CONSTRAINT          fk_devolucion_items_devolucion FOREIGN KEY (devolucion_id) REFERENCES devoluciones(id) ON DELETE CASCADE,
    CONSTRAINT          fk_devolucion_items_variante FOREIGN KEY (variante_id) REFERENCES producto_variantes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MÓDULO 9 — GASTOS
-- ============================================================

CREATE TABLE gastos (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    caja_sesion_id      BIGINT UNSIGNED NOT NULL,
    sucursal_id         BIGINT UNSIGNED NOT NULL,
    usuario_id          BIGINT UNSIGNED NOT NULL,
    descripcion         VARCHAR(255) NOT NULL,
    monto               DECIMAL(10,2) NOT NULL,
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY                 idx_gastos_caja_sesion (caja_sesion_id),
    KEY                 idx_gastos_sucursal (sucursal_id),
    KEY                 idx_gastos_usuario (usuario_id),
    CONSTRAINT          fk_gastos_caja_sesion FOREIGN KEY (caja_sesion_id) REFERENCES caja_sesiones(id) ON DELETE CASCADE,
    CONSTRAINT          fk_gastos_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT,
    CONSTRAINT          fk_gastos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- MÓDULO 10 — CONFIGURACIÓN
-- ============================================================

CREATE TABLE configuracion_tenant (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NOT NULL UNIQUE,
    moneda              VARCHAR(5) NOT NULL DEFAULT '$',
    mensaje_ticket      TEXT NULL,
    logo_url            VARCHAR(500) NULL,
    mostrar_rfc         TINYINT(1) NOT NULL DEFAULT 1,
    mostrar_telefono    TINYINT(1) NOT NULL DEFAULT 1,
    mostrar_correo      TINYINT(1) NOT NULL DEFAULT 1,
    backup_auto         TINYINT(1) NOT NULL DEFAULT 0,
    backup_frecuencia   ENUM('diario','semanal','mensual') NOT NULL DEFAULT 'semanal',
    backup_ultimo       DATETIME NULL,
    codigo_barras_automatico TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'agregada despues (§3.10): autogenerar codigo de barras de variantes nuevas',
    CONSTRAINT          fk_configuracion_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```
