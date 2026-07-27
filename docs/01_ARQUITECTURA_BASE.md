# 01 — Arquitectura Base: Tablas y Migraciones Nuevas

> **Basado en:** `nucleo_arquitectura.md` (schema SQL) y `MANUAL_TECNICO.md` (patrones establecidos)
> **Módulos a construir:** CxC, CxP, Cotizaciones, Delivery, Gift Cards, Nota de Crédito, Extensión CRM,
> Producción/Recetas, Ventas a Plazos, Payroll/Nómina, Unidades de Medida, Préstamos

---

## 0. Convenciones generales (las de Núcleo, no se repiten)

- Todas las tablas: `snake_case`, plural, `BIGINT UNSIGNED AUTO_INCREMENT` como PK, MySQL 8, `utf8mb4_unicode_ci`
- Aislamiento multi-tenant: **`BelongsToTenant`** — toda tabla nueva de negocio lleva `tenant_id BIGINT UNSIGNED NOT NULL` con FK a `tenants(id) ON DELETE CASCADE`
- Las tablas que dependen de una entidad que ya pertenece a un tenant usan **`BelongsToTenantViaRelacion`** — el tenant_id se resuelve a través de la FK. No repiten `tenant_id` si ya está a 2+ niveles de distancia.
- Índices `KEY` inline, sin trailing commas, `ENGINE=InnoDB`
- Timestamps: `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`, `updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
- **Sin nueva columna de método de pago en entidades padre** — el patrón `*_pagos` se usa cuando existan pagos mixtos

---

## 1. Feature Gating: configuración por tenant

### Columna nueva en `configuracion_tenant`

```sql
-- Solo si la tabla ya existe en Núcleo; si es migración nueva, agregar a la migración existente
ALTER TABLE configuracion_tenant
    ADD COLUMN modulos_activos JSON NULL COMMENT 'Array de slugs de modulos habilitados para este tenant';
```

**Valor por defecto (JSON):**
```json
["cxc", "cxp", "cotizaciones", "delivery", "gift_cards", "crm_avanzado"]
```

Cada Service en los módulos nuevos debe verificar su slug en este array antes de ejecutar cualquier operación. El middleware `MiddlewareModuloActivo` (ver `03_ESPECIFICACION_BACKEND.md`) centraliza esta verificación.

---

## 2. Módulo: Cuentas por Cobrar (CxC)

### Tablas nuevas

#### `cuentas_cobrar`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| tenant_id | BIGINT UNSIGNED | NOT NULL, FK → tenants(id) ON DELETE CASCADE | BelongsToTenant |
| venta_id | BIGINT UNSIGNED | NOT NULL, FK → ventas(id) ON DELETE RESTRICT | Venta que origina la deuda |
| cliente_id | BIGINT UNSIGNED | NOT NULL, FK → clientes(id) ON DELETE RESTRICT | Deudor |
| monto_total | DECIMAL(10,2) | NOT NULL | Monto original de la deuda |
| saldo_pendiente | DECIMAL(10,2) | NOT NULL | Monto aún no pagado |
| fecha_vencimiento | DATE | NULL | Default: fecha_venta + N días (configurable) |
| estado | ENUM('pendiente','pagada','anulada') | NOT NULL, DEFAULT 'pendiente' | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_cuentas_cobrar_tenant (tenant_id)
  KEY idx_cuentas_cobrar_venta (venta_id)
  KEY idx_cuentas_cobrar_cliente (cliente_id)
  KEY idx_cuentas_cobrar_estado (estado)
```

#### `abonos_cuenta`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| cuenta_cobrar_id | BIGINT UNSIGNED | NOT NULL, FK → cuentas_cobrar(id) ON DELETE CASCADE | |
| caja_sesion_id | BIGINT UNSIGNED | NULL, FK → caja_sesiones(id) ON DELETE SET NULL | Caja donde se recibió |
| usuario_id | BIGINT UNSIGNED | NOT NULL, FK → usuarios(id) ON DELETE RESTRICT | Quien registró |
| monto | DECIMAL(10,2) | NOT NULL | Monto del abono |
| metodo_pago_id | BIGINT UNSIGNED | NOT NULL, FK → metodos_pago(id) ON DELETE RESTRICT | Cómo pagó |
| referencia | VARCHAR(100) | NULL | Nro. transferencia, cheque, etc. |
| fecha | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_abonos_cuenta_cobrar (cuenta_cobrar_id)
  KEY idx_abonos_cuenta_caja (caja_sesion_id)
  KEY idx_abonos_cuenta_usuario (usuario_id)
```

**Patrón de aislamiento:** `BelongsToTenantViaRelacion` — no lleva `tenant_id` porque el tenant se resuelve a través de `cuentas_cobrar.tenant_id`.

---

## 3. Módulo: Cuentas por Pagar (CxP)

### Tablas nuevas

#### `cuentas_pagar`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| tenant_id | BIGINT UNSIGNED | NOT NULL, FK → tenants(id) ON DELETE CASCADE | BelongsToTenant |
| compra_id | BIGINT UNSIGNED | NOT NULL, FK → compras(id) ON DELETE RESTRICT | Compra que origina la deuda |
| proveedor_id | BIGINT UNSIGNED | NOT NULL, FK → proveedores(id) ON DELETE RESTRICT | |
| monto_total | DECIMAL(10,2) | NOT NULL | |
| saldo_pendiente | DECIMAL(10,2) | NOT NULL | |
| fecha_vencimiento | DATE | NULL | |
| estado | ENUM('pendiente','pagada','anulada') | NOT NULL, DEFAULT 'pendiente' | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_cuentas_pagar_tenant (tenant_id)
  KEY idx_cuentas_pagar_compra (compra_id)
  KEY idx_cuentas_pagar_proveedor (proveedor_id)
```

