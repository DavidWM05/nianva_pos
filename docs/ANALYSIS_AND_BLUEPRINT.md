# Sistema POS Legacy - Reporte de Análisis y Blueprint de Arquitectura

> **Línea base:** Núcleo ERP (Laravel + Angular + MySQL, 42+ tablas, multi-tenant)
> **Fecha del análisis:** 27 Julio 2026
> **Archivos de referencia:** `nucleo_arquitectura.md` y `MANUAL_TECNICO.md`

---

## 1. Resumen Ejecutivo y Benchmark

### Proyectos Analizados (14)

| # | Proyecto | Tecnología | País / Moneda | Esquema Fiscal |
|---|----------|-----------|---------------|----------------|
| 1 | **boutique-system** | Node.js/Express + PostgreSQL | Perú — S/ (Sol) | Boleta/Factura, RUC, es-PE |
| 2 | **SISTEMA DE BOUTIQUE** | Node.js/Express + PostgreSQL | Perú — S/ (Sol) | Boleta/Factura, RUC, es-PE |
| 3 | **SISTEMA DE MODA** | PHP nativo + MySQL | Perú — S/ (Sol) | Boleta/Factura, RUC, SUNAT |
| 4 | **MiniMarket** | C# .NET 10 + SQL Server | Perú — S/ (Sol) | RUC 11 dígitos, IGV 18% |
| 5 | **sistema-ferreteria** | Node.js/Express + React + MySQL | Perú — S/ (Sol) | Boleta/Factura/Ticket, IGV 18%, SUNAT |
| 6 | **sistema-polleria** | Node.js/Express + React + MySQL | Perú — S/ (Sol) | Boleta/Factura/Nota, IGV 18%, SUNAT |
| 7 | **panaderiapasteleria** | Laravel 12 + PostgreSQL | Perú — S/ (Sol) | RUC/DNI, es-PE, IGV |
| 8 | **SISTEMA DE PANADERIA Y PASTELERIA** | Laravel 12 + PostgreSQL | Perú — S/ (Sol) | RUC/DNI, es-PE, IGV |
| 9 | **nianva_pos_ropa** | PHP nativo + MySQL | México — $ (MXN) | RFC, Baby Shop Jr, Edo. Mex |
| 10 | **nianva (InfoShop POS)** | Laravel 11 + Inertia/React + MySQL | Sri Lanka — Rs. (LKR) | Genérico multi-país |
| 11 | **MB-POS** | Laravel 5.8 + MySQL | Bangladesh — ৳ (BDT) | GST, Asia/Dhaka |
| 12 | **Modern-POS** | PHP nativo + MySQL | Bangladesh/India — ৳ | GST (CGST/SGST/IGST), HSN |
| 13 | **Punto de venta - Multi Tiendas POS** | CodeIgniter 3 + MySQL | Singapur — SGD$ | GST 7%, Asia/Singapore |
| 14 | **Gain-POS** | Laravel 8 + MySQL | Neutro multi-país | TIN, impuesto configurable |
| 15 | **Freelance-cockpit** | CodeIgniter 3 + MySQL | Neutro multi-país | VAT multi-impuesto |

> **Nota:** Freelance-cockpit no es un sistema POS sino un CRM/Project Management/Helpdesk. No comparte dominio de negocio con Núcleo, pero se analiza por si alguno de sus módulos (leads, tickets, facturación recurrente) pudiera integrarse como vertical.

---

### Confirmado por Núcleo (sin cambios)

Las siguientes capacidades están **cubiertas por Núcleo** y no requieren documentación adicional. Se listan para confirmar que ningún proyecto legacy aporta un diferenciador real aquí:

| Capacidad | Presente en Núcleo | Presente en Legacy |
|-----------|-------------------|-------------------|
| **Inventario** (productos, variantes, categorías, departamentos, stock) | ✅ Schema completo, variantes siempre presentes, `inventario_stock` como única fuente de verdad | Todos los proyectos POS |
| **Kardex / Trazabilidad** | ✅ `kardex` con stock_resultante como fotografía histórica | boutique-system, nianva_pos_ropa, sistema-ferreteria, etc. |
| **Compras** (proveedores, compra_detalles) | ✅ 2 tablas: `compras`, `compra_detalles` | Todos los proyectos POS |
| **Ventas / TPV** | ✅ `ventas`, `venta_detalles`, `venta_pagos` (pago mixto) | Todos los proyectos POS |
| **Caja / Sesiones** | ✅ `caja_sesiones` con apertura/cierre | La mayoría de proyectos |
| **Pago Mixto** | ✅ Tablas `*_pagos` independientes, nunca columna de método en padre | nianva_pos_ropa, Gain-POS, Multi Tiendas POS |
| **Devoluciones** | ✅ `devoluciones`, `devolucion_pagos`, `devolucion_items` con merma | nianva_pos_ropa, sistema-ferreteria, Gain-POS |
| **Apartados (Layaway)** | ✅ 4 tablas con abonos y pagos mixtos por abono | nianva_pos_ropa |
| **Gastos** | ✅ Tabla `gastos` | Todos |
| **Promociones / Descuentos** | ✅ `reglas_precio` unificadas (%), fijo, NxM, bundle + `cupones` | nianva_pos_ropa, sistema-polleria |
| **RBAC (Roles y Permisos)** | ✅ `modulo.accion`, roles de sistema, middleware `permiso:` | Gain-POS, MB-POS, sistema-ferreteria |
| **CRM / Clientes** | ✅ `clientes` con `es_sistema`, `planes_pago_cliente` + cuotas | Todos los proyectos POS |
| **Multi-sucursal** | ✅ `sucursales` con tenant_id, `inventario_stock` por sucursal | MB-POS, Multi Tiendas POS, Gain-POS |
| **Auditoría** | ✅ `auditoria` con diffs JSON (create/update/delete) | sistema-ferreteria (audit_logs) |
| **Configuración de empresa** | ✅ `configuracion_tenant` | Todos (settings, config, empresa) |
| **Pago mixto con vuelto solo en efectivo** | ✅ Regla en capa de aplicación | nianva_pos_ropa |
| **Venta sombra** | ✅ `es_venta_sombra` booleano explícito | nianva_pos_ropa (forma_pago='cambio') |
| **Anulación con reversión de stock** | ✅ Prevista en diseño de kardex | sistema-ferreteria, MiniMarket, boutique-system |
| **2FA / Dispositivo confiable** | ✅ Implementado (ver §3.10 y MANUAL_TECNICO §2.4) | Ningún proyecto legacy |

