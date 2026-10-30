# 02. Datos (DAT)

> Aprobado el 2026-10-30. Formato: **Regla** · **Por qué** · **Verifica** · **Desde**.

### DAT-01 · Cantidades decimales con unidad
- **Regla:**
  - toda cantidad (stock, línea de venta, compra, ajuste, merma, componente de kit) es
    `decimal(14,3)` y va acompañada de su unidad (`unidad_id` en la variante o la línea);
  - las presentaciones guardan un factor sobre la unidad base (`decimal(14,3)`), y el libro
    siempre registra en la unidad base;
  - una variante que no es de granel valida que la cantidad sea entera en el FormRequest; la
    columna es la misma (D3).
- **Por qué:** en Lite el granel llegó tarde sobre columnas `int`, y aparecieron cantidades
  crudas ("1.000") (L-23); en Pro las cantidades son `int` (C6).
- **Verifica:** un test de esquema que recorre las columnas `cantidad|stock|existencia%` y exige
  `decimal(14,3)`, y tests del FormRequest (granel 0.5 sí, pieza 0.5 no).
- **Desde:** Fase 3.

### DAT-02 · Dinero
- **Regla:**
  - dinero en `decimal(12,2)`, y tasas o porcentajes en `decimal(7,4)`;
  - en PHP, los cálculos usan un value object `Dinero` (enteros en centavos o `brick/money`),
    nunca `float`;
  - el redondeo ocurre en un solo lugar (`Dinero::redondear`, mitad hacia arriba, por línea y
    luego el total), igual que en Lite, para conservar la paridad de los tickets;
  - el servidor recalcula todos los totales; los del cliente solo sirven para comparar
    (diferencia → 422 `total_no_coincide`).
- **Por qué:** en Lite había comparaciones de floats con `==` y totales confiados al navegador
  (convenciones de Lite §5).
- **Verifica:** el test de esquema (columnas `precio|monto|total|costo|saldo%` en
  `decimal(12,2)`), PHPStan con una regla que prohíbe `float` en `Dinero`, y tests de paridad
  de redondeo.
- **Desde:** Fase 3.

### DAT-03 · Foto por línea, obligatoria
- **Regla:**
  - cada línea de venta, apartado, devolución o cambio, cotización y compra guarda, en el
    momento de la operación:
    - el precio unitario, la lista de precio, el costo unitario y el impuesto (tasa y monto);
      el costo unitario es el costo promedio vigente (DAT-15);
    - el descuento y la regla o regla promocional que lo dio (id más nombre copiado);
    - la unidad y el factor;
  - todas esas columnas son `NOT NULL`;
  - prohibido completar una foto con `?? 0`, `?: 0` o `->default(0)`: si falta el dato, la
    operación falla;
  - los documentos y reportes leen la foto, nunca el catálogo actual.
- **Por qué:**
  - Lite guardaba `costo_unitario = 0` en los cambios por un `?? 0` silencioso, y el commit que
    decía corregirlo no lo hacía (L-06);
  - las ventas viejas sin costo congelado cambiaban su utilidad al editar el costo (L-10).
- **Verifica:**
  - el test de esquema (columnas de foto `NOT NULL` y sin default);
  - una búsqueda en CI de `?? 0` en `Actions/` y `Services/` de dominio;
  - un test por tipo de documento: cambiar el precio o el costo del catálogo no cambia el
    documento ya emitido.
- **Desde:** Fase 3.

### DAT-04 · Libros de movimientos
- **Regla:**
  - stock, crédito de clientes, caja y (Fase 5) cuentas por pagar tienen un libro de solo
    inserción: tipo, referencia al documento, cantidad o monto, **saldo antes**, **saldo
    después**, usuario y fecha;
  - el saldo actual (`inventario_sucursal.existencia`, `clientes.saldo`) es una proyección que
    se actualiza en la misma transacción que el renglón del libro;
  - si no se puede actualizar la proyección (cero filas afectadas), la Action falla; nunca se
    escribe un libro sin su saldo, ni un saldo sin su libro;
  - las correcciones son movimientos nuevos, nunca `UPDATE` ni `DELETE` sobre el libro.
- **Por qué:** en Lite, `Compra` escribía el kardex aunque el `UPDATE` de stock no hubiera
  afectado ninguna fila, y el kardex no cuadraba (L-07).