#### `abonos_pagar`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| cuenta_pagar_id | BIGINT UNSIGNED | NOT NULL, FK → cuentas_pagar(id) ON DELETE CASCADE | |
| caja_sesion_id | BIGINT UNSIGNED | NULL, FK → caja_sesiones(id) ON DELETE SET NULL | Caja de donde salió |
| usuario_id | BIGINT UNSIGNED | NOT NULL, FK → usuarios(id) ON DELETE RESTRICT | |
| monto | DECIMAL(10,2) | NOT NULL | |
| metodo_pago_id | BIGINT UNSIGNED | NOT NULL, FK → metodos_pago(id) ON DELETE RESTRICT | |
| referencia | VARCHAR(100) | NULL | |
| fecha | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_abonos_pagar_cuenta (cuenta_pagar_id)
  KEY idx_abonos_pagar_caja (caja_sesion_id)
  KEY idx_abonos_pagar_usuario (usuario_id)
```

**Patrón:** `BelongsToTenantViaRelacion`.

---

## 4. Módulo: Cotizaciones / Presupuestos

### Tablas nuevas

#### `cotizaciones`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| tenant_id | BIGINT UNSIGNED | NOT NULL, FK → tenants(id) ON DELETE CASCADE | |
| sucursal_id | BIGINT UNSIGNED | NOT NULL, FK → sucursales(id) ON DELETE RESTRICT | |
| cliente_id | BIGINT UNSIGNED | NULL, FK → clientes(id) ON DELETE SET NULL | NULL = cotización sin cliente |
| usuario_id | BIGINT UNSIGNED | NOT NULL, FK → usuarios(id) ON DELETE RESTRICT | Quien creó |
| numero_cotizacion | VARCHAR(30) | NOT NULL | Formato configurable COT-000001 |
| total | DECIMAL(10,2) | NOT NULL | |
| descuento | DECIMAL(10,2) | NOT NULL DEFAULT 0 | |
| validez_dias | INT UNSIGNED | NOT NULL DEFAULT 15 | |
| estado | ENUM('pendiente','convertida','vencida','anulada') | NOT NULL DEFAULT 'pendiente' | |
| venta_id | BIGINT UNSIGNED | NULL, FK → ventas(id) ON DELETE SET NULL | Venta generada al convertir |
| observaciones | TEXT | NULL | |
| fecha_vencimiento | DATE | NULL | Se calcula al crear: fecha_creacion + validez_dias |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_cotizaciones_tenant (tenant_id)
  KEY idx_cotizaciones_cliente (cliente_id)
  KEY idx_cotizaciones_venta (venta_id)
  UNIQUE KEY uq_cotizaciones_tenant_numero (tenant_id, numero_cotizacion)
```

#### `cotizacion_detalles`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| cotizacion_id | BIGINT UNSIGNED | NOT NULL, FK → cotizaciones(id) ON DELETE CASCADE | |
| variante_id | BIGINT UNSIGNED | NOT NULL, FK → producto_variantes(id) ON DELETE RESTRICT | |
| cantidad | INT | NOT NULL | |
| precio_unitario | DECIMAL(10,2) | NOT NULL | |
| descuento | DECIMAL(10,2) | NOT NULL DEFAULT 0 | |
| subtotal | DECIMAL(10,2) | NOT NULL | |

```
Índices:
  KEY idx_cotizacion_detalles_cotizacion (cotizacion_id)
  KEY idx_cotizacion_detalles_variante (variante_id)
```

**Regla:** Las cotizaciones **no tienen tabla `*_pagos`** porque no involucran cobro. Tampoco modifican stock. Son solo presupuestos.

---

## 5. Módulo: CRM Avanzado (Extensión del módulo CRM existente)

### Columnas nuevas en `clientes`

```sql
ALTER TABLE clientes
    ADD COLUMN puntos_loyalty           INT NOT NULL DEFAULT 0 COMMENT 'Saldo actual de puntos',
    ADD COLUMN puntos_acumulados        INT NOT NULL DEFAULT 0 COMMENT 'Total historico de puntos ganados',
    ADD COLUMN segmento                 ENUM('nuevo','frecuente','vip','inactivo') NULL COMMENT 'Segmento calculado automaticamente',
    ADD COLUMN fecha_nacimiento         DATE NULL,
    ADD COLUMN notas_crm                TEXT NULL;
```

### Tablas nuevas

#### `crm_interacciones`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| tenant_id | BIGINT UNSIGNED | NOT NULL, FK → tenants(id) ON DELETE CASCADE | |
| cliente_id | BIGINT UNSIGNED | NOT NULL, FK → clientes(id) ON DELETE CASCADE | |
| usuario_id | BIGINT UNSIGNED | NOT NULL, FK → usuarios(id) ON DELETE RESTRICT | Quien registró la interacción |
| tipo | ENUM('llamada','email','whatsapp','nota','visita') | NOT NULL | |
| observacion | TEXT | NOT NULL | |
| fecha | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_crm_interacciones_cliente (cliente_id)
  KEY idx_crm_interacciones_usuario (usuario_id)
