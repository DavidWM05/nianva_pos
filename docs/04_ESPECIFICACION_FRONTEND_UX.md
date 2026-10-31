# 04 — Especificación Frontend UX: Pantallas Nuevas

> **Basado en:** Patrones de Angular establecidos en Núcleo (`RecordTabsComponent`,
> `EntidadSelectorComponent` vía contrato `BuscadorEntidad`, estructura de vistas dedicadas
> crear/editar/visualizar).
> **No se redefine:** diseño de componentes base, sistema de diseño (tokens), layout general del sidebar,
> manejo de errores con `error_code`.

---

## 0. Convenciones de Núcleo que se siguen

- **Cada entidad raíz tiene:** vista de listado, vista de detalle/visualizar, formulario crear, formulario editar
- **Para referenciar entidades existentes** (clientes, productos, proveedores, variantes): usar `EntidadSelectorComponent` con el contrato `BuscadorEntidad` (buscar por nombre/código, seleccionar, emitir ID)
- **Para datos tabulares con pestañas:** usar `RecordTabsComponent`
- **Para feedback al usuario:** usar el sistema de notificaciones toast existente
- **Para errores:** mostrar el `message` al usuario pero **distinguir la acción por `error_code`** en el handler
- **Formato de fecha/hora/moneda:** usar los pipes/formatos ya establecidos (locale MX)
- **Sidebar:** los módulos nuevos se agregan a `NUCLEO_NAV_GROUPS` en `modules.config.ts`

---

## 1. Sidebar — Nueva agrupación

En `frontend/apps/pos/src/app/modules/modules.config.ts`:

```typescript
// Agregar al grupo existente o crear nuevo grupo "Financiero"
NUCLEO_NAV_GROUPS = [
  // ... grupos existentes (Núcleo, Inventario, TPV, etc.)
  {
    titulo: 'Financiero',
    items: [
      { ruta: '/cuentas-cobrar', icono: 'pi pi-credit-card', label: 'Cuentas por Cobrar', permiso: 'cuentas_cobrar.ver' },
      { ruta: '/cuentas-pagar', icono: 'pi pi-money-bill', label: 'Cuentas por Pagar', permiso: 'cuentas_pagar.ver' },
      { ruta: '/notas-credito', icono: 'pi pi-receipt', label: 'Notas de Crédito', permiso: 'notas_credito.ver' },
      { ruta: '/prestamos', icono: 'pi pi-building', label: 'Préstamos', permiso: 'prestamos.ver' },
    ]
  },
  {
    titulo: 'Ventas',
    items: [
      // ... items existentes
      { ruta: '/cotizaciones', icono: 'pi pi-file-edit', label: 'Cotizaciones', permiso: 'cotizaciones.ver' },
      { ruta: '/pedidos', icono: 'pi pi-truck', label: 'Pedidos / Delivery', permiso: 'pedidos.ver' },
    ]
  },
  {
    titulo: 'CRM',
    items: [
      { ruta: '/clientes', icono: 'pi pi-users', label: 'Clientes' },  // existente
      { ruta: '/crm', icono: 'pi pi-heart', label: 'CRM / Loyalty', permiso: 'crm.interacciones.ver' },
      { ruta: '/gift-cards', icono: 'pi pi-gift', label: 'Gift Cards', permiso: 'gift_cards.ver' },
    ]
  },
  {
    titulo: 'Producción',
    items: [
      { ruta: '/insumos', icono: 'pi pi-box', label: 'Insumos', permiso: 'produccion.ver' },
      { ruta: '/recetas', icono: 'pi pi-book', label: 'Recetas', permiso: 'produccion.ver' },
      { ruta: '/ordenes-produccion', icono: 'pi pi-wrench', label: 'Órdenes Producción', permiso: 'produccion.ver' },
    ]
  },
  {
    titulo: 'RRHH',
    items: [
      { ruta: '/empleados', icono: 'pi pi-users', label: 'Empleados', permiso: 'payroll.ver' },
      { ruta: '/nominas', icono: 'pi pi-money-bill', label: 'Nóminas', permiso: 'payroll.ver' },
    ]
  },
  // El grupo Financiero se unifica arriba (CxC, CxP, Notas de Crédito + Préstamos)
];
```

---

## 2. Pantalla: Cuentas por Cobrar (CxC)

### 2.1 Listado (`/cuentas-cobrar`)