- **Verifica:**
  - un comando `conciliar:libros`, que también corre en un test con datos semilla: la
    proyección = el último saldo después = la suma de movimientos;
  - el modelo del libro lanza una excepción en `update`/`delete`.
- **Desde:** Fase 3.

### DAT-05 · Saldo inicial explícito
- **Regla:**
  - el primer movimiento de toda variante en una sucursal es un `SALDO_INICIAL` (al crearla, al
    importar o en el ETL de migración), aunque sea 0;
  - el crédito de un cliente migrado también arranca con `SALDO_INICIAL`.
- **Por qué:** el kardex de Lite no tenía carga inicial, y hubo que reconstruir el saldo de
  apertura a partir del stock actual (L-08).
- **Verifica:** `conciliar:libros` exige que el primer movimiento sea `SALDO_INICIAL`, y hay un
  test del importador.
- **Desde:** Fase 3.

### DAT-06 · Fechas y zonas horarias
- **Regla:**
  - la BD guarda en UTC (`timestamp`);
  - el tenant tiene `zona_horaria`, y los cortes de día, los reportes "de hoy" y los
    vencimientos se calculan en esa zona;
  - la API entrega ISO 8601 con zona, y el frontend formatea con un pipe (UI-05).
- **Por qué:** en SaaS conviven tenants en zonas distintas, y un "hoy" mal calculado mueve
  ventas de un corte a otro.
- **Verifica:** un test de un reporte diario con un tenant en otra zona (ventas a las 23:30 y a
  las 00:30 locales).
- **Desde:** Fase 1, en la configuración; Fase 6, en los reportes.

### DAT-07 · Folios por serie
- **Regla:**
  - los folios visibles (venta, apartado, devolución, corte, recibo) son consecutivos por
    `(tenant, tipo, serie)`;
  - la serie se configura por sucursal o por terminal;
  - se asignan en la transacción del documento con bloqueo sobre la fila del contador, nunca
    con `MAX()+1`;
  - el id interno y el folio son campos distintos.
- **Por qué:** con varias terminales en LAN, `MAX()+1` repite folios; además, Lite mezclaba el
  id y el folio en `Folio::formato`.
- **Verifica:** un test de concurrencia (dos ventas simultáneas en la misma serie dan folios
  distintos y consecutivos).
- **Desde:** Fase 4.

### DAT-08 · Identificadores
- **Regla (D1):**
  - las tablas transaccionales (documentos, líneas, libros, pagos) usan `id` bigint
    autoincremental más `ulid` único;
  - la API expone el `ulid`;
  - los catálogos pequeños pueden exponer solo el `id`.
- **Por qué:** en LAN o en escritorio sin conexión, una terminal debe poder crear registros sin
  chocar al sincronizar, y exponer ids consecutivos invita a enumerar.
- **Verifica:** el test de esquema y los tests de la API (las rutas usan `{ulid}`).
- **Desde:** Fase 3.

### DAT-09 · Unicidad siempre con tenant
- **Regla:**
  - todo índice `UNIQUE` de datos de negocio incluye `tenant_id` como primera columna
    (código de barras, SKU, RFC, nombre de categoría, folio);
  - la validación `Rule::unique` lleva el mismo scope;
  - los códigos de barras importados de un cliente se conservan tal cual, nunca se regeneran.
- **Por qué:** el `UNIQUE` global de Pro impide que dos tenants usen el mismo código de
  proveedor (C4), y el cliente de ropa no puede reetiquetar su mercancía (L-30).
- **Verifica:** un test de esquema que revisa cada índice único de las tablas con `tenant_id`, y
  un test de dos tenants con el mismo código de barras.
- **Desde:** Fase 1, para el código de barras; Fase 3, para el resto.

### DAT-10 · No se borra lo que tiene historia
- **Regla:**
  - un registro con documentos o movimientos asociados (producto, variante, cliente,
    proveedor, usuario, sucursal) se desactiva (`activo = false`), no se elimina;
  - el borrado físico solo procede sin dependencias, y la respuesta lo explica
    (`tiene_movimientos`);
  - los registros protegidos (Público General, último admin) se bloquean en la Action.
- **Por qué:** en Lite se bloqueó eliminar una sucursal con stock y el último admin después de
  encontrarlos como bugs.