```

#### `loyalty_transacciones`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| tenant_id | BIGINT UNSIGNED | NOT NULL, FK → tenants(id) ON DELETE CASCADE | |
| cliente_id | BIGINT UNSIGNED | NOT NULL, FK → clientes(id) ON DELETE CASCADE | |
| tipo | ENUM('ganados','canjeados','vencidos','ajuste') | NOT NULL | |
| puntos | INT | NOT NULL | Positivo = ganados, Negativo = canjeados |
| referencia_tabla | VARCHAR(60) | NULL | 'ventas', 'devoluciones', etc. |
| referencia_id | BIGINT UNSIGNED | NULL | ID del registro origen |
| expira_en | DATE | NULL | Fecha de expiración de los puntos |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_loyalty_transacciones_tenant (tenant_id)
  KEY idx_loyalty_transacciones_cliente (cliente_id)
```

---

## 6. Módulo: Delivery / Pedidos

### Tablas nuevas

#### `pedidos`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| tenant_id | BIGINT UNSIGNED | NOT NULL, FK → tenants(id) ON DELETE CASCADE | |
| sucursal_id | BIGINT UNSIGNED | NOT NULL, FK → sucursales(id) ON DELETE RESTRICT | |
| venta_id | BIGINT UNSIGNED | NULL, FK → ventas(id) ON DELETE SET NULL | Venta vinculada (se genera al completar) |
| cliente_id | BIGINT UNSIGNED | NOT NULL, FK → clientes(id) ON DELETE RESTRICT | |
| usuario_id | BIGINT UNSIGNED | NOT NULL, FK → usuarios(id) ON DELETE RESTRICT | Quien tomó el pedido |
| repartidor_id | BIGINT UNSIGNED | NULL, FK → usuarios(id) ON DELETE SET NULL | Repartidor asignado |
| numero_pedido | VARCHAR(30) | NOT NULL | Formato: PED-000001 |
| direccion_entrega | TEXT | NULL | |
| referencia | VARCHAR(255) | NULL | Puntos de referencia |
| costo_delivery | DECIMAL(10,2) | NOT NULL DEFAULT 0 | |
| estado | ENUM('pendiente','preparando','en_camino','entregado','cancelado') | NOT NULL DEFAULT 'pendiente' | |
| tiempo_estimado | INT UNSIGNED | NULL | Minutos estimados |
| notas | TEXT | NULL | |
| fecha_entrega | DATETIME | NULL | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_pedidos_tenant (tenant_id)
  KEY idx_pedidos_venta (venta_id)
  KEY idx_pedidos_cliente (cliente_id)
  KEY idx_pedidos_repartidor (repartidor_id)
  KEY idx_pedidos_estado (estado)
  UNIQUE KEY uq_pedidos_tenant_numero (tenant_id, numero_pedido)
```

#### `pedido_items` (opcional — si los items se registran antes de crear la venta)

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| pedido_id | BIGINT UNSIGNED | NOT NULL, FK → pedidos(id) ON DELETE CASCADE | |
| variante_id | BIGINT UNSIGNED | NOT NULL, FK → producto_variantes(id) ON DELETE RESTRICT | |
| cantidad | INT | NOT NULL | |
| precio_unitario | DECIMAL(10,2) | NOT NULL | |
| subtotal | DECIMAL(10,2) | NOT NULL | |

```
Índices:
  KEY idx_pedido_items_pedido (pedido_id)
```

> **Decisión:** Si los pedidos se cargan con items desde el POS antes de generar la venta, se usa `pedido_items`. Si los items se registran directamente en `venta_detalles`, esta tabla no se necesita. El diseño la incluye para flexibilidad.

---

## 7. Módulo: Gift Cards / Tarjetas de Regalo

### Tablas nuevas

#### `gift_cards`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| tenant_id | BIGINT UNSIGNED | NOT NULL, FK → tenants(id) ON DELETE CASCADE | |
| cliente_id | BIGINT UNSIGNED | NULL, FK → clientes(id) ON DELETE SET NULL | Propietario (NULL = anónima) |
| codigo | VARCHAR(50) | NOT NULL UNIQUE | Código único de la tarjeta |
| saldo_inicial | DECIMAL(10,2) | NOT NULL | |
| saldo_actual | DECIMAL(10,2) | NOT NULL | Se descuenta con cada uso |
| fecha_expiracion | DATE | NULL | |
| estado | ENUM('activa','usada','expirada','cancelada') | NOT NULL DEFAULT 'activa' | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_gift_cards_tenant (tenant_id)
  KEY idx_gift_cards_cliente (cliente_id)
```

