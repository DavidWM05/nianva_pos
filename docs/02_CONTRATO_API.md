# 02 — Contrato de API: Endpoints Nuevos

> **Basado en:** `MANUAL_TECNICO.md` §2.5 (esquema `error_code`) y estructura de respuestas de Núcleo
> **No se redefine:** formato de respuesta, autenticación, paginación, manejo de errores HTTP genéricos.
> **No se repite:** el estándar de respuestas JSON ya establecido en Núcleo.

---

## 0. Estándar de Respuesta (el de Núcleo, citado, no redefinido)

Toda respuesta sigue el mismo formato ya usado en Núcleo:

```json
// 200 Éxito (colección)
{
  "data": [ ... ],
  "meta": {
    "current_page": 1,
    "per_page": 15,
    "total": 42,
    "last_page": 3
  }
}

// 200 Éxito (recurso individual)
{
  "data": { ... }
}

// 422 Error de negocio
{
  "message": "El cliente tiene un saldo pendiente mayor al monto del abono",
  "error_code": "abono_excede_saldo",
  "saldo_pendiente": 1500.00,
  "monto_abono": 2000.00
}

// 403 Módulo no activo para este tenant
{
  "message": "El módulo de Cuentas por Cobrar no está activo para este tenant",
  "error_code": "modulo_no_activo"
}
```

Los `error_code` son **estables en snake_case**. El frontend distingue el error por `error_code`, nunca parseando `message`. (Ver MANUAL_TECNICO §2.5 — las 10 excepciones mapeadas hoy.)

---

## 1. Middleware de Feature Gating

Todas las rutas de módulos nuevos se agrupan bajo un middleware `modulo:slug` que verifica si el slug del módulo está en `configuracion_tenant.modulos_activos`.

```
Route::middleware(['auth:sanctum', 'modulo:cxc'])->group(function () {
    // rutas de CxC
});
```

Si el módulo no está activo, responde `403` con `error_code: "modulo_no_activo"`.

---

## 2. Módulo CxC — Cuentas por Cobrar

### Permiso base: `cuentas_cobrar.ver`

#### `GET /api/cuentas-cobrar`
Lista paginada de cuentas por cobrar.

| Query Param | Tipo | Default | Descripción |
|------------|------|---------|-------------|
| `estado` | string | — | Filtrar por estado: `pendiente`, `pagada`, `anulada` |
| `cliente_id` | int | — | Filtrar por cliente |
| `vencidas` | bool | false | Solo cuentas con `fecha_vencimiento < today` y `estado=pendiente` |
| `search` | string | — | Búsqueda por nombre de cliente |
| `per_page` | int | 15 | |

**Response `data`** incluye:
```json
{
  "id": 1,
  "venta_id": 42,
  "cliente": { "id": 5, "nombre": "Juan Pérez", "rfc": "JUPE800101..." },
  "monto_total": 2500.00,
  "saldo_pendiente": 1500.00,
  "fecha_vencimiento": "2026-08-15",
  "estado": "pendiente",
  "created_at": "2026-07-27T10:00:00",
  "dias_vencida": 0
}
```

#### `GET /api/cuentas-cobrar/{id}`
Detalle de una cuenta + sus abonos.

```json
{
  "data": {
    "id": 1,
    "venta": { "id": 42, "total": 2500.00, "fecha": "..." },
    "cliente": { ... },
    "monto_total": 2500.00,
    "saldo_pendiente": 1500.00,
    "estado": "pendiente",
    "abonos": [
      { "id": 1, "monto": 1000.00, "fecha": "...", "metodo_pago": "Efectivo" }
    ],
    "created_at": "..."
  }
}
```

#### `POST /api/cuentas-cobrar/{id}/abonos`
Registrar un abono. **Permiso:** `cuentas_cobrar.registrar_abono`

```json
{
  "monto": 500.00,
  "metodo_pago_id": 1,
  "caja_sesion_id": 5,
  "referencia": null
}
```

| Código | Campo | Regla |
|--------|-------|-------|
| 422 | `abono_excede_saldo` | `monto > saldo_pendiente` |
| 422 | `cuenta_ya_pagada` | `estado = pagada` |
| 422 | `cuenta_anulada` | `estado = anulada` |
| 422 | `caja_no_abierta` | No hay caja activa para el usuario (reusa error existente) |

