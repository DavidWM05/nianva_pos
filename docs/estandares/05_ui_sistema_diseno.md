# 05. Interfaz y sistema de diseño (UI)

> Aprobado el 2026-10-30. Formato: **Regla** · **Por qué** · **Verifica** · **Desde**.

**Principio:** en Lite, el estándar visual era un documento más un escáner que contaba
violaciones, y aun así hubo que pulir 40 pantallas una por una (L-22). Aquí la regla se cumple
**por construcción**: la pantalla usa componentes que ya resuelven el color, el tema, la
responsividad, el formato y las acciones. Si una pantalla necesita CSS propio para verse bien,
el componente está incompleto y se arregla el componente.

## Librerías (`frontend/libs/ui/*`)

| Lib | Contenido |
|---|---|
| `ui/tokens` | Una sola fuente (JSON) de la que salen las variables CSS, el preset de PrimeNG y los breakpoints. Tokens semánticos y temas claro y oscuro |
| `ui/format` | Pipes `dinero`, `cantidad` (con unidad), `fecha`, `fechaHora`, `porcentaje`, según la configuración regional del tenant |
| `ui/layout` | Shell responsivo, `ui-page-header`, `ui-page`, `ui-form-actions`, `ui-section` |
| `ui/actions` | `ui-btn-crear`, `ui-btn-exportar`, `ui-row-actions` (con menú ⋮ y motivo de deshabilitado) |
| `ui/data` | `ui-tabla` con columnas tipadas (`texto`, `principal`, `dinero`, `cantidad`, `fecha`, `estado`, `acciones`), fila inactiva, estado vacío, `ui-filter-bar` y "Mostrando…" |
| `ui/feedback` | Registro global estado → tono, `ui-badge`, toast único, `confirm`, `ui-kpi`, `ui-empty` |
| `ui/overlays` | `ui-modal` y `ui-drawer` de detalle |
| `ui/forms` | `ui-input-dinero`, `ui-input-cantidad`, `ui-input-password`, `ui-input-pin`, `ui-select-filtro`, mensajes de error por `error_code` |
| `ui/print` | Plantillas de ticket de 58/80 mm, carta y etiquetas, sin tema |
| `ui/report` | Plantilla de reporte: filtros, KPI, gráfica y detalle paginado |

Las libs actuales `libs/design-tokens` y `libs/ui-shared` se reemplazan; sus piezas útiles se
mueven a la lib nueva que corresponda.

## Reglas

### UI-01 · Solo tokens
- **Regla:**
  - color, espacio, radio, sombra, tipografía y z-index salen de tokens semánticos
    (`--color-texto`, `--color-fondo-tarjeta`, `--color-peligro-texto`, `--espacio-3`…);
  - prohibidos los colores literales (`#`, `rgb(`, `hsl(`, nombres CSS) fuera de `ui/tokens`;
  - prohibidas las clases utilitarias de color fijo (`bg-white`, `text-black`);
  - cada color de marca o semántico que se usa como texto tiene su variante `-texto`, con
    contraste de al menos 4.5:1 en ambos temas (por ejemplo, el amarillo y el naranja como
    texto).
- **Por qué:** 170 violaciones de colores fijos en Lite, y modo oscuro parchado (L-22).
- **Verifica:**
  - stylelint (`color-no-hex`, `declaration-property-value-disallowed-list`) y una regla de
    ESLint en plantillas, bloqueantes;
  - un test que calcula el contraste de cada par texto/fondo de los tokens en ambos temas.
- **Desde:** Fase 2.

### UI-02 · Componentes, no fragmentos
- **Regla:**
  - todo patrón repetido (encabezado, tabla, filtros, acciones por fila, KPI, panel de
    detalle) es un componente standalone con `input()`/`output()` tipados;
  - un componente no lee ni escribe estado de su padre fuera de sus inputs y outputs;
  - prohibido manipular el DOM a mano (`document.querySelector`, listeners globales) en
    `feature/*`.
- **Por qué:**
  - en Lite, un parcial pisó la variable `$items` de la vista (L-19);
  - un script corría antes de que existiera el DOM (L-16).
- **Verifica:** ESLint (`no-restricted-globals: document` en `feature/**`) y ARQ-11.
- **Desde:** Fase 2.

### UI-03 · Claro y oscuro desde el inicio
- **Regla:**
  - todo componente y pantalla funciona en ambos temas sin CSS adicional;
  - el tema se elige por preferencia del usuario, con el sistema operativo como valor por
    defecto, y se aplica con un atributo en `<html>`;
  - los impresos no tienen tema (UI-12).
- **Por qué:** en Lite, el modo oscuro se agregó al final y obligó a revisar cada vista.
- **Verifica:** el catálogo visual (UI-14) con capturas en ambos temas, y una prueba de
  regresión visual (Playwright) de cada componente en los dos.