#### `gift_card_recargas`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| gift_card_id | BIGINT UNSIGNED | NOT NULL, FK → gift_cards(id) ON DELETE CASCADE | |
| monto | DECIMAL(10,2) | NOT NULL | |
| usuario_id | BIGINT UNSIGNED | NOT NULL, FK → usuarios(id) ON DELETE RESTRICT | |
| fecha | DATETIME | NOT NULL, DEFAULT CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_gift_card_recargas_card (gift_card_id)
```

**Integración con pagos:** Se agrega un `metodo_pago` de sistema con `tipo='digital'` y nombre `'Gift Card'`. Al pagar con gift card, se descuenta `saldo_actual` de la gift card y se crea un registro en `venta_pagos`. Esto sigue exactamente el patrón de pago mixto documentado en `MANUAL_TECNICO.md §2.1`.

---

## 8. Módulo: Nota de Crédito (Extensión de Devoluciones)

### Columna nueva en `devoluciones`

```sql
ALTER TABLE devoluciones
    ADD COLUMN tipo_reembolso   ENUM('efectivo','nota_credito') NOT NULL DEFAULT 'efectivo'
        COMMENT 'Como se reembolsa al cliente',
    ADD COLUMN nota_credito_id  BIGINT UNSIGNED NULL
        COMMENT 'Si tipo_reembolso=nota_credito, la nota de credito generada';
```

### Tabla nueva

#### `notas_credito`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| tenant_id | BIGINT UNSIGNED | NOT NULL, FK → tenants(id) ON DELETE CASCADE | |
| cliente_id | BIGINT UNSIGNED | NOT NULL, FK → clientes(id) ON DELETE RESTRICT | |
| devolucion_id | BIGINT UNSIGNED | NOT NULL, FK → devoluciones(id) ON DELETE RESTRICT | Devolución que la originó |
| monto_original | DECIMAL(10,2) | NOT NULL | Monto de la nota al crearse |
| saldo_disponible | DECIMAL(10,2) | NOT NULL | Monto aún no usado |
| fecha_expiracion | DATE | NULL | Opcional |
| estado | ENUM('activa','usada_parcial','usada_total','expirada','cancelada') | NOT NULL DEFAULT 'activa' | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_notas_credito_tenant (tenant_id)
  KEY idx_notas_credito_cliente (cliente_id)
  KEY idx_notas_credito_devolucion (devolucion_id)
```

#### `nota_credito_usos` (cuando se consume en una venta)

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| nota_credito_id | BIGINT UNSIGNED | NOT NULL, FK → notas_credito(id) ON DELETE CASCADE | |
| venta_id | BIGINT UNSIGNED | NOT NULL, FK → ventas(id) ON DELETE RESTRICT | Venta donde se usó |
| monto_usado | DECIMAL(10,2) | NOT NULL | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_nota_credito_usos_nota (nota_credito_id)
  KEY idx_nota_credito_usos_venta (venta_id)
```

**Integración con pagos:** Al igual que Gift Card, `nota_credito` será un `metodo_pago` más (tipo `'digital'`). Al pagar con nota de crédito, se descuenta `saldo_disponible` y se registra en `venta_pagos`.

---

## 9. Módulo: Múltiples Unidades de Medida

### Tabla nueva

#### `unidades_medida`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| tenant_id | BIGINT UNSIGNED | NOT NULL, FK → tenants(id) ON DELETE CASCADE | |
| nombre | VARCHAR(50) | NOT NULL | Ej: "Kilogramo", "Unidad", "Balde" |
| abreviatura | VARCHAR(10) | NOT NULL | Ej: "kg", "und", "bal" |
| tipo | ENUM('entero','fraccionario') | NOT NULL DEFAULT 'entero' | Para validar si acepta decimales |
| activo | TINYINT(1) | NOT NULL DEFAULT 1 | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_unidades_medida_tenant (tenant_id)
  UNIQUE KEY uq_unidades_medida_tenant_abrev (tenant_id, abreviatura)
```

### Columna nueva en `producto_variantes`

```sql
ALTER TABLE producto_variantes
    ADD COLUMN unidad_medida_id BIGINT UNSIGNED NULL,
    ADD KEY idx_variantes_unidad (unidad_medida_id),
    ADD CONSTRAINT fk_variantes_unidad FOREIGN KEY (unidad_medida_id) REFERENCES unidades_medida(id) ON DELETE SET NULL;
```

**Seed data (por defecto para nuevos tenants):**
```php
['nombre' => 'Unidad', 'abreviatura' => 'und', 'tipo' => 'entero'],
['nombre' => 'Kilogramo', 'abreviatura' => 'kg', 'tipo' => 'fraccionario'],
['nombre' => 'Litro', 'abreviatura' => 'l', 'tipo' => 'fraccionario'],
['nombre' => 'Metro', 'abreviatura' => 'm', 'tipo' => 'fraccionario'],
['nombre' => 'Balde', 'abreviatura' => 'bal', 'tipo' => 'entero'],
['nombre' => 'Bolsa', 'abreviatura' => 'bol', 'tipo' => 'entero'],
['nombre' => 'Caja', 'abreviatura' => 'cja', 'tipo' => 'entero'],
['nombre' => 'Rollo', 'abreviatura' => 'rol', 'tipo' => 'entero'],
['nombre' => 'Par', 'abreviatura' => 'par', 'tipo' => 'entero'],
['nombre' => 'Pliego', 'abreviatura' => 'pli', 'tipo' => 'entero'],
['nombre' => 'Varilla', 'abreviatura' => 'var', 'tipo' => 'entero'],
['nombre' => 'Tubo', 'abreviatura' => 'tbo', 'tipo' => 'entero'],
```