**Response 200:**
```json
{
  "data": {
    "abono": { "id": 2, "monto": 500.00, "saldo_restante": 1000.00 },
    "cuenta": { "id": 1, "saldo_pendiente": 1000.00, "estado": "pendiente" }
  },
  "message": "Abono registrado correctamente"
}
```

#### `POST /api/cuentas-cobrar/{id}/anular`
Anular una CxC (por ejemplo, si se anula la venta original). **Permiso:** `cuentas_cobrar.anular`

| Código | Condición |
|--------|-----------|
| 422 | `cuenta_con_abonos` — tiene abonos registrados, no se puede anular |

---

## 3. Módulo CxP — Cuentas por Pagar

### Permiso base: `cuentas_pagar.ver`

#### `GET /api/cuentas-pagar`
Misma estructura que CxC pero con `proveedor_id` en vez de `cliente_id`.

Query params: `estado`, `proveedor_id`, `search`, `per_page`.

#### `GET /api/cuentas-pagar/{id}`
Detalle + pagos realizados.

#### `POST /api/cuentas-pagar/{id}/pagos`
Registrar pago a proveedor. **Permiso:** `cuentas_pagar.registrar_pago`

```json
{
  "monto": 5000.00,
  "metodo_pago_id": 3,
  "caja_sesion_id": 5,
  "referencia": "TRF-2026-001"
}
```

Mismos `error_code` que abonos de CxC: `pago_excede_saldo`, `cuenta_ya_pagada`, `cuenta_anulada`, `caja_no_abierta`.

---

## 4. Módulo Cotizaciones

### Permiso base: `cotizaciones.ver`

#### `GET /api/cotizaciones`
Lista paginada.

| Query | Tipo | Descripción |
|-------|------|-------------|
| `estado` | string | `pendiente`, `convertida`, `vencida`, `anulada` |
| `cliente_id` | int | |
| `desde` | date | Fecha creación desde |
| `hasta` | date | Fecha creación hasta |
| `search` | string | Buscar por número o cliente |

#### `POST /api/cotizaciones`
Crear cotización. **Permiso:** `cotizaciones.crear`

```json
{
  "cliente_id": 5,
  "sucursal_id": 1,
  "validez_dias": 15,
  "descuento": 0,
  "uso_cfdi": "G01",
  "observaciones": "Cotización para evento corporativo",
  "items": [
    { "variante_id": 10, "cantidad": 5, "precio_unitario": 150.00, "descuento": 0 },
    { "variante_id": 15, "cantidad": 2, "precio_unitario": 300.00, "descuento": 50.00 }
  ]
}
```

**Reglas:**
- `numero_cotizacion` se genera automáticamente con formato `COT-{correlativo}` (configurable por tenant)
- `fecha_vencimiento = fecha_creacion + validez_dias`
- **No modifica stock** (a diferencia de ventas)
- `cliente_id` puede ser null (cotización sin cliente)

| Código | Condición |
|--------|-----------|
| 422 | `variante_no_existe` |
| 422 | `variante_inactiva` |
| 422 | `cantidad_invalida` — si cantidad ≤ 0 |
| 422 | `cliente_inactivo` |

#### `GET /api/cotizaciones/{id}`
Detalle completo + items.

#### `PUT /api/cotizaciones/{id}`
Editar cotización. **Permiso:** `cotizaciones.editar`

Solo si `estado = pendiente`. Mismas validaciones que POST.

| Código | Condición |
|--------|-----------|
| 422 | `cotizacion_no_editable` — estado no es `pendiente` |

#### `DELETE /api/cotizaciones/{id}`
Solo si `estado = pendiente`. Marca como `anulada`, no borra físicamente.

| Código | Condición |
|--------|-----------|
| 422 | `cotizacion_no_anulable` — ya está convertida o vencida |

#### `POST /api/cotizaciones/{id}/convertir`
Convertir cotización en venta. **Permiso:** `cotizaciones.convertir`

```json
{
  "forma_pago": "efectivo",
  "metodo_pago_id": 1,
  "monto_recibido": 1750.00,
  "caja_sesion_id": 5
}
```