**Layout:**
- Tabla con DataTable (PrimeNG), paginada, filtrable
- Filtros rápidos arriba: tabs de estado (Todas | Pendientes | Pagadas | Vencidas)
- Input de búsqueda (por nombre de cliente)
- Badge de color por estado: `pendiente`=naranja, `pagada`=verde, `vencida`=rojo, `anulada`=gris

**Columnas:**
| Columna | Ordenable | Notas |
|---------|-----------|-------|
| # | No | ID interno |
| Cliente | Sí | Nombre + RFC |
| Monto Total | Sí | Formato moneda |
| Saldo Pendiente | Sí | Destacado si > 0 |
| Vencimiento | Sí | Rojo si vencido |
| Días Vencida | Sí | Si aplica |
| Estado | Sí | Badge coloreado |
| Acciones | No | Botones: Ver, Registrar Abono (si pendiente), Anular (si admin) |

**Acciones rápidas desde listado:**
- Click en fila → navega al detalle
- Botón "Registrar Abono" → modal/dialog embebido (no navegación)
- Botón "Anular" → confirmación con SweetAlert2

### 2.2 Detalle (`/cuentas-cobrar/:id`)

**Layout:** `RecordTabsComponent` con tabs:

1. **Información General** (primer tab, default)
   - Card con datos de la cuenta: cliente, monto, saldo, vencimiento, estado
   - Card con datos de la venta origen (navegable a `/ventas/:id`)
2. **Abonos** (segundo tab)
   - Tabla de abonos recibidos: monto, método de pago, referencia, fecha, usuario
   - Botón "Registrar Abono" (mismo modal que en listado)
3. **Historial** (tercer tab)
   - Log de cambios de estado (created_at, updated_at, cuándo se pagó)

### 2.3 Modal "Registrar Abono"

**Controles:**
- Input `monto` (currency, con validación: > 0 y <= saldo_pendiente)
- `EntidadSelectorComponent` para seleccionar `metodo_pago` (lista de metodos activos del tenant)
- Input `referencia` (texto opcional)
- Botón Confirmar → POST a API → toast success → refresca tabla
- Si `monto > saldo_pendiente` → mostrar error `abono_excede_saldo` en tooltip del input

---

## 3. Pantalla: Cuentas por Pagar (CxP)

Espejo de CxC pero con proveedores. Misma estructura:

### 3.1 Listado (`/cuentas-pagar`)

Mismas columnas pero con `Proveedor` en vez de `Cliente`.

### 3.2 Detalle (`/cuentas-pagar/:id`)

Misma estructura que CxC.

### 3.3 Modal "Registrar Pago"

Mismo diseño que abono de CxC.

---

## 4. Pantalla: Cotizaciones

### 4.1 Listado (`/cotizaciones`)

**Filtros:**
- Tabs de estado: Todas | Pendientes | Convertidas | Vencidas
- Búsqueda por número de cotización o nombre de cliente
- Filtro por rango de fechas (date range picker)
- Botón "Nueva Cotización" (solo si tiene permiso `cotizaciones.crear`)

**Columnas:**
| Columna | Notas |
|---------|-------|
| # / Número | `COT-000001` |
| Cliente | Nombre + RFC (o "Sin cliente" si null) |
| Total | Formato moneda |
| Creada | Fecha |
| Vence | Fecha |
| Estado | Badge: pendiente=azul, convertida=verde, vencida=rojo, anulada=gris |
| Acciones | Ver, Editar (si pendiente), Eliminar (si pendiente), Convertir a Venta (si pendiente y no vencida) |

### 4.2 Formulario Crear/Editar (`/cotizaciones/crear`, `/cotizaciones/:id/editar`)

Sigue el mismo patrón de crear venta (módulo TPV), pero **sin cobro**:

**Sección Cliente:**
- `EntidadSelectorComponent` para seleccionar cliente (opcional — puede omitirse)
- Si cliente tiene RFC y régimen fiscal, se precargan

**Sección Items:**
- Buscador de productos (por nombre/código) que agrega filas a la tabla
- Tabla de items: Producto | Variante | Cantidad | Precio Unitario | Descuento | Subtotal
- Total al pie: Subtotal - Descuento = Total
- Botón "Agregar Producto"

**Sección Configuración:**
- Días de validez (default 15)
- Observaciones (textarea)
- `uso_cfdi` (dropdown del catálogo SAT, si aplica)

**Botones:** Guardar (como pendiente) | Cancelar

### 4.3 Detalle / Visualizar (`/cotizaciones/:id`)

**Layout:** `RecordTabsComponent`