---

## 10. Módulo: Producción / Recetas (Panadería, Cocina, Manufactura)

### Tablas nuevas

#### `insumos`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| tenant_id | BIGINT UNSIGNED | NOT NULL, FK → tenants(id) ON DELETE CASCADE | |
| nombre | VARCHAR(200) | NOT NULL | |
| sku | VARCHAR(50) | NULL, UNIQUE | Código interno del insumo |
| unidad_medida_id | BIGINT UNSIGNED | NOT NULL, FK → unidades_medida(id) ON DELETE RESTRICT | |
| costo | DECIMAL(10,4) | NOT NULL DEFAULT 0 | Costo unitario actual |
| stock_minimo | DECIMAL(10,2) | NOT NULL DEFAULT 0 | Para alertas |
| activo | TINYINT(1) | NOT NULL DEFAULT 1 | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_insumos_tenant (tenant_id)
  KEY idx_insumos_unidad (unidad_medida_id)
```

#### `insumo_stocks`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| insumo_id | BIGINT UNSIGNED | NOT NULL, FK → insumos(id) ON DELETE CASCADE | |
| sucursal_id | BIGINT UNSIGNED | NOT NULL, FK → sucursales(id) ON DELETE CASCADE | |
| cantidad | DECIMAL(10,4) | NOT NULL DEFAULT 0 | |
| lote | VARCHAR(50) | NULL | Número de lote |
| fecha_vencimiento | DATE | NULL | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_insumo_stocks_insumo (insumo_id)
  KEY idx_insumo_stocks_sucursal (sucursal_id)
  UNIQUE KEY uq_insumo_stock_sucursal_lote (insumo_id, sucursal_id, lote)
```

#### `recetas`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| tenant_id | BIGINT UNSIGNED | NOT NULL, FK → tenants(id) ON DELETE CASCADE | |
| variante_id | BIGINT UNSIGNED | NOT NULL, FK → producto_variantes(id) ON DELETE RESTRICT | Producto terminado que produce |
| nombre | VARCHAR(200) | NOT NULL | |
| descripcion | TEXT | NULL | |
| instrucciones | TEXT | NULL | |
| rendimiento | DECIMAL(10,2) | NOT NULL DEFAULT 1 | Unidades que produce por tanda |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_recetas_tenant (tenant_id)
  KEY idx_recetas_variante (variante_id)
```

#### `receta_ingredientes`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| receta_id | BIGINT UNSIGNED | NOT NULL, FK → recetas(id) ON DELETE CASCADE | |
| insumo_id | BIGINT UNSIGNED | NOT NULL, FK → insumos(id) ON DELETE RESTRICT | |
| cantidad | DECIMAL(10,4) | NOT NULL | Cantidad necesaria |
| unidad_medida_id | BIGINT UNSIGNED | NOT NULL, FK → unidades_medida(id) ON DELETE RESTRICT | Ej: "g", "kg", "ml" |

```
Índices:
  KEY idx_receta_ingredientes_receta (receta_id)
  KEY idx_receta_ingredientes_insumo (insumo_id)
```

#### `ordenes_produccion`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| tenant_id | BIGINT UNSIGNED | NOT NULL, FK → tenants(id) ON DELETE CASCADE | |
| sucursal_id | BIGINT UNSIGNED | NOT NULL, FK → sucursales(id) ON DELETE RESTRICT | |
| receta_id | BIGINT UNSIGNED | NOT NULL, FK → recetas(id) ON DELETE RESTRICT | |
| usuario_id | BIGINT UNSIGNED | NOT NULL, FK → usuarios(id) ON DELETE RESTRICT | Quien ordena/produce |
| cantidad_programada | INT | NOT NULL | Unidades a producir |
| cantidad_producida | INT | NULL | Unidades realmente producidas |
| estado | ENUM('pendiente','en_proceso','completada','cancelada') | NOT NULL DEFAULT 'pendiente' | |
| notas | TEXT | NULL | |
| fecha_programada | DATE | NULL | |
| fecha_completada | DATETIME | NULL | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_ordenes_produccion_tenant (tenant_id)
  KEY idx_ordenes_produccion_sucursal (sucursal_id)
  KEY idx_ordenes_produccion_receta (receta_id)
  KEY idx_ordenes_produccion_usuario (usuario_id)
```

#### `transformaciones_producto` (conversión entre variantes)

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| tenant_id | BIGINT UNSIGNED | NOT NULL, FK → tenants(id) ON DELETE CASCADE | |
| sucursal_id | BIGINT UNSIGNED | NOT NULL, FK → sucursales(id) ON DELETE RESTRICT | |
| variante_origen_id | BIGINT UNSIGNED | NOT NULL, FK → producto_variantes(id) ON DELETE RESTRICT | |
| variante_destino_id | BIGINT UNSIGNED | NOT NULL, FK → producto_variantes(id) ON DELETE RESTRICT | |
| cantidad_origen | DECIMAL(10,2) | NOT NULL | Cuánto se resta de origen |
| cantidad_destino | DECIMAL(10,2) | NOT NULL | Cuánto se suma a destino |
| usuario_id | BIGINT UNSIGNED | NOT NULL, FK → usuarios(id) ON DELETE RESTRICT | |
| notas | TEXT | NULL | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_transformaciones_tenant (tenant_id)
  KEY idx_transformaciones_origen (variante_origen_id)
  KEY idx_transformaciones_destino (variante_destino_id)