---

### Diferenciadores Reales (el foco del reporte)

A continuación, **todo lo que Núcleo no resuelve todavía** y que los proyectos legacy aportan. Listados por orden de prioridad de integración:

| # | Diferenciador | Proyecto(s) fuente | País Aplica | Impacto |
|---|--------------|-------------------|-------------|---------|
| 1 | **Cuentas por Cobrar (CxC) + Abonos** | sistema-ferreteria, sistema-polleria, Punto de venta, Modern-POS | Universal | **Alto** — Venta a crédito con seguimiento de saldo, vencimiento, abonos parciales |
| 2 | **Cuentas por Pagar (CxP) + Abonos** | sistema-ferreteria, Punto de venta | Universal | **Alto** — Compra a crédito con seguimiento de pagos |
| 3 | **Cotizaciones / Presupuestos convertibles a venta** | sistema-ferreteria, nianva, sistema-polleria, Freelance-cockpit | Universal | **Alto** — Proformas que se convierten en ventas |
| 4 | **Delivery / Pedidos con repartidores** | sistema-polleria, Gain-POS | Universal | **Medio-Alto** — Gestión de pedidos a domicilio |
| 5 | **CRM Avanzado (segmentación + campañas)** | sistema-polleria, Freelance-cockpit | Universal | **Medio** — Segmentación automática, campañas email, interacciones |
| 6 | **Módulo de Producción (recetas + insumos)** | panaderiapasteleria | Universal | **Medio** — Recetas, producción, transformación, control de lotes |
| 7 | **Gift Cards / Tarjetas de Regalo** | Modern-POS, Punto de venta, Gain-POS | Universal | **Medio** — Emisión, recarga, pago |
| 8 | **Puntos de Fidelidad / Loyalty** | sistema-polleria, nianva, panaderiapasteleria | Universal | **Medio** — Programa de fidelización |
| 9 | **Comprobantes Fiscales Peruanos (SUNAT)** | sistema-ferreteria, MiniMarket, sistema-polleria, boutique-system | Perú | **Medio** — Serie/correlativo B001/F001, IGV 18% incluido |
| 10 | **Nota de Crédito en Devoluciones** | sistema-ferreteria | Universal | **Medio** — Alternativa a reembolso en efectivo |
| 11 | **Impresión Térmica POS** | sistema-polleria, Modern-POS, sistema-ferreteria | Universal | **Medio-Bajo** — Impresión directa a impresora térmica |
| 12 | **Payroll / Nómina** | nianva | Universal | **Medio** — Gestión de salarios y empleados |
| 13 | **Pedidos Especiales (workflow)** | panaderiapasteleria | Universal | **Medio-Bajo** — Pedidos personalizados con ciclo de vida |
| 14 | **Ventas a Plazos con Intereses** | Modern-POS | Universal | **Bajo** — Planes de pago con cuotas e intereses |
| 15 | **PWA / Offline-first** | nianva | Universal | **Medio** — Modo offline con sincronización |
| 16 | **Múltiples Unidades de Medida** | sistema-ferreteria | Universal | **Medio-Bajo** — und, kg, bal, bol, var, etc. |
| 17 | **Cargos Automáticos (Charges)** | nianva | Universal | **Bajo** — Service charge, delivery, tax auto |
| 18 | **Préstamos (Loans)** | Modern-POS | Universal | **Bajo** — Préstamos recibidos con intereses |
| 19 | **Notificaciones multicanal (Telegram, SMS)** | nianva, sistema-polleria, Gain-POS | Universal | **Bajo** — Email + Telegram + SMS |
| 20 | **Instalador Web** | Gain-POS, MB-POS | Universal | **Bajo** — Setup wizard |

---

## 2. Arquitectura de Datos — Solo lo Nuevo

### Principios de integración

Todas las entidades nuevas deben:
1. **Seguir el patrón `BelongsToTenant`** (columna `tenant_id` + FK a `tenants.id`) o `BelongsToTenantViaRelacion` cuando el tenant se resuelva a través de una relación existente — nunca inventar un patrón nuevo de aislamiento.
2. **Conectarse a entidades existentes de Núcleo** (`productos`, `ventas`, `clientes`, `sucursales`, `usuarios`) — nunca duplicar.
3. **Nombrarse en `snake_case`**, plural, con `BIGINT UNSIGNED` como PK.
4. **Seguir el patrón de pago mixto** si aplica (tabla `*_pagos` hija, no columna de método en padre).

### Entidades Nuevas Propuestas

#### Módulo: Cuentas por Cobrar (CxC)