**Proceso:**
1. Crea una venta con los mismos items de la cotización (precios del momento de la cotización)
2. Descuenta stock normalmente
3. Marca `cotizacion.estado = 'convertida'`, vincula `cotizacion.venta_id`
4. Devuelve la venta creada como `venta_id`

| Código | Condición |
|--------|-----------|
| 422 | `cotizacion_vencida` — `fecha_vencimiento < today` |
| 422 | `cotizacion_ya_convertida` |
| 422 | `stock_insuficiente` — reusa error existente de Núcleo |
| 422 | `sin_cliente` — cotización sin cliente no puede convertirse |

---

## 5. Módulo CRM Avanzado (Extensiones)

### Permiso base por sub-modulo

#### `GET /api/clientes/{id}/interacciones`
Lista de interacciones CRM de un cliente. **Permiso:** `crm.interacciones.ver`

#### `POST /api/clientes/{id}/interacciones`
Crear interacción. **Permiso:** `crm.interacciones.crear`

```json
{
  "tipo": "llamada",
  "observacion": "Cliente llamó para preguntar por estado de su pedido"
}
```

#### `GET /api/clientes/{id}/loyalty`
Historial de puntos de fidelidad del cliente. **Permiso:** `loyalty.ver`

```json
{
  "data": {
    "cliente": { "id": 5, "nombre": "Juan Pérez" },
    "puntos_loyalty": 350,
    "puntos_acumulados": 1200,
    "historial": [
      { "tipo": "ganados", "puntos": 100, "referencia": "Venta #42", "fecha": "..." }
    ]
  }
}
```

#### `POST /api/clientes/{id}/loyalty/ajustar`
Ajuste manual de puntos. **Permiso:** `loyalty.ajustar`

```json
{
  "puntos": -50,
  "motivo": "Ajuste por devolución"
}
```

#### `POST /api/crm/campanas/enviar`
Enviar campaña por email a un segmento. **Permiso:** `crm.campanas.enviar`

```json
{
  "segmento": "vip",
  "asunto": "Oferta especial para clientes VIP",
  "mensaje": "Hola {{nombre}}, tenemos un 20% de descuento...",
  "enviar_a": "todos"
}
```

**Reglas:**
- `segmento` puede ser: `todos`, `nuevo`, `frecuente`, `vip`, `inactivo`
- O `cliente_ids: [5, 8, 12]` para selección manual
- El envío se hace con el `Mail` de Laravel (SMTP configurado en `configuracion_tenant`)
- Se registra una interacción por cada cliente en `crm_interacciones`

---

## 6. Módulo Delivery / Pedidos

### Permiso base: `pedidos.ver`

#### `GET /api/pedidos`
Lista paginada.

| Query | Tipo | Descripción |
|-------|------|-------------|
| `estado` | string | `pendiente`, `preparando`, `en_camino`, `entregado`, `cancelado` |
| `repartidor_id` | int | |
| `cliente_id` | int | |
| `desde` | date | |
| `search` | string | Por número de pedido |

#### `POST /api/pedidos`
Crear pedido. **Permiso:** `pedidos.crear`

```json
{
  "sucursal_id": 1,
  "cliente_id": 5,
  "direccion_entrega": "Av. Siempre Viva 123",
  "referencia": "Casa blanca, portón negro",
  "costo_delivery": 5.00,
  "tiempo_estimado": 30,
  "notas": "Sin cebolla",
  "items": [
    { "variante_id": 10, "cantidad": 2, "precio_unitario": 150.00 }
  ]
}
```

**Reglas:**
- Si `venta_id = null`, el pedido existe sin venta (pago contra entrega)
- Si se proporcionan `items`, se guardan en `pedido_items`
- El pedido se crea en estado `pendiente`
- `numero_pedido` se auto-genera: `PED-{correlativo}`

#### `PATCH /api/pedidos/{id}/estado`
Cambiar estado del pedido. **Permiso:** `pedidos.cambiar_estado`

```json
{
  "estado": "preparando"
}
```

**Máquina de estados permitida:**
```
pendiente → preparando → en_camino → entregado
cualquier_estado → cancelado
```