1. **Cotización** — Card con datos generales + tabla de items (solo lectura)
2. **Venta vinculada** (solo si `estado = convertida`) — Card con enlace a la venta generada
3. **Historial** — Log de cambios de estado

**Acciones desde detalle:**
- Botón "Editar" (si pendiente)
- Botón "Convertir a Venta" (si pendiente y no vencida) → abre wizard
- Botón "Descargar PDF" (para imprimir la cotización, si se implementa)

### 4.4 Wizard "Convertir a Venta"

Pequeño modal/dialog con:
- Resumen de la cotización
- Selección de forma de pago (dropdown: efectivo, tarjeta, etc.)
- Input `monto_recibido` (para calcular vuelto)
- Botón "Confirmar Venta"
- Al confirmar: POST a `/api/cotizaciones/{id}/convertir` → si éxito, redirige a la venta creada

---

## 5. Extensión CRM — Pantallas

### 5.1 Sección CRM en Perfil de Cliente

**En la pantalla existente de detalle de cliente** (`/clientes/:id`), se agregan dos tabs nuevos al `RecordTabsComponent`:

**Tab "Interacciones"** (nuevo):
- Timeline vertical con las interacciones registradas
- Cada interacción muestra: icono por tipo (📞 llamada, 📧 email, 💬 WhatsApp, 📝 nota), observación, usuario que registró, fecha
- Botón flotante "+ Nueva Interacción" → modal con: selector de tipo (dropdown), observación (textarea)

**Tab "Loyalty / Puntos"** (nuevo):
- Card superior: puntos actuales (grande, destacado) + puntos acumulados históricos
- Tabla de transacciones de puntos: fecha, tipo (ganados/canjeados), puntos (+/-), referencia (venta/devolución)
- Botón "Ajustar Puntos" (solo admin) → modal con input de puntos (+/-) y motivo

### 5.2 Campañas (`/crm` — opcional)

Si el alcance incluye campañas:

- **Listado:** campañas enviadas (fecha, segmento, asunto, cantidad de destinatarios)
- **Nueva campaña:** formulario con:
  - Segmento destino (`EntidadSelectorComponent` para segmentos predefinidos, o selector manual de clientes)
  - Asunto del email
  - Mensaje (textarea con soporte de variables `{{nombre}}`)
  - Botón "Enviar" → confirmación → POST a API

---

## 6. Pantalla: Delivery / Pedidos

### 6.1 Listado (`/pedidos`)

**Layout tipo kanban o tabla con filtros de estado:**

Opción recomendada: **Tabla** con filtro rápido de estado y búsqueda. (Kanban se deja para futura iteración.)

**Filtros:**
- Tabs de estado: Todos | Pendientes | Preparando | En Camino | Entregados | Cancelados
- Búsqueda por número de pedido o nombre de cliente
- Filtro por repartidor (dropdown, solo si el usuario es admin o manager)

**Columnas:**
| Columna | Notas |
|---------|-------|
| # / Número | `PED-000001` |
| Cliente | Nombre + teléfono |
| Dirección | Truncada |
| Estado | Badge coloreado: pendiente=gris, preparando=amarillo, en_camino=azul, entregado=verde, cancelado=rojo |
| Repartidor | Nombre o "Sin asignar" |
| Total | Monto |
| Acciones | Ver, cambiar estado (dropdown inline), asignar repartidor (si admin) |

### 6.2 Detalle (`/pedidos/:id`)

**Layout:** `RecordTabsComponent`

1. **Pedido** — Datos generales:
   - Card cliente: nombre, teléfono, dirección de entrega
   - Card repartidor: nombre (o "Sin asignar" + botón asignar)
   - Timeline de estados con fechas
   - Tabla de items del pedido (producto, cantidad, precio, subtotal)
   - Total + costo de delivery + total final
   - Notas del pedido
2. **Venta vinculada** (si existe) — Card con enlace a la venta

**Acciones desde detalle:**
- Botones de cambio de estado (según máquina de estados)
- Botón "Asignar Repartidor" (modal con búsqueda de usuarios con rol repartidor)

### 6.3 Formulario Crear Pedido (`/pedidos/crear`)

Similar al POS pero orientado a delivery:

**Secciones:**
1. **Cliente** — `EntidadSelectorComponent` para buscar cliente existente o "Nuevo Cliente" para crear rápido
2. **Dirección de entrega** — inputs: calle/número, colonia, ciudad, referencia, código postal
3. **Items** — buscador de productos (mismo componente que POS) + tabla de items
4. **Configuración** — costo delivery (input currency, default de config), tiempo estimado (input número, default 30 min), notas (textarea)
5. **Botones:** Guardar (crea pedido pendiente) | Guardar y Vincular Venta (crea pedido + venta)

---

## 7. Pantalla: Gift Cards

### 7.1 Listado (`/gift-cards`)

**Columnas:**
| Columna | Notas |
|---------|-------|
| Código | `GC-1-A3B8C9D0` |
| Cliente | Nombre o "Anónima" |
| Saldo Inicial | Moneda |
| Saldo Actual | Moneda, destacado |
| Expira | Fecha, rojo si expirada |
| Estado | Badge: activa=verde, usada=gris, expirada=rojo, cancelada=naranja |

**Acciones:**
- Ver detalle
- Recargar (modal)
- Cancelar (solo admin, confirmación)

### 7.2 Emitir Gift Card (modal desde cualquier pantalla)

**Botón "Emitir Gift Card"** en el listado (permiso `gift_cards.emitir`):

Modal con:
- `EntidadSelectorComponent` para cliente (opcional — puede ser anónima)
- Input `monto` (currency, validación > 0)
- DatePicker `fecha_expiracion` (opcional)
- Botón "Emitir" → POST → toast success

---

## 8. Integración en Pantallas Existentes

### 8.1 POS / Venta (`/ventas/crear`) — Métodos de pago nuevos

En el POS existente, al seleccionar método de pago, se agregan:
- **"Gift Card"** — input para código de tarjeta + botón validar → descuenta saldo y muestra monto restante
- **"Nota de Crédito"** — `EntidadSelectorComponent` para seleccionar nota de crédito activa del cliente (solo si el cliente tiene saldo a favor)
- **"Crédito"** — al seleccionar, se marca la venta como crédito. El POS muestra mensaje: *"El cliente pagará después. Se generará una Cuenta por Cobrar."*

**Flujo de pago con Gift Card:**
1. Cajero selecciona "Gift Card" como método
2. Ingresa o escanea el código de la gift card
3. Sistema valida (activa, no expirada, con saldo)
4. Muestra saldo disponible
5. Cajero ingresa monto a cobrar con la tarjeta (≤ saldo)
6. Si el total de venta > saldo, el resto se paga con otro método
7. Se registra en `venta_pagos`

### 8.2 Devoluciones (`/devoluciones/crear`) — Nota de Crédito

En el formulario de devolución existente, se agrega:
- Radio button: **"Tipo de Reembolso"** → Efectivo / Nota de Crédito
- Si selecciona Nota de Crédito: se muestra mensaje *"Se generará una Nota de Crédito a favor del cliente por el monto de la devolución"*

### 8.3 Corte de Caja (`/caja/cierre`) — Nuevos conceptos

En la pantalla de cierre de caja existente, se agregan 3 nuevas filas al desglose:

```
Ingresos:
  Ventas (efectivo):      $ X,XXX.XX  (existente)
  Ventas (tarjeta):       $ X,XXX.XX  (existente)
  Abonos CxC recibidos:   $ X,XXX.XX  ← NUEVO
  Recargas Gift Card:     $ X,XXX.XX  ← NUEVO

Egresos:
  Gastos:                 $ X,XXX.XX  (existente)
  Pagos CxP realizados:   $ X,XXX.XX  ← NUEVO
  Reembolsos devoluciones: $ X,XXX.XX (existente)
```

---

## 9. Resumen de Pantallas Nuevas