```sql
-- Basado en: sistema-ferreteria, sistema-polleria, Punto de venta, Modern-POS
CREATE TABLE cuentas_cobrar (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NOT NULL,
    venta_id            BIGINT UNSIGNED NOT NULL COMMENT 'venta que origina la deuda',
    cliente_id          BIGINT UNSIGNED NOT NULL,
    monto_total         DECIMAL(10,2) NOT NULL,
    saldo_pendiente     DECIMAL(10,2) NOT NULL,
    fecha_vencimiento   DATE NULL,
    estado              ENUM('pendiente','pagada','anulada') NOT NULL DEFAULT 'pendiente',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY                 idx_cuentas_cobrar_tenant (tenant_id),
    KEY                 idx_cuentas_cobrar_venta (venta_id),
    KEY                 idx_cuentas_cobrar_cliente (cliente_id),
    CONSTRAINT          fk_cuentas_cobrar_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT          fk_cuentas_cobrar_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE RESTRICT,
    CONSTRAINT          fk_cuentas_cobrar_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE abonos_cuenta (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cuenta_cobrar_id    BIGINT UNSIGNED NOT NULL,
    caja_sesion_id      BIGINT UNSIGNED NULL COMMENT 'caja donde se recibe el abono',
    usuario_id          BIGINT UNSIGNED NOT NULL,
    monto               DECIMAL(10,2) NOT NULL,
    metodo_pago_id      BIGINT UNSIGNED NOT NULL,
    referencia          VARCHAR(100) NULL COMMENT 'numero de transferencia, cheque, etc.',
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY                 idx_abonos_cuenta_cobrar (cuenta_cobrar_id),
    KEY                 idx_abonos_cuenta_caja (caja_sesion_id),
    KEY                 idx_abonos_cuenta_usuario (usuario_id),
    CONSTRAINT          fk_abonos_cuenta_cobrar FOREIGN KEY (cuenta_cobrar_id) REFERENCES cuentas_cobrar(id) ON DELETE CASCADE,
    CONSTRAINT          fk_abonos_cuenta_caja FOREIGN KEY (caja_sesion_id) REFERENCES caja_sesiones(id) ON DELETE SET NULL,
    CONSTRAINT          fk_abonos_cuenta_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Módulo: Cuentas por Pagar (CxP)

```sql
-- Basado en: sistema-ferreteria, Punto de venta
CREATE TABLE cuentas_pagar (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NOT NULL,
    compra_id           BIGINT UNSIGNED NOT NULL COMMENT 'compra que origina la deuda',
    proveedor_id        BIGINT UNSIGNED NOT NULL,
    monto_total         DECIMAL(10,2) NOT NULL,
    saldo_pendiente     DECIMAL(10,2) NOT NULL,
    fecha_vencimiento   DATE NULL,
    estado              ENUM('pendiente','pagada','anulada') NOT NULL DEFAULT 'pendiente',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY                 idx_cuentas_pagar_tenant (tenant_id),
    KEY                 idx_cuentas_pagar_compra (compra_id),
    KEY                 idx_cuentas_pagar_proveedor (proveedor_id),
    CONSTRAINT          fk_cuentas_pagar_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT          fk_cuentas_pagar_compra FOREIGN KEY (compra_id) REFERENCES compras(id) ON DELETE RESTRICT,
    CONSTRAINT          fk_cuentas_pagar_proveedor FOREIGN KEY (proveedor_id) REFERENCES proveedores(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE abonos_pagar (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cuenta_pagar_id     BIGINT UNSIGNED NOT NULL,
    caja_sesion_id      BIGINT UNSIGNED NULL COMMENT 'caja de donde sale el pago',
    usuario_id          BIGINT UNSIGNED NOT NULL,
    monto               DECIMAL(10,2) NOT NULL,
    metodo_pago_id      BIGINT UNSIGNED NOT NULL,
    referencia          VARCHAR(100) NULL,
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY                 idx_abonos_pagar_cuenta (cuenta_pagar_id),
    KEY                 idx_abonos_pagar_caja (caja_sesion_id),
    KEY                 idx_abonos_pagar_usuario (usuario_id),
    CONSTRAINT          fk_abonos_pagar_cuenta FOREIGN KEY (cuenta_pagar_id) REFERENCES cuentas_pagar(id) ON DELETE CASCADE,
    CONSTRAINT          fk_abonos_pagar_caja FOREIGN KEY (caja_sesion_id) REFERENCES caja_sesiones(id) ON DELETE SET NULL,
    CONSTRAINT          fk_abonos_pagar_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Módulo: Cotizaciones / Presupuestos

```sql
-- Basado en: sistema-ferreteria, nianva, sistema-polleria
CREATE TABLE cotizaciones (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NOT NULL,
    sucursal_id         BIGINT UNSIGNED NOT NULL,
    cliente_id          BIGINT UNSIGNED NULL COMMENT 'NULL si es cotizacion sin cliente',
    usuario_id          BIGINT UNSIGNED NOT NULL,
    numero_cotizacion   VARCHAR(30) NOT NULL COMMENT 'formato configurable: COT-000001',
    total               DECIMAL(10,2) NOT NULL,
    descuento           DECIMAL(10,2) NOT NULL DEFAULT 0,
    validez_dias        INT UNSIGNED NOT NULL DEFAULT 15,
    estado              ENUM('pendiente','convertida','vencida','anulada') NOT NULL DEFAULT 'pendiente',
    venta_id            BIGINT UNSIGNED NULL COMMENT 'venta generada al convertir',
    observaciones       TEXT NULL,
    fecha_vencimiento   DATE NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY                 idx_cotizaciones_tenant (tenant_id),
    KEY                 idx_cotizaciones_cliente (cliente_id),
    KEY                 idx_cotizaciones_venta (venta_id),
    CONSTRAINT          fk_cotizaciones_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT          fk_cotizaciones_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT,
    CONSTRAINT          fk_cotizaciones_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL,
    CONSTRAINT          fk_cotizaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT          fk_cotizaciones_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cotizacion_detalles (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cotizacion_id       BIGINT UNSIGNED NOT NULL,
    variante_id         BIGINT UNSIGNED NOT NULL,
    cantidad            INT NOT NULL,
    precio_unitario     DECIMAL(10,2) NOT NULL,
    descuento           DECIMAL(10,2) NOT NULL DEFAULT 0,
    subtotal            DECIMAL(10,2) NOT NULL,
    KEY                 idx_cotizacion_detalles_cotizacion (cotizacion_id),
    KEY                 idx_cotizacion_detalles_variante (variante_id),
    CONSTRAINT          fk_cotizacion_detalles_cotizacion FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
    CONSTRAINT          fk_cotizacion_detalles_variante FOREIGN KEY (variante_id) REFERENCES producto_variantes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> **Nota:** `cotizaciones` sigue el mismo patrón de `*_detalles` que `ventas` y `compras`. Sin embargo, a diferencia de ventas, **no tiene tabla `*_pagos`** porque una cotización no involucra cobro.

#### Módulo: Delivery / Pedidos

```sql
-- Basado en: sistema-polleria, Gain-POS
CREATE TABLE pedidos (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NOT NULL,
    sucursal_id         BIGINT UNSIGNED NOT NULL,
    venta_id            BIGINT UNSIGNED NULL COMMENT 'venta generada al completar',
    cliente_id          BIGINT UNSIGNED NOT NULL,
    usuario_id          BIGINT UNSIGNED NOT NULL COMMENT 'quien toma el pedido',
    repartidor_id       BIGINT UNSIGNED NULL,
    numero_pedido       VARCHAR(30) NOT NULL,
    direccion_entrega   TEXT NULL,
    referencia          VARCHAR(255) NULL,
    costo_delivery      DECIMAL(10,2) NOT NULL DEFAULT 0,
    estado              ENUM('pendiente','preparando','en_camino','entregado','cancelado') NOT NULL DEFAULT 'pendiente',
    tiempo_estimado     INT UNSIGNED NULL COMMENT 'minutos',
    notas               TEXT NULL,
    fecha_entrega       DATETIME NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY                 idx_pedidos_tenant (tenant_id),
    KEY                 idx_pedidos_venta (venta_id),
    KEY                 idx_pedidos_cliente (cliente_id),
    KEY                 idx_pedidos_repartidor (repartidor_id),
    CONSTRAINT          fk_pedidos_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT          fk_pedidos_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT,
    CONSTRAINT          fk_pedidos_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL,
    CONSTRAINT          fk_pedidos_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE RESTRICT,
    CONSTRAINT          fk_pedidos_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT          fk_pedidos_repartidor FOREIGN KEY (repartidor_id) REFERENCES usuarios(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> **Nota:** `venta_id` se relaciona con `ventas` para que el pedido pueda generar una venta (o viceversa). Un pedido puede existir sin venta (pedido pendiente) y una venta puede existir sin pedido (venta en tienda). El costo de delivery se registra en `pedidos.costo_delivery` y podría reflejarse como un item adicional en `venta_detalles` al convertir.

#### Módulo: CRM Avanzado / Interacciones

```sql
-- Basado en: sistema-polleria, Freelance-cockpit
-- Extiende la tabla `clientes` existente de Núcleo (agregar columnas)
-- ALTER TABLE clientes ADD COLUMN (
--     puntos              INT NOT NULL DEFAULT 0,
--     segmento            ENUM('nuevo','frecuente','vip','inactivo') NULL,
--     fecha_nacimiento    DATE NULL,
--     notas_crm           TEXT NULL
-- );

CREATE TABLE crm_interacciones (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NOT NULL,
    cliente_id          BIGINT UNSIGNED NOT NULL,
    usuario_id          BIGINT UNSIGNED NOT NULL,
    tipo                ENUM('llamada','email','whatsapp','nota','visita') NOT NULL,
    observacion         TEXT NOT NULL,
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY                 idx_crm_interacciones_cliente (cliente_id),
    KEY                 idx_crm_interacciones_usuario (usuario_id),
    CONSTRAINT          fk_crm_interacciones_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT          fk_crm_interacciones_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE,
    CONSTRAINT          fk_crm_interacciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Módulo: Gift Cards / Tarjetas de Regalo

```sql
-- Basado en: Modern-POS, Punto de venta, Gain-POS
CREATE TABLE gift_cards (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NOT NULL,
    cliente_id          BIGINT UNSIGNED NULL COMMENT 'propietario de la tarjeta',
    codigo              VARCHAR(50) NOT NULL UNIQUE,
    saldo_inicial       DECIMAL(10,2) NOT NULL,
    saldo_actual        DECIMAL(10,2) NOT NULL,
    fecha_expiracion    DATE NULL,
    estado              ENUM('activa','usada','expirada','cancelada') NOT NULL DEFAULT 'activa',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY                 idx_gift_cards_tenant (tenant_id),
    KEY                 idx_gift_cards_cliente (cliente_id),
    CONSTRAINT          fk_gift_cards_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT          fk_gift_cards_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE gift_card_recargas (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    gift_card_id        BIGINT UNSIGNED NOT NULL,
    monto               DECIMAL(10,2) NOT NULL,
    usuario_id          BIGINT UNSIGNED NOT NULL,
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT          fk_gift_card_recargas_card FOREIGN KEY (gift_card_id) REFERENCES gift_cards(id) ON DELETE CASCADE,
    CONSTRAINT          fk_gift_card_recargas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> **Integración con pagos:** `gift_card` debe agregarse como un `metodo_pago` más (tipo `'digital'` o nuevo `'gift_card'`). Al pagar con gift card, se crea un registro en `venta_pagos` con `metodo_pago_id` apuntando al método gift card y se descuenta `saldo_actual` de la gift card. Esto sigue el patrón de pago mixto existente.

#### Módulo: Producción / Recetas (Panadería/Pastelería)

```sql
-- Basado en: panaderiapasteleria
CREATE TABLE insumos (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NOT NULL,
    nombre              VARCHAR(200) NOT NULL,
    sku                 VARCHAR(50) NULL UNIQUE,
    unidad_base         VARCHAR(20) NOT NULL DEFAULT 'kg' COMMENT 'kg, g, l, ml, und',
    costo               DECIMAL(10,4) NOT NULL DEFAULT 0,
    stock_minimo        DECIMAL(10,2) NOT NULL DEFAULT 0,
    activo              TINYINT(1) NOT NULL DEFAULT 1,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY                 idx_insumos_tenant (tenant_id),
    CONSTRAINT          fk_insumos_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE insumo_stocks (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    insumo_id           BIGINT UNSIGNED NOT NULL,
    sucursal_id         BIGINT UNSIGNED NOT NULL,
    cantidad            DECIMAL(10,4) NOT NULL DEFAULT 0,
    lote                VARCHAR(50) NULL,
    fecha_vencimiento   DATE NULL,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY          uq_insumo_stock_sucursal_lote (insumo_id, sucursal_id, lote),
    CONSTRAINT          fk_insumo_stock_insumo FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE CASCADE,
    CONSTRAINT          fk_insumo_stock_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE recetas (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NOT NULL,
    variante_id         BIGINT UNSIGNED NOT NULL COMMENT 'producto_variantes que se produce',
    nombre              VARCHAR(200) NOT NULL,
    descripcion         TEXT NULL,
    instrucciones       TEXT NULL,
    rendimiento         DECIMAL(10,2) NOT NULL DEFAULT 1 COMMENT 'unidades que produce',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY                 idx_recetas_tenant (tenant_id),
    KEY                 idx_recetas_variante (variante_id),
    CONSTRAINT          fk_recetas_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT          fk_recetas_variante FOREIGN KEY (variante_id) REFERENCES producto_variantes(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE receta_ingredientes (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    receta_id           BIGINT UNSIGNED NOT NULL,
    insumo_id           BIGINT UNSIGNED NOT NULL,
    cantidad            DECIMAL(10,4) NOT NULL,
    unidad              VARCHAR(20) NOT NULL DEFAULT 'g',
    CONSTRAINT          fk_receta_ingredientes_receta FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE CASCADE,
    CONSTRAINT          fk_receta_ingredientes_insumo FOREIGN KEY (insumo_id) REFERENCES insumos(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ordenes_produccion (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NOT NULL,
    sucursal_id         BIGINT UNSIGNED NOT NULL,
    receta_id           BIGINT UNSIGNED NOT NULL,
    usuario_id          BIGINT UNSIGNED NOT NULL,
    cantidad_producir   INT NOT NULL,
    cantidad_producida  INT NULL,
    estado              ENUM('pendiente','en_proceso','completada','cancelada') NOT NULL DEFAULT 'pendiente',
    fecha               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY                 idx_ordenes_produccion_tenant (tenant_id),
    CONSTRAINT          fk_ordenes_produccion_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT          fk_ordenes_produccion_sucursal FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT,
    CONSTRAINT          fk_ordenes_produccion_receta FOREIGN KEY (receta_id) REFERENCES recetas(id) ON DELETE RESTRICT,
    CONSTRAINT          fk_ordenes_produccion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

> **Decisión:** Los `insumos` son una entidad separada de `productos` porque representan materias primas que:
> 1. No se venden directamente (en la mayoría de casos)
> 2. Tienen unidades de medida fraccionarias (kg, g, l)
> 3. Requieren control de lote y vencimiento
> 4. Se consumen en producción, no se venden en POS
>
> La relación entre insumos y productos terminados se da a través de `recetas`.

#### Módulo: Puntos de Fidelidad (Loyalty)

```sql
-- Las columnas se agregan a `clientes` existente:
-- ALTER TABLE clientes ADD COLUMN (
--     puntos_loyalty      INT NOT NULL DEFAULT 0,
--     puntos_acumulados   INT NOT NULL DEFAULT 0 COMMENT 'total historico de puntos ganados'
-- );

CREATE TABLE loyalty_transacciones (
    id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    tenant_id           BIGINT UNSIGNED NOT NULL,
    cliente_id          BIGINT UNSIGNED NOT NULL,
    tipo                ENUM('ganados','canjeados','vencidos','ajuste') NOT NULL,
    puntos              INT NOT NULL,
    referencia_tabla    VARCHAR(60) NULL COMMENT 'ventas, etc.',
    referencia_id       BIGINT UNSIGNED NULL,
    expira_en           DATE NULL,
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY                 idx_loyalty_transacciones_cliente (cliente_id),
    CONSTRAINT          fk_loyalty_transacciones_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT          fk_loyalty_transacciones_cliente FOREIGN KEY (cliente_id) REFERENCES clientes(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 3. Matriz de Funcionalidades — Solo Diferenciadores

### 3.1 Cuentas por Cobrar (CxC)

**Proyectos fuente:** sistema-ferreteria (Node.js/React), sistema-polleria (Node.js/React), Punto de venta - Multi Tiendas POS (CodeIgniter), Modern-POS (PHP nativo)

**Casos de Uso Principales:**
- Cliente compra a crédito → se genera una CxC con monto total y vencimiento (default 30 días)
- Cliente realiza abonos parciales hasta liquidar la deuda
- Consulta de saldos pendientes por cliente
- Reporte de cuentas por cobrar (antigüedad, vencidas, pagadas)
- Corte de caja integra abonos recibidos como ingresos

**Reglas de Negocio Detectadas:**
- La CxC se genera automáticamente cuando `ventas.tipo_pago = 'credito'` (sistema-ferreteria) o cuando `ventas.metodo_pago = 'Debit'` con `vt_status = 0` (Punto de venta)
- Los abonos se registran siempre en la caja activa (dinero que ingresa al cajón)
- No se puede registrar un abono mayor al `saldo_pendiente`
- Al cerrar una CxC (saldo_pendiente = 0), `estado` pasa a `'pagada'`
- La anulación de una venta con CxC debe verificar que la cuenta esté pagada o anular también la cuenta

**¿Módulo nuevo o extensión?** **Módulo nuevo** — no existe nada similar en Núcleo. Depende de `ventas` (TPV) y `clientes` (CRM). Sigue el patrón `BelongsToTenant`.

---

### 3.2 Cuentas por Pagar (CxP)

**Proyectos fuente:** sistema-ferreteria (Node.js/React), Punto de venta - Multi Tiendas POS (CodeIgniter)

**Casos de Uso Principales:**
- Compra a proveedor a crédito → se genera una CxP
- Registro de pagos parciales a proveedores
- Consulta de saldos pendientes por proveedor
- Reporte de cuentas por pagar

**Reglas de Negocio Detectadas:**
- La CxP se genera cuando `compras.tipo_pago = 'credito'`
- Los pagos a proveedores descuentan de la caja (como egreso) o se registran como transferencia bancaria
- No se puede pagar más del `saldo_pendiente`

**¿Módulo nuevo o extensión?** **Módulo nuevo** — gemelo de CxC pero del lado de compras. Depende de `compras` (Inventario) y `proveedores` (Inventario). Sigue el patrón `BelongsToTenant`.

---

### 3.3 Cotizaciones / Presupuestos

**Proyectos fuente:** sistema-ferreteria, nianva (InfoShop POS), sistema-polleria, Freelance-cockpit

**Casos de Uso Principales:**
- Cajero/vendedor genera una cotización (proforma) para un cliente sin cobrar
- La cotización tiene validez de N días (default 15)
- La cotización se convierte en venta — se crea una venta con los mismos items
- Al convertir, la cotización cambia a estado `'convertida'` y se vincula a la venta generada
- Las cotizaciones vencidas se marcan automáticamente

**Reglas de Negocio Detectadas:**
- Una cotización **no modifica stock** (a diferencia de una venta)
- Al convertir a venta, se descuenta stock normalmente
- Una cotización vencida no puede convertirse
- `numero_cotizacion` sigue formato configurable (COT-000001, PRO-000001, etc.)
- La cotización puede existir sin cliente (cliente_id = NULL), pero para convertir a venta se requiere cliente

**¿Módulo nuevo o extensión?** **Módulo nuevo** — no existe en Núcleo. Similar a `ventas` en estructura pero sin cobro ni modificación de stock. Depende de `producto_variantes` y `clientes`.

---

### 3.4 Delivery / Pedidos

**Proyectos fuente:** sistema-polleria, Gain-POS (envíos/logística)

**Casos de Uso Principales:**
- Cliente solicita entrega a domicilio
- El pedido pasa por estados: pendiente → preparando → en_camino → entregado
- Se asigna un repartidor (usuario con rol repartidor, nuevo rol)
- Se registra dirección de entrega, costo de delivery, tiempo estimado
- Se genera la venta cuando se completa el pedido (o se vincula a una venta existente)
- Corte de caja separa ventas delivery de ventas en tienda

**Reglas de Negocio Detectadas:**
- Un pedido puede existir sin venta (cuando se toma el pedido y se paga contra entrega)
- Una venta puede existir sin pedido (venta en tienda)
- El costo de delivery puede ser fijo (default configurable) o variable por zona (Gain-POS)
- El repartidor ve solo sus pedidos activos cuando hay login
- El tiempo estimado default son 30 minutos

**¿Módulo nuevo o extensión?** **Módulo nuevo** — no existe en Núcleo. Se conecta con `clientes`, `ventas` y `usuarios`. Requiere un nuevo rol de sistema `repartidor` con permisos limitados.

---

### 3.5 CRM Avanzado (segmentación + campañas + interacciones)

**Proyectos fuente:** sistema-polleria (Node.js/React), Freelance-cockpit (CodeIgniter)

**Casos de Uso Principales:**
- Segmentación automática de clientes basada en historial de compras
- Registro de interacciones multicanal (llamada, email, WhatsApp, nota)
- Campañas de marketing por email a segmentos específicos
- Puntos de fidelidad con acumulación y canje
- Perfil de cliente con historial completo de interacciones

**Reglas de Negocio Detectadas (sistema-polleria):**
- Segmentación automática:
  - 0 ventas → `'nuevo'`
  - 1+ ventas (incluyendo 1) → `'frecuente'`
  - 5+ ventas → `'vip'`
  - Sin ventas en el último mes → `'inactivo'`
- Puntos: 1 punto por cada S/10 de total de venta
- Campañas email: envío por segmento usando SMTP configurado

**¿Módulo nuevo o extensión?** **Extensión del módulo CRM existente** — las columnas nuevas (`puntos`, `segmento`, `fecha_nacimiento`, `notas_crm`) se agregan a la tabla `clientes` que ya existe en Núcleo. La tabla `crm_interacciones` es nueva. Sigue el patrón `BelongsToTenant`.

---

### 3.6 Gift Cards / Tarjetas de Regalo

**Proyectos fuente:** Modern-POS (PHP nativo), Punto de venta (CodeIgniter), Gain-POS (Laravel)

**Casos de Uso Principales:**
- Emitir tarjeta de regalo con valor fijo a un cliente
- Cliente paga total o parcialmente con gift card
- Recargar saldo de una gift card existente
- Validar saldo y vigencia al momento del pago

**Reglas de Negocio Detectadas:**
- La gift card se agota al usarse (no puede reutilizarse si saldo = 0 en Punto de venta, o puede recargarse en Modern-POS)
- Fecha de expiración: al llegar la fecha, la tarjeta no puede usarse
- Al pagar con gift card, se descuenta `saldo_actual` y el monto se registra en `venta_pagos`
- Si el total de la venta excede el saldo de la gift card, el cliente debe pagar el resto con otro método
- Las gift cards se asocian a un cliente (o pueden ser anónimas)

**¿Módulo nuevo o extensión?** **Módulo nuevo** — no existe en Núcleo. Se integra con el sistema de pagos mixto agregando `metodo_pago` tipo `'gift_card'` (o `'digital'` si se prefiere). Sigue `BelongsToTenant`.

---

### 3.7 Módulo de Producción / Recetas

**Proyectos fuente:** panaderiapasteleria (Laravel 12)

**Casos de Uso Principales:**
- Definir recetas que relacionan insumos → producto terminado
- Ejecutar órdenes de producción que consumen insumos y generan stock de producto terminado
- Control de insumos por lote y fecha de vencimiento (FIFO/FEFO)
- Transformación de productos (ej. torta entera → porciones)
- Costeo automático de recetas (suma de costo de ingredientes / rendimiento)

**Reglas de Negocio Detectadas:**
- `receta_ingredientes.cantidad` x `insumos.costo` = costo de ingrediente por tanda
- Suma de todos los ingredientes / `recetas.rendimiento` = costo unitario del producto terminado
- Al producir, se deduce la cantidad de insumos de `insumo_stocks` (respetando FIFO) y se incrementa `inventario_stock` de la variante destino
- No se puede producir más de lo que permiten los insumos disponibles
- Los insumos con fecha de vencimiento próxima se consumen primero (FEFO)
- Transformación: deduce stock de variante origen y agrega a variante destino (relación 1:N o N:M)
- Producto tipo `'servicio'` no descuenta inventario ni insumos

**¿Módulo nuevo o extensión?** **Módulo nuevo** — no existe nada similar en Núcleo. Introduce un tipo de inventario nuevo (insumos) separado de productos terminados. Las `recetas` conectan ambos mundos. Requiere nuevas tablas que siguen `BelongsToTenant`.

---

### 3.8 Ventas a Plazos / Installment

**Proyectos fuente:** Modern-POS (PHP nativo), nianva_pos_ropa (PHP nativo, apartados)

**Diferenciación con Apartados de Núcleo:** Núcleo ya tiene `apartados` (layaway: reservar mercancía y pagar en abonos hasta completar). Las ventas a plazos de Modern-POS son diferentes:
- El cliente se lleva el producto inmediatamente
- La deuda se divide en cuotas con intereses
- No hay reserva de inventario (el producto ya se entregó)

**Casos de Uso Principales:**
- Venta de producto de alto valor con pago en cuotas
- Cálculo de interés sobre saldo
- Seguimiento de cuotas pagadas vs. pendientes
- Capital e interés por cuota

**Reglas de Negocio Detectadas:**
- `interes = monto_total * (tasa/100)`
- Cuota = (monto_total + interes) / numero_cuotas
- Al vender a plazos, se descuenta stock normalmente (el producto se entrega)
- Si el cliente no paga una cuota, pasa a estado `'vencida'`

**¿Módulo nuevo o extensión?** Se puede **extender el módulo `planes_pago_cliente` de Núcleo** — ya existe `planes_pago_cliente` y `planes_pago_cliente_cuotas` para financiamiento propio del negocio. Habría que agregar: interés, vinculación a venta específica (`venta_id`), y endpoint para registrar abonos descontando de caja.

---

### 3.9 Nota de Crédito en Devoluciones

**Proyectos fuente:** sistema-ferreteria (Node.js/React)

**Casos de Uso Principales:**
- Al devolver un producto, el reembolso puede ser en efectivo o como nota de crédito
- La nota de crédito es un saldo a favor del cliente para futuras compras
- El cliente puede usar la nota de crédito como método de pago en una venta posterior

**Reglas de Negocio Detectadas:**
- Si `tipo_reembolso = 'efectivo'`, se devuelve el dinero de la caja
- Si `tipo_reembolso = 'nota_credito'`, se crea un saldo a favor del cliente
- El saldo a favor se consume en ventas futuras

**¿Módulo nuevo o extensión?** **Extensión del módulo `devoluciones` existente** — agregar columna `tipo_reembolso ENUM('efectivo','nota_credito')` a `devoluciones` y crear tabla `notas_credito` para seguimiento del saldo. Esto evita crear un módulo independiente.

---

## 4. Stack Tecnológico

### Stack base (no cambia)
- **Backend:** Laravel (el mismo de Núcleo)
- **Frontend:** Angular (el mismo de Núcleo)
- **Base de datos:** MySQL 8 (el mismo de Núcleo)
- **Multi-tenancy:** shared database con `tenant_id` (el mismo de Núcleo)

### Requerimientos de librerías/paquetes para diferenciadores

| Diferenciador | Librería/Paquete Requerido | Compatibilidad con Stack | Notas |
|--------------|---------------------------|------------------------|-------|
| Impresión Térmica | `mike42/escpos-php` o `rawconduit/php-esc-pos` | ✅ Packagist, Laravel-compatible | Para impresión desde servidor. Alternativa: impresión desde el frontend vía WebUSB o API del navegador |
| Gift Cards | Ninguna — lógica pura de negocio | ✅ | Solo tablas + servicios |
| Campañas Email | `laravel/mail` ya incluido en Núcleo | ✅ Ya en stack | Configurar SMTP desde `configuracion_tenant` |
| PWA / Offline | Service Workers (Angular nativo) + Firebase o similar | ⚠️ Requiere investigación | nianva usa Firebase; evaluar si Angular Universal + IndexedDB es suficiente |
| Códigos de Barras | `milon/barcode` (ya usado en MB-POS) o `picqer/php-barcode-generator` (nianva_pos_ropa) | ✅ Packagist | Para etiquetas y tickets |
| Reportes Excel | `maatwebsite/laravel-excel` | ✅ Packagist, popular en Laravel | Ya hay exportación en Núcleo, posiblemente ya incluido |
| PDF | `barryvdh/laravel-dompdf` | ✅ Packagist | Para tickets, cotizaciones |
| Telegram Bot | `irazasyed/telegram-bot-sdk` | ✅ Packagist | Para notificaciones multicanal |
| SMS | `nexmo/laravel` (Vonage) | ✅ Packagist | Gain-POS ya lo usa |

---

## 5. Roadmap — Gaps a Cerrar

> Núcleo ya cubre el POS core, inventario, apartados, devoluciones, caja, promociones, CRM básico, RBAC y multi-tenancy. El roadmap siguiente está ordenado por **impacto de negocio relativo** y **facilidad de integración** sin tocar módulos existentes.

### Prioridad Alta (Fácil integración, alto valor)

| # | Módulo | Dependencia de Núcleo | Esfuerzo Estimado |
|---|--------|----------------------|-------------------|
| 1 | **Cuentas por Cobrar (CxC)** | `ventas` + `clientes` | 2-3 semanas |
| 2 | **Cuentas por Pagar (CxP)** | `compras` + `proveedores` | 1-2 semanas |
| 3 | **Cotizaciones / Presupuestos** | `producto_variantes` + `clientes` | 2-3 semanas |
| 4 | **Extensión CRM (segmentación + interacciones)** | `clientes` (ya existe) | 1 semana |

**Justificación:** Los 4 módulos son extensiones independientes de los módulos existentes de Núcleo. CxC y CxP comparten el mismo patrón (cuenta + abonos). Cotizaciones sigue la misma estructura que ventas pero sin cobro. CRM extiende la tabla `clientes` con columnas nuevas y una tabla de interacciones. Ninguno requiere modificar módulos existentes de Núcleo.

### Prioridad Media (Impacto moderado, integración controlada)

| # | Módulo | Dependencia de Núcleo | Esfuerzo Estimado |
|---|--------|----------------------|-------------------|
| 5 | **Delivery / Pedidos** | `ventas` (futura), `clientes`, nuevo rol `repartidor` | 3-4 semanas |
| 6 | **Gift Cards** | `venta_pagos` (pago mixto), `metodos_pago` | 2 semanas |
| 7 | **Puntos de Fidelidad / Loyalty** | `clientes` (ya existe) | 1-2 semanas |
| 8 | **Nota de Crédito en Devoluciones** | `devoluciones` (ya existe) | 1 semana |

**Justificación:** Delivery introduce un nuevo rol y flujo de estados de pedido. Gift Cards se integran elegantemente al patrón de pago mixto. Loyalty solo agrega columnas a clientes + tabla de transacciones. Nota de Crédito extiende devoluciones con una columna y lógica de saldo a favor.

### Prioridad Baja (Alta complejidad o caso de uso específico)

| # | Módulo | Dependencia de Núcleo | Esfuerzo Estimado |
|---|--------|----------------------|-------------------|
| 9 | **Módulo de Producción / Recetas** | `producto_variantes`, `inventario_stock` | 6-8 semanas |
| 10 | **Ventas a Plazos con Intereses** | `planes_pago_cliente` (ya existe) | 2-3 semanas |
| 11 | **PWA / Offline-first** | Toda la app | 8-12 semanas |
| 12 | **Payroll / Nómina** | `usuarios` | 3-4 semanas |
| 13 | **Préstamos (Loans)** | Contabilidad (no existe en Núcleo) | 3-4 semanas |
| 14 | **Múltiples Unidades de Medida** | `producto_variantes` | 1-2 semanas |

**Justificación:** El módulo de producción es el más complejo (5+ tablas nuevas, un nuevo subsistema de inventario de insumos). Ventas a plazos es relativamente fácil porque reusa `planes_pago_cliente`. PWA requiere reestructurar el frontend Angular. Payroll y Loans están fuera del core POS y tal vez no apliquen a productos horizontales.

---

## Anexo A: Proyecto Freelance-cockpit — Análisis separado

Freelance-cockpit no es un POS, sino un sistema de gestión de proyectos + CRM + helpdesk + facturación. Sus módulos **no compiten con Núcleo** pero algunos podrían ser relevantes como verticales o integraciones:

| Módulo Freelance-cockpit | ¿Relevante para Núcleo? | Observación |
|-------------------------|------------------------|-------------|
| Project Management (tareas, hitos, timesheets) | ❌ No | Específico de agencias/freelancers |
| Helpdesk / Tickets con IMAP | ❌ No | No es un POS |
| Lead pipeline (Kanban CRM) | ⚠️ Parcialmente | El lead CRM podría integrarse a clientes de Núcleo |
| Facturación recurrente (subscriptions) | ⚠️ Parcialmente | Similar a `planes_pago_cliente` pero con recurrencia automática |
| Pasarelas de pago (PayPal, Stripe) | ❌ No | No relevante para POS físico |
| Múltiples idiomas | ❌ No | Ya manejado en Angular |
| Calendario / Eventos | ❌ No | No es POS |

**Recomendación:** Ignorar Freelance-cockpit para el blueprint de Núcleo. Si se requiere un módulo de **leads/oportunidades** en el futuro, evaluar su integración con `clientes` de Núcleo, pero no hay demanda desde los proyectos legacy POS analizados.

---

## Anexo B: Esquemas Fiscales por País — No mezclar

| País | Moneda | Impuesto | Comprobante | Documento Cliente | Factor Clave |
|------|--------|----------|-------------|-------------------|--------------|
| Perú | S/ (PEN) | IGV 18% | Boleta, Factura, Ticket | DNI, RUC, CE | Serie SUNAT: B001, F001 |
| México | $ (MXN) | IVA/IEPS | Factura CFDI, Ticket | RFC | Facturación electrónica CFDI |
| Bangladesh | ৳ (BDT) | GST 15% | Invoice | NID | Asia/Dhaka |
| India | ₹ (INR) | GST (CGST+SGST/IGST) | Invoice | PAN, HSN | GST por estado |
| Singapur | SGD$ | GST 7% | Invoice | NRIC | Asia/Singapore |
| Sri Lanka | Rs. (LKR) | VAT 15% | Invoice | NIC | Asia/Colombo |

**Regla:** Los módulos fiscales y de facturación electrónica de cada país **no se mezclan en el schema común**. Cada producto vertical (instalación de Núcleo) configura su propio esquema de facturación según el país. El schema de Núcleo se mantiene neutral (con campos genéricos como `rfc`, `documento_fiscal` que cada país usa a su manera).

---

*Fin del reporte — 27 Julio 2026*