| Código | Condición |
|--------|-----------|
| 422 | `transicion_estado_invalida` — ej. de `pendiente` a `entregado` sin pasar por `en_camino` |

#### `PATCH /api/pedidos/{id}/repartidor`
Asignar repartidor. **Permiso:** `pedidos.asignar_repartidor`

```json
{
  "repartidor_id": 8
}
```

| Código | Condición |
|--------|-----------|
| 422 | `repartidor_no_existe` |
| 422 | `repartidor_no_activo` |

---

## 7. Módulo Gift Cards

### Permiso base: `gift_cards.ver`

#### `GET /api/gift-cards`
Lista paginada.

| Query | Descripción |
|-------|-------------|
| `cliente_id` | Filtrar por propietario |
| `estado` | `activa`, `usada`, `expirada`, `cancelada` |
| `search` | Por código |

#### `POST /api/gift-cards`
Emitir tarjeta de regalo. **Permiso:** `gift_cards.emitir`

```json
{
  "cliente_id": 5,
  "monto": 500.00,
  "fecha_expiracion": "2027-01-01"
}
```

| Código | Condición |
|--------|-----------|
| 422 | `monto_invalido` — monto ≤ 0 |

El `codigo` se genera automáticamente: `GC-{tenant_id}-{random_alphanumeric_8}`.

#### `GET /api/gift-cards/{id}`
Detalle + recargas.

#### `POST /api/gift-cards/{id}/recargar`
Recargar saldo. **Permiso:** `gift_cards.recargar`

```json
{
  "monto": 200.00
}
```

| Código | Condición |
|--------|-----------|
| 422 | `gift_card_expirada` |
| 422 | `gift_card_cancelada` |

#### `POST /api/gift-cards/{id}/cancelar`
Cancelar gift card. **Permiso:** `gift_cards.cancelar`

---

## 8. Nota de Crédito (extensión Devoluciones)

### Permiso base: `notas_credito.ver`

#### `GET /api/notas-credito`
Lista paginada de notas de crédito.

#### `GET /api/notas-credito/{id}`
Detalle + usos.

#### `GET /api/clientes/{id}/notas-credito`
Notas de crédito activas de un cliente.

---

## 9. Reportes Nuevos

### Permiso base: `reportes.*`

#### `GET /api/reportes/cuentas-cobrar`
Reporte de CxC: resumen por cliente, antigüedad de saldos.

#### `GET /api/reportes/cuentas-pagar`
Reporte de CxP: resumen por proveedor.

#### `GET /api/reportes/crm`
Reporte CRM: clientes por segmento, total puntos emitidos/canjeados.

---

## 10. Módulo: Unidades de Medida

### Permiso base: No requiere — es catálogo transversal

#### `GET /api/unidades-medida`
Lista de unidades activas del tenant.

#### `POST /api/unidades-medida`
Crear unidad.

```json
{
  "nombre": "Kilogramo",
  "abreviatura": "kg",
  "tipo": "fraccionario"
}
```

#### `PUT /api/unidades-medida/{id}`
Editar.

#### `DELETE /api/unidades-medida/{id}`
Eliminar (solo si no está en uso en `producto_variantes`).

| Código | Condición |
|--------|-----------|
| 422 | `unidad_en_uso` — No se puede eliminar si hay variantes que la referencian |

---

## 11. Módulo: Producción / Recetas

### Permiso base: No requiere permiso propio — usa los existentes de Inventario

#### `GET /api/insumos`
Lista paginada de insumos.

| Query | Descripción |
|-------|-------------|
| `search` | Por nombre o SKU |
| `stock_bajo` | bool — solo insumos con stock ≤ stock_minimo |

#### `POST /api/insumos`
Crear insumo.

```json
{
  "nombre": "Harina de trigo",
  "sku": "HRN-001",
  "unidad_medida_id": 2,
  "costo": 18.50,
  "stock_minimo": 10
}
```

#### `PUT /api/insumos/{id}`
Editar.

#### `GET /api/insumos/{id}/stocks`
Stock del insumo por sucursal + lotes.

#### `POST /api/insumos/{id}/ajustar-stock`
Ajustar stock (entrada/salida manual).