- **Desde:** Fase 2.

### UI-04 · Responsivo en el componente
- **Regla:**
  - breakpoints únicos, definidos en tokens (`sm` 576, `md` 768, `lg` 992, `xl` 1200);
  - el shell, las tablas (que se convierten en tarjetas o en scroll con la columna principal
    fija), los formularios (en una columna en `sm`), los modales (a pantalla completa en `sm`)
    y el drawer (a ancho completo en `sm`) resuelven su propia responsividad;
  - una pantalla no declara `@media`;
  - el TPV tiene diseño táctil y de escritorio dentro del mismo componente.
- **Por qué:** en Lite, cada vista agregó sus propios ajustes para celular.
- **Verifica:**
  - stylelint (sin `@media` en `apps/**` ni `feature/**`);
  - el catálogo visual a 375, 768 y 1280 px;
  - un e2e del flujo de venta a 375 px.
- **Desde:** Fase 2.

### UI-05 · Formato solo por pipes
- **Regla:**
  - dinero, cantidades, fechas y porcentajes se muestran solo con los pipes de `ui/format`, o
    con las columnas tipadas de `ui-tabla`, que los usan;
  - toda cantidad lleva su unidad ("1 pza", "0.5 kg"), y el cero va solo;
  - nunca se muestra el valor crudo ("1.000", "1250.5");
  - números alineados a la derecha con `tabular-nums`;
  - los negativos usan el tono de peligro.
- **Por qué:** en Lite aparecían cantidades crudas (L-23); Pro muestra montos sin formato (C10).
- **Verifica:** una regla de ESLint de plantilla (una interpolación de una propiedad llamada
  `*precio*|*monto*|*total*|*cantidad*|*stock*` sin pipe → error) y tests de los pipes.
- **Desde:** Fase 2.

### UI-06 · Estados con un registro global
- **Regla:**
  - un solo registro `estado → { etiqueta, tono, icono }` por entidad (venta, apartado,
    devolución, corte, compra), en `ui/feedback`;
  - `ui-badge` y la columna `estado` lo usan;
  - como máximo un badge de estado por fila;
  - el estado "normal" (venta completada, compra activa) no lleva badge;
  - activo e inactivo no ocupan columna: la fila inactiva se atenúa y lleva "Inactivo" junto al
    nombre.
- **Por qué:** en Lite, el mismo estado se veía distinto en cada módulo hasta que se fijó la
  tabla de `estandar_ui.md` §5 y §6.2.
- **Verifica:** un test de que cada valor del enum del backend tiene una entrada en el registro
  (contrato OpenAPI contra el registro).
- **Desde:** Fase 2.