```

**Reglas de dominio:**
- Los insumos son **entidades separadas** de productos. No se venden directamente (en la mayoría de casos), tienen unidades fraccionarias y control de lote/vencimiento.
- Al completar una orden de producción: se deducen los ingredientes de `insumo_stocks` (FIFO/FEFO) y se incrementa `inventario_stock` de la variante destino.
- `receta_ingredientes.cantidad` × `insumos.costo` / `recetas.rendimiento` = costo unitario del producto terminado.
- Transformación: deduce stock de origen y agrega a destino, sin pasar por receta ni insumos.

---

## 11. Módulo: Ventas a Plazos con Intereses (Installment)

### Extensiones a tablas existentes de Núcleo

```sql
-- Extiende planes_pago_cliente (módulo CRM existente)
ALTER TABLE planes_pago_cliente
    ADD COLUMN venta_id             BIGINT UNSIGNED NULL COMMENT 'Venta que origina el plan',
    ADD COLUMN interes_total        DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN tasa_interes         DECIMAL(5,2) NULL COMMENT 'Tasa de interes porcentual ej: 5.00 = 5%',
    ADD COLUMN numero_cuotas        INT UNSIGNED NOT NULL DEFAULT 1,
    ADD COLUMN periodicidad         ENUM('semanal','quincenal','mensual') NOT NULL DEFAULT 'mensual',
    ADD KEY idx_planes_pago_venta (venta_id),
    ADD CONSTRAINT fk_planes_pago_venta FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE SET NULL;

-- Extiende planes_pago_cliente_cuotas
ALTER TABLE planes_pago_cliente_cuotas
    ADD COLUMN monto_interes        DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Porcion de interes en esta cuota',
    ADD COLUMN monto_capital        DECIMAL(10,2) NOT NULL DEFAULT 0 COMMENT 'Porcion de capital en esta cuota',
    ADD COLUMN fecha_pago_real      DATETIME NULL;
```

**0 tablas nuevas** — todo es extensión de columnas sobre el modelo existente de Núcleo. El módulo CRM ya tiene `planes_pago_cliente` y `planes_pago_cliente_cuotas` diseñados para financiamiento. Solo se agregan campos de interés y vinculación a venta.

**Reglas de dominio:**
- A diferencia de `apartados` (layaway: se reserva mercancía, no se entrega hasta liquidar), en ventas a plazos el producto **se entrega inmediatamente** y la deuda se divide en cuotas con interés.
- Capital por cuota = `monto_total / numero_cuotas`
- Interés por cuota = `interes_total / numero_cuotas`
- Al registrar pago de cuota: se actualiza `fecha_pago_real` en la cuota y se recalcula `estado` del plan.

---

## 12. Módulo: Payroll / Nómina

### Tablas nuevas

#### `empleados` (extiende `usuarios` con datos laborales)

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| tenant_id | BIGINT UNSIGNED | NOT NULL, FK → tenants(id) ON DELETE CASCADE | |
| usuario_id | BIGINT UNSIGNED | NOT NULL, FK → usuarios(id) ON DELETE CASCADE, UNIQUE | 1 empleado = 1 usuario |
| sucursal_id | BIGINT UNSIGNED | NOT NULL, FK → sucursales(id) ON DELETE RESTRICT | |
| salario_base | DECIMAL(10,2) | NOT NULL DEFAULT 0 | |
| tipo_salario | ENUM('fijo','por_hora') | NOT NULL DEFAULT 'fijo' | |
| fecha_ingreso | DATE | NULL | |
| numero_seguridad_social | VARCHAR(30) | NULL | IMSS, ISSSTE, etc. |
| activo | TINYINT(1) | NOT NULL DEFAULT 1 | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_empleados_tenant (tenant_id)
  KEY idx_empleados_sucursal (sucursal_id)
```

#### `nominas`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| tenant_id | BIGINT UNSIGNED | NOT NULL, FK → tenants(id) ON DELETE CASCADE | |
| sucursal_id | BIGINT UNSIGNED | NOT NULL, FK → sucursales(id) ON DELETE RESTRICT | |
| periodo_inicio | DATE | NOT NULL | |
| periodo_fin | DATE | NOT NULL | |
| total_percepciones | DECIMAL(10,2) | NOT NULL DEFAULT 0 | |
| total_deducciones | DECIMAL(10,2) | NOT NULL DEFAULT 0 | |
| total_neto | DECIMAL(10,2) | NOT NULL DEFAULT 0 | |
| estado | ENUM('calculada','pagada','cancelada') | NOT NULL DEFAULT 'calculada' | |
| fecha_pago | DATE | NULL | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_nominas_tenant (tenant_id)
  KEY idx_nominas_sucursal (sucursal_id)