```json
{
  "sucursal_id": 1,
  "cantidad": 50,
  "lote": "L2026-07",
  "fecha_vencimiento": "2026-12-31",
  "motivo": "Compra a proveedor"
}
```

#### `GET /api/recetas`
Lista paginada de recetas.

| Query | Descripción |
|-------|-------------|
| `variante_id` | Filtrar por producto terminado |

#### `POST /api/recetas`
Crear receta.

```json
{
  "variante_id": 10,
  "nombre": "Pastel de chocolate",
  "rendimiento": 1,
  "instrucciones": "Mezclar... hornear...",
  "ingredientes": [
    { "insumo_id": 1, "cantidad": 500, "unidad_medida_id": 2 },
    { "insumo_id": 3, "cantidad": 200, "unidad_medida_id": 2 }
  ]
}
```

El response incluye `costo_total` y `costo_unitario` calculados automáticamente.

#### `PUT /api/recetas/{id}`
Editar receta + sus ingredientes (borra y reinserta).

#### `GET /api/ordenes-produccion`
Lista de órdenes de producción.

#### `POST /api/ordenes-produccion`
Crear orden.

```json
{
  "sucursal_id": 1,
  "receta_id": 5,
  "cantidad_programada": 10,
  "fecha_programada": "2026-07-30",
  "notas": "Producción para fin de semana"
}
```

El sistema valida que haya stock suficiente de todos los ingredientes y calcula el máximo producible.

| Código | Condición |
|--------|-----------|
| 422 | `stock_insumos_insuficiente` — No hay materia prima suficiente para la cantidad programada |

#### `PATCH /api/ordenes-produccion/{id}/estado`
Cambiar estado.

```json
{
  "estado": "completada",
  "cantidad_producida": 10
}
```

Al cambiar a `completada`, el sistema ejecuta automáticamente:
1. Deduce ingredientes de `insumo_stocks` (FIFO con lote más próximo a vencer)
2. Incrementa `inventario_stock` de la variante destino

#### `POST /api/transformaciones`
Registrar transformación entre variantes.

```json
{
  "sucursal_id": 1,
  "variante_origen_id": 10,
  "variante_destino_id": 11,
  "cantidad_origen": 1,
  "cantidad_destino": 8,
  "notas": "Torta entera a porciones"
}
```

| Código | Condición |
|--------|-----------|
| 422 | `stock_insuficiente` — reusa error de Núcleo para la variante origen |

---

## 12. Módulo: Ventas a Plazos (Installment)

### Permiso base: Usa permisos existentes de CRM (`clientes.*`)

#### `POST /api/ventas/{ventaId}/plan-pago`
Crear plan de pago para una venta existente.

```json
{
  "numero_cuotas": 6,
  "tasa_interes": 5.0,
  "periodicidad": "mensual",
  "fecha_inicio": "2026-08-01"
}
```

El sistema calcula:
- `interes_total = total_venta * (tasa_interes / 100)`
- `monto_total = total_venta + interes_total`
- Distribuye en cuotas iguales de capital + interés

| Código | Condición |
|--------|-----------|
| 422 | `venta_ya_tiene_plan` — La venta ya tiene un plan de pago activo |
| 422 | `numero_cuotas_invalido` — Menos de 2 o más de 36 cuotas |

#### `GET /api/planes-pago-cliente/{id}`
Detalle del plan + cuotas.

#### `POST /api/planes-pago-cliente/{id}/pagar-cuota`
Registrar pago de una cuota específica.

```json
{
  "cuota_id": 3,
  "caja_sesion_id": 5,
  "metodo_pago_id": 1,
  "monto": 450.00
}
```

---

## 13. Módulo: Payroll / Nómina

### Permiso base: `usuarios.ver` (admin)

#### `GET /api/empleados`
Lista de empleados.

#### `POST /api/empleados`
Registrar empleado (vinculado a un `usuario` existente).

```json
{
  "usuario_id": 15,
  "sucursal_id": 1,
  "salario_base": 8000.00,
  "tipo_salario": "fijo",
  "fecha_ingreso": "2025-01-15"
}
```

#### `GET /api/nominas`
Lista de nóminas generadas.