- **Verifica:** un test por entidad (borrar con historia → 422; desactivar → 200).
- **Desde:** Fase 3.

### DAT-11 · Migraciones: una sola fuente
- **Regla:**
  - el esquema vive solo en migraciones de Laravel, y no hay `schema.sql` paralelo;
  - la BD de tests se construye con `RefreshDatabase` más factories;
  - **hasta que haya datos productivos en la nueva base**, las migraciones del dominio se
    reescriben (no se apilan `add_*`); desde la primera instalación productiva, solo hacia
    adelante;
  - retirar una columna es un ciclo de tres pasos: dejar de escribirla, migrar los datos y
    borrarla en una versión posterior.
- **Por qué:** en Lite cada cambio se escribía en el migrador, el `schema.sql`, el fixture y una
  bandera de sesión (L-27).
- **Verifica:** CI corre `migrate:fresh` y `migrate:rollback` sobre una base vacía, y un test
  compara el esquema resultante contra el snapshot.
- **Desde:** Fase 1.

### DAT-12 · UTF-8 de extremo a extremo
- **Regla:**
  - la BD usa `utf8mb4` / `utf8mb4_0900_ai_ci`, y la conexión el mismo charset;
  - los archivos van en UTF-8 sin BOM;
  - los importadores detectan y convierten la codificación del archivo antes de guardar;
  - prohibido guardar U+FFFD o texto con doble codificación.
- **Por qué:** 265 filas con doble codificación UTF-8 en Lite (L-09).
- **Verifica:**
  - un test del importador con un CSV en Windows-1252 y otro en UTF-8 con BOM;
  - una búsqueda en CI de `\xEF\xBF\xBD` y `Ã` en código y semillas;
  - el comando `conciliar:texto`, que detecta doble codificación.
- **Desde:** Fase 1.

### DAT-13 · Respaldos con formato propio
- **Regla:**
  - un respaldo es un archivo con manifiesto (versión de la app y del esquema, tenant, fecha,
    checksum SHA-256) más los datos;
  - restaurar valida el checksum y la versión antes de tocar la BD, y migra hacia adelante
    después de restaurar;
  - nunca se ejecuta SQL arbitrario subido por el usuario.
- **Por qué:** validar SQL subido por el usuario en Lite fue frágil (comentarios, cadenas,
  `/*! */`) (L-13).
- **Verifica:** un test de ida y vuelta (respaldar, restaurar y conciliar libros) y un test de
  archivo alterado (→ rechazo).
- **Desde:** Fase 8.

### DAT-14 · Nada se descarta en silencio
- **Regla:**
  - `Model::preventSilentlyDiscardingAttributes()`, `preventLazyLoading()` y
    `preventAccessingMissingAttributes()` activos fuera de producción;
  - los modelos declaran `$fillable` o `#[Fillable]` coherente con su migración.
- **Por qué:** en Pro, un `#[Fillable]` desincronizado descartó campos sin avisar (L-32, C7).
- **Verifica:** `AppServiceProvider` con las tres llamadas y la suite corriendo con ellas.
- **Desde:** Fase 1.

### DAT-15 · Costo de inventario
- **Regla (D2):**
  - el costo de inventario es el promedio ponderado por variante y sucursal, en
    `decimal(12,2)` (DAT-02);
  - se recalcula en cada entrada con costo (compra, ajuste de entrada, carga inicial) como
    `(existencia × promedio + cantidad × costo) / (existencia + cantidad)`, dentro de la Action
    y con `lockForUpdate()` (ARQ-04);
  - si la existencia previa es cero o negativa, el promedio pasa a ser el costo de la entrada;
  - las salidas no cambian el promedio;
  - el último costo de compra se guarda aparte, solo como dato informativo;
  - la foto de la línea (DAT-03) usa el promedio.
- **Por qué:** la utilidad queda estable y comparable entre sucursales; con el último costo
  salta con cada compra, y sin costo congelado cambia la utilidad histórica (L-10).
- **Verifica:** tests de la Action de compra (dos compras a distinto costo dan el promedio
  esperado; con existencia cero o negativa queda el costo de la entrada) y de la foto de venta.
- **Desde:** Fase 3.

## Excepciones

Ninguna acordada.