```

#### `nomina_detalles`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| nomina_id | BIGINT UNSIGNED | NOT NULL, FK → nominas(id) ON DELETE CASCADE | |
| empleado_id | BIGINT UNSIGNED | NOT NULL, FK → empleados(id) ON DELETE RESTRICT | |
| salario_base | DECIMAL(10,2) | NOT NULL | |
| dias_trabajados | INT | NOT NULL DEFAULT 0 | |
| percepciones | DECIMAL(10,2) | NOT NULL DEFAULT 0 | Sueldo + bonos + comisiones |
| deducciones | DECIMAL(10,2) | NOT NULL DEFAULT 0 | ISR, IMSS, prestamos |
| neto | DECIMAL(10,2) | NOT NULL DEFAULT 0 | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_nomina_detalles_nomina (nomina_id)
  KEY idx_nomina_detalles_empleado (empleado_id)
```

---

## 13. Módulo: Préstamos (Loans)

### Tablas nuevas

#### `prestamos`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| tenant_id | BIGINT UNSIGNED | NOT NULL, FK → tenants(id) ON DELETE CASCADE | |
| proveedor_id | BIGINT UNSIGNED | NULL, FK → proveedores(id) ON DELETE SET NULL | De quién se recibió |
| referencia | VARCHAR(100) | NULL | Nombre de persona o entidad |
| monto | DECIMAL(10,2) | NOT NULL | |
| interes | DECIMAL(5,2) | NOT NULL DEFAULT 0 | Tasa de interés % |
| monto_a_pagar | DECIMAL(10,2) | NOT NULL | Monto + intereses |
| saldo_pendiente | DECIMAL(10,2) | NOT NULL | |
| fecha_prestamo | DATE | NOT NULL | |
| fecha_vencimiento | DATE | NULL | |
| estado | ENUM('activo','pagado','cancelado') | NOT NULL DEFAULT 'activo' | |
| notas | TEXT | NULL | |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | DATETIME | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | |

```
Índices:
  KEY idx_prestamos_tenant (tenant_id)
  KEY idx_prestamos_proveedor (proveedor_id)
```

#### `prestamo_pagos`

| Columna | Tipo | Restricciones | Notas |
|---------|------|--------------|-------|
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | |
| prestamo_id | BIGINT UNSIGNED | NOT NULL, FK → prestamos(id) ON DELETE CASCADE | |
| caja_sesion_id | BIGINT UNSIGNED | NULL, FK → caja_sesiones(id) ON DELETE SET NULL | |
| monto | DECIMAL(10,2) | NOT NULL | |
| fecha | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | |
| notas | TEXT | NULL | |

```
Índices:
  KEY idx_prestamo_pagos_prestamo (prestamo_id)
  KEY idx_prestamo_pagos_caja (caja_sesion_id)
```

---

## 14. Esquema Fiscal México (todas las entidades que apliquen)

### Columnas nuevas en `clientes`

```sql
ALTER TABLE clientes
    ADD COLUMN rfc                VARCHAR(13) NULL COMMENT 'Registro Federal de Contribuyentes MX',
    ADD COLUMN regimen_fiscal     VARCHAR(10) NULL COMMENT 'Catalogo SAT: 601=General, 605=Sueldos, etc.',
    ADD COLUMN uso_cfdi           VARCHAR(10) NULL COMMENT 'Catalogo SAT: G01=Adquisicion, G03=Gastos, etc.';
```

### Columnas nuevas en `ventas`

```sql
ALTER TABLE ventas
    ADD COLUMN serie_cfdi         VARCHAR(10) NULL COMMENT 'Serie del CFDI (F, B, etc.)',
    ADD COLUMN folio_cfdi         INT UNSIGNED NULL COMMENT 'Folio del CFDI',
    ADD COLUMN forma_pago_sat     VARCHAR(10) NULL COMMENT 'Catalogo SAT: 01=Efectivo, 03=Transferencia, etc.',
    ADD COLUMN metodo_pago_sat    VARCHAR(10) NULL COMMENT 'Catalogo SAT: PUE=Pago unico, PPD=Pago diferido',
    ADD COLUMN uso_cfdi           VARCHAR(10) NULL COMMENT 'Catalogo SAT uso del CFDI';
```

### Columnas nuevas en `cotizaciones`

```sql
ALTER TABLE cotizaciones
    ADD COLUMN uso_cfdi           VARCHAR(10) NULL COMMENT 'Misma logica que ventas, para pre-llenar al convertir';
```

### Catálogo inicial de métodos de pago SAT (seeder)

El seeder `NucleoRolesPermisosSeeder` se extiende con los siguientes metodos de pago que cumplen con la nomenclatura SAT:

| Nombre | tipo | Nota SAT |
|--------|------|----------|
| Efectivo | `efectivo` | 01 |
| Tarjeta Débito | `tarjeta` | 28 |
| Tarjeta Crédito | `tarjeta` | 04 |
| Transferencia | `transferencia` | 03 |
| Cheque | `otro` | 02 |
| Gift Card | `digital` | — |
| Nota de Crédito | `digital` | — |
| Yape / Plin | `digital` | — |

> El facturador CFDI **no se construye ahora**. Solo se deja el modelo de datos preparado: `serie_cfdi`, `folio_cfdi`, `forma_pago_sat`, `metodo_pago_sat`, `uso_cfdi`. Cuando se integre un PAC (FacturAPI, SW SAPS, etc.), estos campos alimentarán el XML del CFDI.

---

## 15. Estrategia de Seeders (solo lo nuevo)

### Permisos nuevos (en `NucleoRolesPermisosSeeder::PERMISOS`)