#### `POST /api/nominas/generar`
Generar nómina para un período.

```json
{
  "sucursal_id": 1,
  "periodo_inicio": "2026-07-01",
  "periodo_fin": "2026-07-15"
}
```

El sistema calcula automáticamente percepciones y deducciones para cada empleado activo de la sucursal.

#### `PATCH /api/nominas/{id}/pagar`
Marcar nómina como pagada (deduce de caja).

```json
{
  "caja_sesion_id": 5
}
```

---

## 14. Módulo: Préstamos (Loans)

### Permiso base: `gastos.ver` (admin)

#### `GET /api/prestamos`
Lista de préstamos recibidos.

#### `POST /api/prestamos`
Registrar préstamo recibido.

```json
{
  "proveedor_id": 3,
  "monto": 50000.00,
  "interes": 8.5,
  "fecha_prestamo": "2026-06-01",
  "fecha_vencimiento": "2027-06-01",
  "notas": "Préstamo para expansión"
}
```

El sistema calcula `monto_a_pagar = monto + (monto * interes / 100)`.

#### `POST /api/prestamos/{id}/pagos`
Registrar pago de préstamo.

```json
{
  "caja_sesion_id": 5,
  "monto": 10000.00,
  "notas": "Primer pago"
}
```

| Código | Condición |
|--------|-----------|
| 422 | `pago_excede_saldo` — monto > saldo_pendiente |

---

## 15. Catálogo de `error_code` Nuevos

| error_code | HTTP | Módulo | Descripción |
|-----------|------|--------|-------------|
| `modulo_no_activo` | 403 | Global | El módulo no está habilitado para este tenant |
| `abono_excede_saldo` | 422 | CxC | monto del abono > saldo_pendiente |
| `cuenta_ya_pagada` | 422 | CxC/CxP | La cuenta ya está en estado pagada |
| `cuenta_anulada` | 422 | CxC/CxP | La cuenta está anulada |
| `cuenta_con_abonos` | 422 | CxC/CxP | Tiene abonos registrados, no se puede anular |
| `pago_excede_saldo` | 422 | CxP | pago > saldo_pendiente |
| `cotizacion_no_editable` | 422 | Cotizaciones | Estado no permite edición |
| `cotizacion_no_anulable` | 422 | Cotizaciones | Estado no permite anulación |
| `cotizacion_vencida` | 422 | Cotizaciones | Fecha de vencimiento pasada |
| `cotizacion_ya_convertida` | 422 | Cotizaciones | Ya fue convertida a venta |
| `sin_cliente` | 422 | Cotizaciones | Cotización sin cliente no se puede convertir |
| `transicion_estado_invalida` | 422 | Delivery | Salto de estado no permitido |
| `repartidor_no_existe` | 422 | Delivery | Usuario no existe |
| `repartidor_no_activo` | 422 | Delivery | Usuario no está activo |
| `monto_invalido` | 422 | Gift Cards | Monto ≤ 0 |
| `gift_card_expirada` | 422 | Gift Cards | Fecha de expiración pasada |
| `gift_card_cancelada` | 422 | Gift Cards | Gift card cancelada |
| `nota_credito_expirada` | 422 | Notas Crédito | |
| `nota_credito_sin_saldo` | 422 | Notas Crédito | Saldo disponible insuficiente |
| `unidad_en_uso` | 422 | Unidades Medida | No se puede eliminar si está referenciada |
| `stock_insumos_insuficiente` | 422 | Producción | No hay materia prima suficiente |
| `venta_ya_tiene_plan` | 422 | Ventas a Plazos | La venta ya tiene un plan de pago activo |
| `numero_cuotas_invalido` | 422 | Ventas a Plazos | Menos de 2 o más de 36 cuotas |
| `empleado_ya_existe` | 422 | Payroll | El usuario ya está registrado como empleado |
| `nomina_ya_pagada` | 422 | Payroll | La nómina ya fue pagada |
| `pago_excede_saldo` | 422 | Préstamos | pago > saldo_pendiente del préstamo |
| `prestamo_ya_pagado` | 422 | Préstamos | El préstamo ya está en estado pagado |

---

*Fin de 02_CONTRATO_API.md*