| Ruta | Componente | Módulo | Tipo |
|------|-----------|--------|------|
| `/cuentas-cobrar` | `CuentasCobrarListadoComponent` | CxC | Listado |
| `/cuentas-cobrar/:id` | `CuentaCobrarDetalleComponent` | CxC | Detalle |
| `/cuentas-pagar` | `CuentasPagarListadoComponent` | CxP | Listado |
| `/cuentas-pagar/:id` | `CuentaPagarDetalleComponent` | CxP | Detalle |
| `/cotizaciones` | `CotizacionesListadoComponent` | Cotizaciones | Listado |
| `/cotizaciones/crear` | `CotizacionFormularioComponent` | Cotizaciones | Crear |
| `/cotizaciones/:id` | `CotizacionDetalleComponent` | Cotizaciones | Detalle |
| `/cotizaciones/:id/editar` | `CotizacionFormularioComponent` | Cotizaciones | Editar |
| `/pedidos` | `PedidosListadoComponent` | Delivery | Listado |
| `/pedidos/crear` | `PedidoFormularioComponent` | Delivery | Crear |
| `/pedidos/:id` | `PedidoDetalleComponent` | Delivery | Detalle |
| `/gift-cards` | `GiftCardsListadoComponent` | Gift Cards | Listado |
| `/gift-cards/:id` | `GiftCardDetalleComponent` | Gift Cards | Detalle |
| `/crm` | `CrmDashboardComponent` | CRM Avanzado | Dashboard campañas |
| `/clientes/:id` (tabs nuevos) | — | CRM Avanzado | Extensión existente |
| `/unidades-medida` | `UnidadesMedidaListadoComponent` | Unidades Medida | Catálogo |
| `/insumos` | `InsumosListadoComponent` | Producción | Listado |
| `/insumos/crear` | `InsumoFormularioComponent` | Producción | Crear |
| `/insumos/:id` | `InsumoDetalleComponent` | Producción | Detalle + Stocks |
| `/recetas` | `RecetasListadoComponent` | Producción | Listado |
| `/recetas/crear` | `RecetaFormularioComponent` | Producción | Crear con ingredientes |
| `/recetas/:id` | `RecetaDetalleComponent` | Producción | Detalle |
| `/ordenes-produccion` | `OrdenesProduccionListadoComponent` | Producción | Listado |
| `/ordenes-produccion/crear` | `OrdenProduccionFormularioComponent` | Producción | Crear con selector de receta |
| `/ordenes-produccion/:id` | `OrdenProduccionDetalleComponent` | Producción | Detalle + completar |
| `/empleados` | `EmpleadosListadoComponent` | Payroll | Listado |
| `/empleados/crear` | `EmpleadoFormularioComponent` | Payroll | Crear |
| `/nominas` | `NominasListadoComponent` | Payroll | Listado |
| `/prestamos` | `PrestamosListadoComponent` | Préstamos | Listado |
| `/prestamos/crear` | `PrestamoFormularioComponent` | Préstamos | Crear |

### Modales/Dialogs adicionales (no son rutas):

| Modal | Módulo | Disparado desde |
|-------|--------|----------------|
| Registrar Abono | CxC | Listado o Detalle |
| Registrar Pago | CxP | Listado o Detalle |
| Convertir a Venta | Cotizaciones | Detalle |
| Nueva Interacción | CRM | Detalle Cliente |
| Ajustar Puntos | CRM | Detalle Cliente |
| Asignar Repartidor | Delivery | Detalle Pedido |
| Emitir Gift Card | Gift Cards | Listado |
| Recargar Gift Card | Gift Cards | Detalle |
| Registrar Transformación | Producción | Detalle producto |
| Completar Orden Producción | Producción | Detalle orden |
| Pagar Cuota (Plazos) | Ventas Plazos | Detalle plan pago |
| Pagar Nómina | Payroll | Detalle nómina |
| Registrar Pago Préstamo | Préstamos | Detalle préstamo |

---

## 10. Mejoras Delegadas a FrontendUXEngineer

Las siguientes mejoras en pantallas existentes se delegan al sub-agente `FrontendUXEngineer`:

1. **POS** (`/ventas/crear`):
   - Agregar método de pago "Gift Card" con input de código + validación en tiempo real
   - Agregar método de pago "Nota de Crédito" (buscador de NC activas del cliente)
   - Agregar modo "Venta a Crédito" que genera CxC automáticamente
   - Mostrar saldo de puntos de fidelidad del cliente en la cabecera del POS

2. **Devoluciones** (`/devoluciones/crear`):
   - Agregar radio button "Tipo de Reembolso" (Efectivo / Nota de Crédito)

3. **Caja / Corte** (`/caja/cierre`):
   - Agregar filas de Abonos CxC, Recargas Gift Card, Pagos CxP al desglose

4. **Detalle de Cliente** (`/clientes/:id`):
   - Agregar tabs "Interacciones" y "Loyalty / Puntos" al `RecordTabsComponent`

5. **Sidebar** (`modules.config.ts`):
   - Agregar grupos: "Financiero" (CxC, CxP, Notas de Crédito, Préstamos), "Ventas" (Cotizaciones, Delivery), "CRM" (Loyalty, Gift Cards), "Producción" (Insumos, Recetas, Órdenes), "RRHH" (Empleados, Nóminas)

---

*Fin de 04_ESPECIFICACION_FRONTEND_UX.md*
