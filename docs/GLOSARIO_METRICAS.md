# Glosario de métricas de Fase 6

## Alcance y calendario

Ventas e Inicio usan el alcance de `SucursalOperacion::paraFiltro`. Sin `sucursales.todas`, se usa la sucursal propia incluso si se solicita otra. Con el permiso, omitir la selección consolida el tenant y elegir una sucursal válida del tenant limita la consulta a ella. Cartera y CRM se consultan a nivel tenant con sus permisos actuales. La cartera vencida es una foto del saldo al corte actual.

Las fechas de filtro son días civiles del tenant en su zona IANA. Se incluye todo el último día local usando un intervalo UTC semiabierto: desde la medianoche inicial hasta la medianoche siguiente al último día. Los instantes publicados usan ISO 8601 con zona. Las fechas de vencimiento se publican como fechas civiles, sin convertirlas en instantes UTC.

## Ventas y cambios

| Métrica | Fórmula y población |
|---|---|
| Vendido | Suma de `ventas.total` en ventas completadas que no son sombras, por fecha de la venta y sucursal. |
| Tickets | Número de ventas en la misma población de Vendido. |
| Ticket promedio | Vendido dividido por Tickets. Si no hay tickets, devuelve `0.00`. |
| Mercancía devuelta simple | Suma de `monto_devolucion` de las devoluciones simples en la fecha y sucursal de la devolución. |
| Mercancía recibida en cambios | Suma de `monto_devolucion` de las operaciones de cambio en la fecha y sucursal del cambio. |
| Mercancía entregada en cambios | Suma de `monto_cambio` de las mismas operaciones. |
| Ventas netas comerciales | Vendido − mercancía devuelta simple − mercancía recibida en cambios + mercancía entregada en cambios. |
| Ventas netas comerciales del mes | La misma fórmula, desde el primer día del mes local actual hasta el día local del corte. Es la etiqueta que reemplaza «Ingresos del mes» en Inicio. |

La venta sombra queda fuera de Vendido. Reembolsos y cobros son cifras distintas del neto comercial. El flujo de dinero queda fuera de esta entrega. El desglose de pagos de venta existente conserva su población y su etiqueta de pagos. El detalle comercial usa la fecha y sucursal de cada operación, aunque su venta de origen sea anterior al periodo.

## Ranking y stock bajo

- **Ranking por variante.** Acumula la cantidad base de las líneas de ventas de la población de Vendido. Por línea se multiplica `venta_detalles.cantidad` por el `factor` guardado (1 para unidad base) y se agrupa con el `unidad_medida_id` de la foto. Muestra el nombre actual del producto y la unidad. Mantiene un ranking por unidad comparable, en orden de cantidad descendente, con desempate por id de variante ascendente.
- **Stock bajo.** Cuenta filas de `inventario_stock` de variantes activas y sucursales incluidas donde `stock_minimo > 0` y `stock_actual <= stock_minimo`. El mínimo cero indica que la fila no tiene umbral. En consolidado cada fila elegible aporta una alerta, incluso si la misma variante figura en otra sucursal. La cifra se rotula «Alertas de stock bajo».

Utilidad, margen y merma corresponden a S4/P4, después de aprobar las decisiones contables de F6-3.

## Rentabilidad comercial

| Métrica | Definición |
| --- | --- |
| Ingreso sin IVA | El neto comercial de F6-2 menos el IVA de venta que corresponda a ese neto. Se suman las fotos efectivas de ventas completadas y entregas de cambios, y se restan las de artículos devueltos o recibidos en cambios. |
| Costo neto de ventas | Costo unitario registrado multiplicado por la cantidad en unidad base de cada línea. Las ventas y las entregas de cambios lo suman. Las devoluciones y los recibidos de cambios lo restan al costo congelado de origen. |
| Utilidad bruta a costo registrado | Ingreso sin IVA menos costo neto de ventas. |
| Margen sobre ingreso sin IVA | Utilidad bruta dividida por ingreso sin IVA, multiplicada por 100. Se calcula sobre los importes consolidados. Cuando el ingreso es cero o negativo se muestra «No aplica». |
| Merma de devoluciones y cambios | Costo congelado de las líneas devueltas con destino a merma. Se reclasifica del costo de ventas y se carga una vez. El resultado después de merma es la utilidad bruta menos esa pérdida. |
| Líneas sin costo | Conteo de fotos participantes con costo registrado igual a cero. La utilidad y el margen se publican con un aviso de cobertura. |

La fecha y la sucursal son las de la operación reconocida. Los cambios conservan fotos independientes de lo recibido y lo entregado. La venta sombra queda fuera del cálculo de ventas y su entrega se reconoce desde los renglones del cambio. Las cifras usan el calendario y alcance del reporte de ventas. Inicio usa el mes civil del tenant. La consulta es compartida. El permiso de lectura y `reportes.costos` habilitan los agregados, y el CSV exige además `reportes.exportar`. Los costos unitarios quedan en las fotos internas de las operaciones.