### UI-07 · Acciones
- **Regla:**
  - en la página: una sola acción primaria; el botón de crear es `ui-btn-crear` ("Nuevo
    &lt;objeto&gt;"), y el de exportar, `ui-btn-exportar` ("Exportar");
  - por fila: `ui-row-actions`, solo con icono, `title` y `aria-label` obligatorios, en el
    orden Ver, Editar, propias, Estado y Eliminar o Anular;
  - con más de tres acciones, menú ⋮;
  - una acción no disponible se muestra deshabilitada con su motivo visible;
  - el orden, los iconos y los tonos los fija el componente a partir de un tipo de acción
    (`'ver' | 'editar' | 'imprimir' | 'historial' | 'estado' | 'eliminar' | 'anular' | 'custom'`).
- **Por qué:** son las reglas de `estandar_ui.md` §3 de Lite, que costaron tres tandas de
  ajustes.
- **Verifica:** el componente no acepta texto en las acciones por fila (por tipado) y un test de
  orden.
- **Desde:** Fase 2.

### UI-08 · Un módulo, un nombre
- **Regla:**
  - cada pantalla tiene una entrada en el registro de navegación (`ruta`, `nombre`, `icono`,
    `permiso`, `feature`);
  - el menú, el título (`ui-page-header`), el título del navegador y los botones o tarjetas que
    llevan a la pantalla toman el nombre de ahí;
  - mayúscula solo al inicio y sin "Gestión de".
- **Por qué:** la misma pantalla tenía nombres distintos en Lite (L-28).
- **Verifica:** un test de que toda ruta con componente tiene una entrada en el registro y de que
  `ui-page-header` no recibe un título literal.
- **Desde:** Fase 2.

### UI-09 · Plantilla de pantalla de listado
- **Regla:** todo listado sigue la misma composición:

  ```
  ui-page-header (icono, nombre, subtítulo, acciones)
  ui-filter-bar (filtros con valor por defecto, Limpiar, "Mostrando…")
  ui-tabla (columna principal + dato de apoyo, descriptivos en texto, acciones)
  ui-empty (cuando no hay resultados)
  ```

  - el detalle se abre en `ui-drawer`, desde el botón Ver, nunca al hacer clic en la fila;
  - crear o editar algo corto se hace en `ui-modal`; algo largo, en una página propia;
  - toda entidad raíz tiene sus rutas `/modulo`, `/modulo/nuevo` y `/modulo/:id` (se hereda de
    `.claude/CLAUDE.md` §4).
- **Por qué:** en Lite se fijó Productos como modelo y se copió a mano en las demás pantallas.
- **Verifica:** el generador de Nx `ui-listado` crea la pantalla con esa estructura, y la revisión
  del PR la exige.
- **Desde:** Fase 2.

### UI-10 · Plantilla de reporte
- **Regla:**
  - todo reporte usa `ui/report`: filtros (rango de fechas, sucursal, más los propios del
    reporte), fila de KPI, gráfica opcional, detalle paginado con totales por columna y
    Exportar;
  - las cifras salen de la capa de métricas (ARQ-09);
  - la gráfica usa los colores de los tokens y se ajusta al tema.
- **Por qué:** siete reportes con siete maquetaciones en Lite, hasta que se hizo una plantilla
  común (L-21).
- **Verifica:** el generador `ui-reporte` y un test de que cada reporte declara sus métricas.
- **Desde:** Fase 6. El componente se crea en la Fase 2.

### UI-11 · Formularios
- **Regla:**
  - los campos obligatorios llevan `*` y `required`;
  - los límites (`maxlength`, `min`, `max`, decimales) vienen del contrato OpenAPI;
  - los errores del servidor (`errors.campo`) se pintan solos en el campo por `ui/forms`;
  - dinero y cantidad usan sus inputs (con `inputmode` correcto y sin aceptar más decimales que
    la columna);
  - contraseña con botón de ojo; PIN de 4 dígitos;
  - un select de filtro con "Todas" empieza con un placeholder vacío;
  - Guardar y Cancelar van en `ui-form-actions`.
- **Por qué:** son las reglas de `estandar_ui.md` §7 de Lite, aplicadas por componente.
- **Verifica:** tests de los inputs y un test de que un 422 marca el campo.
- **Desde:** Fase 2.

### UI-12 · Impresos
- **Regla:**
  - tickets (58 y 80 mm), recibos, estado de cuenta, etiquetas y documentos de carta salen de
    `ui/print`, con un solo encabezado y pie: empresa, la **sucursal del documento**, folio,
    fecha y usuario;
  - se generan desde la foto del documento (DAT-03), nunca recalculando;
  - van en blanco y negro, sin tema, con fuente del sistema y sin dependencias de red;
  - se prueban en la impresora térmica real antes de cerrar un cambio.
- **Por qué:**
  - en Lite, los cuatro tickets copiaban su CSS y ya habían divergido;
  - el encabezado mostraba la sucursal de la sesión o su nombre interno (L-14).
- **Verifica:** un test de que la plantilla usa los datos del documento (sucursal A impresa
  desde una sesión de la sucursal B → dice A) y regresión visual de los tres anchos.
- **Desde:** Fase 4.

### UI-13 · Mensajes
- **Regla:**
  - el resultado de una acción produce **un** toast, emitido por el interceptor o por el
    servicio de `ui/feedback`, nunca toast y alerta a la vez;
  - una acción destructiva pide confirmación con `confirm`, con el botón en el tono de peligro;
  - un aviso fijo en la página usa `ui-alert`;
  - un error técnico muestra el `message` y el `correlation_id` (SEG-11).
- **Por qué:** en Lite había mensajes duplicados (toast más alerta) para un mismo resultado.
- **Verifica:** un test del interceptor (una respuesta con error → un toast).
- **Desde:** Fase 2.

### UI-14 · Catálogo visual
- **Regla:**
  - `apps/catalogo-ui` muestra cada componente con sus variantes en claro, en oscuro y a 375, 768
    y 1280 px;
  - un componente nuevo o modificado no se usa en pantallas hasta que el responsable lo
    revisa en el catálogo.
- **Por qué:** en Lite, cada componente se validó en la pantalla donde apareció primero, y luego
  falló en otras.
- **Verifica:** el PR incluye capturas del catálogo y la regresión visual de Playwright.
- **Desde:** Fase 2.

### UI-15 · Texto generado siempre por interpolación
- **Regla:**
  - todo texto que viene de datos (nombres, notas, cupones, atributos) se muestra por
    interpolación de Angular;
  - las celdas y los resultados de búsqueda se arman con plantillas, nunca concatenando HTML
    (complementa SEG-04).
- **Por qué:** XSS en el TPV de Lite (L-01).
- **Verifica:** SEG-04.
- **Desde:** Fase 2.

### UI-16 · CSS por pantalla en una línea base que solo baja
- **Regla:**
  - una pantalla no tiene `.scss` propio, salvo layout puntual (una cuadrícula particular) y
    sin colores, tipografía ni `@media`;
  - los archivos de estilo de `apps/**` y `feature/**` se cuentan en una línea base que solo
    puede bajar.
- **Por qué:** Pro tiene 111 SCSS por vista (C10); la línea base de Lite funcionó para frenar la
  deuda.
- **Verifica:** un script en CI que compara el conteo con `ui-baseline.json`; subirlo falla, y
  regenerar el archivo requiere aprobación del responsable (PRO-03).
- **Desde:** Fase 2.

### UI-17 · Accesibilidad mínima
- **Regla:**
  - el foco es visible;
  - todo botón de solo icono tiene `aria-label`;
  - el contraste es AA;
  - el TPV se opera por completo con teclado (búsqueda, cantidad, cobro, atajos documentados en
    pantalla).
- **Por qué:** en la caja se trabaja con teclado y escáner, y el mouse es lento.
- **Verifica:** axe en los e2e del catálogo y del TPV, y un e2e de una venta completa solo con
  teclado.
- **Desde:** Fase 2; el TPV, en la Fase 4.

## De las 28 reglas de `estandar_ui.md` de Lite a componentes

| # | Regla de Lite (sección) | En la nueva base |
|---|---|---|
| 1 | Vistas nuevas cumplen el estándar completo; escáner con línea base (§1, §11) | UI-16, lint bloqueante |
| 2 | Un módulo, un nombre (§1) | UI-08, registro de navegación |
| 3 | Layout compartido en toda vista con menú (§1) | Shell de `ui/layout` (rutas hijas del shell) |
| 4 | Tipografía heredada, sin `font-family` en vistas (§1.1) | Tokens de tipografía; stylelint |
| 5 | Cifras en fuente de display con `lining-nums` (§1.1) | `ui-kpi` y `ui-page-header` ya lo aplican |
| 6 | Encabezado de página común (§1.2) | `ui-page-header` |
| 7 | Claro y oscuro con tokens (§2) | UI-01, UI-03 |
| 8 | Prohibidos `bg-white`, `text-black`, `table-dark` y colores fijos (§2) | UI-01, stylelint y ESLint |
| 9 | Amarillo y naranja como texto con su variante `-texto` (§2) | Tokens `-texto` |
| 10 | Contraste AA y revisión en ambos temas (§2) | Test de contraste de tokens; UI-14 |
| 11 | Botones de página con icono y texto; una primaria (§3.1) | `ui/actions`, UI-07 |
| 12 | Crear = primaria con `+` y "Nuevo &lt;objeto&gt;" (§3.1) | `ui-btn-crear` |
| 13 | Exportar uniforme (§3.1) | `ui-btn-exportar` |
| 14 | Acciones por fila solo con icono, con `title`/`aria-label` y orden fijo (§3.2) | `ui-row-actions` tipado |
| 15 | Menú ⋮ con más de tres acciones (§3.2) | `ui-row-actions` (automático) |
| 16 | Acción no disponible con motivo visible (§3.2) | `ui-row-actions` (`deshabilitada: motivo`) |
| 17 | Activar/Desactivar también en ver y editar (§3.2) | Acción tipo `estado` en `ui-page-header` y `ui-modal` |
| 18 | Pie de modal: Cancelar y la acción a la derecha (§3.3) | `ui-modal` |
| 19 | Un solo set de iconos, con variante `-fill` en filas (§4) | Registro de iconos por tipo de acción |
| 20 | Estados con badges globales (§5) | UI-06 |
| 21 | Tablas: números a la derecha, truncado con `title`, vacío estándar (§6) | `ui-tabla` con columnas tipadas |
| 22 | Filtros con valor por defecto, Limpiar y "Mostrando…" (§6) | `ui-filter-bar`, más API-06 |
| 23 | Cantidades con unidad; "Agotado" solo con stock ≤ 0 (§6.1) | UI-05, pipe `cantidad` |
| 24 | Filas: principal más dato de apoyo, descriptivos en texto, sin columna Estado binaria, máximo un badge (§6.2) | `ui-tabla` (`principal`, `estado`), UI-06 |
| 25 | Fechas `dd/mm/aaaa`, con la hora debajo (§6.2) | Pipes `fecha` y `fechaHora`; columna `fecha` |
| 26 | Formularios: obligatorios, límites de la BD, validación en el servidor, contraseña, PIN, select con placeholder (§7) | UI-11, `ui/forms` |
| 27 | Mensajes: un solo mensaje por resultado; toast, confirmación, alerta; errores sin traza (§8) | UI-13, SEG-11 |
| 28 | Detalle en panel lateral desde el ojo; modal corto; página completa para lo largo (§9) | UI-09, `ui-drawer`, `ui-modal` |

## Excepciones

Ninguna acordada.