```php
// Modulo: CxC
'cuentas_cobrar.ver',
'cuentas_cobrar.crear',    // desde venta a credito
'cuentas_cobrar.registrar_abono',
'cuentas_cobrar.anular',
// Modulo: CxP
'cuentas_pagar.ver',
'cuentas_pagar.registrar_pago',
// Modulo: Cotizaciones
'cotizaciones.ver',
'cotizaciones.crear',
'cotizaciones.editar',
'cotizaciones.eliminar',
'cotizaciones.convertir',  // convertir cotizacion en venta
// Modulo: Delivery
'pedidos.ver',
'pedidos.crear',
'pedidos.cambiar_estado',
'pedidos.asignar_repartidor',
// Modulo: Gift Cards
'gift_cards.ver',
'gift_cards.emitir',
'gift_cards.recargar',
'gift_cards.cancelar',
// Modulo: Nota Credito
'notas_credito.ver',
// Modulo: CRM Avanzado
'crm.interacciones.ver',
'crm.interacciones.crear',
'crm.campanas.enviar',
// Modulo: Loyalty
'loyalty.ver',
'loyalty.ajustar',
// Modulo: Reportes nuevos
'reportes.cuentas_cobrar',
'reportes.cuentas_pagar',
'reportes.crm',
```

### Seeder de `metodos_pago` (addendum)

Se agregan al seeder existente o se crea `MetodosPagoMexicoSeeder` con:

```php
['nombre' => 'Gift Card', 'tipo' => 'digital', 'incluir_en_financiero' => 0, 'tenant_id' => null],
['nombre' => 'Nota de Crédito', 'tipo' => 'digital', 'incluir_en_financiero' => 0, 'tenant_id' => null],
['nombre' => 'Yape / Plin', 'tipo' => 'digital', 'incluir_en_financiero' => 0, 'tenant_id' => null],
['nombre' => 'Cheque', 'tipo' => 'otro', 'incluir_en_financiero' => 1, 'tenant_id' => null],
```

### Data de prueba (DesarrolloSeeder)

El `DesarrolloSeeder` se extiende para crear datos demo de cada módulo nuevo: CxC asociadas a ventas demo, cotizaciones, pedidos en varios estados, gift cards con saldo, etc.

---

## 15. Resumen de Tablas Nuevas

| Módulo | Tablas Nuevas | Tablas Extendidas | Total Nuevas |
|--------|--------------|-------------------|-------------|
| Feature Gating | — | `configuracion_tenant` +1 col | — |
| CxC | `cuentas_cobrar`, `abonos_cuenta` | — | 2 |
| CxP | `cuentas_pagar`, `abonos_pagar` | — | 2 |
| Cotizaciones | `cotizaciones`, `cotizacion_detalles` | — | 2 |
| CRM Avanzado | `crm_interacciones`, `loyalty_transacciones` | `clientes` +5 cols | 2 |
| Delivery | `pedidos`, `pedido_items` | — | 2 |
| Gift Cards | `gift_cards`, `gift_card_recargas` | — | 2 |
| Nota de Crédito | `notas_credito`, `nota_credito_usos` | `devoluciones` +2 cols | 2 |
| Unidades Medida | `unidades_medida` | `producto_variantes` +1 col | 1 |
| Producción | `insumos`, `insumo_stocks`, `recetas`, `receta_ingredientes`, `ordenes_produccion`, `transformaciones_producto` | — | 6 |
| Ventas a Plazos | — | `planes_pago_cliente` +6 cols, `planes_pago_cliente_cuotas` +3 cols | 0 |
| Payroll | `empleados`, `nominas`, `nomina_detalles` | — | 3 |
| Préstamos | `prestamos`, `prestamo_pagos` | — | 2 |
| Fiscal MX | — | `clientes` +3 cols, `ventas` +5 cols, `cotizaciones` +1 col | — |
| **Total** | **26 tablas nuevas** | **12 tablas existentes modificadas** | **26** |

Orden topológico sugerido para migraciones:
1. `clientes` (alter: columnas CRM + fiscal MX)
2. `devoluciones` (alter: tipo_reembolso, nota_credito_id)
3. `ventas` (alter: columnas fiscal MX)
4. `producto_variantes` (alter: unidad_medida_id)
5. `planes_pago_cliente` / `planes_pago_cliente_cuotas` (alter: columnas ventas a plazos)
6. `cotizaciones` (alter: uso_cfdi)
7. `configuracion_tenant` (alter: modulos_activos)
8. `unidades_medida` (catálogo, sin dependencias)
9. Tablas nuevas de los módulos principales: `cuentas_cobrar`, `cuentas_pagar`, `cotizaciones`, `pedidos`, `gift_cards`, `notas_credito`, `crm_interacciones`, `loyalty_transacciones`, `empleados`, `prestamos`
10. `insumos`, `recetas` (dependen de unidades_medida y producto_variantes)
11. `abonos_*`, `cotizacion_detalles`, `pedido_items`, `nomina_detalles`, `receta_ingredientes`, `insumo_stocks`, `ordenes_produccion`, `transformaciones_producto`, `prestamo_pagos`, `nota_credito_usos`, `gift_card_recargas`, `nomina_detalles` (dependen de sus cabeceras)

---

*Fin de 01_ARQUITECTURA_BASE.md*
