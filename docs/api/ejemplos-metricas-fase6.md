# Ejemplos de contrato para P1

Ejemplos ilustrativos para diseñar la plantilla. S2 conectará estas cifras a las rutas reales, validará su paridad y regenerará OpenAPI. Los importes son cadenas decimales con dos dígitos, las cantidades de inventario usan cadenas con la precisión registrada y los conteos son enteros. La plantilla recibe totales del conjunto filtrado independientes de la página visible. P1 puede modelar el estado del botón Exportar, cuya descarga real llega en S3.

## Ventas · GET /api/v1/ventas/reporte

```json
{
  "data": {
    "periodo": { "desde": "2026-06-11", "hasta": "2026-06-11", "zona_horaria": "America/Tijuana" },
    "sucursal_id": 3,
    "totales": {
      "vendido": "100.00",
      "tickets": 1,
      "ticket_promedio": "100.00",
      "mercancia_devuelta_simple": "10.00",
      "mercancia_recibida_en_cambios": "20.00",
      "mercancia_entregada_en_cambios": "30.00",
      "ventas_netas_comerciales": "100.00"
    },
    "por_dia": [
      { "fecha": "2026-06-11", "vendido": "100.00", "ventas_netas_comerciales": "100.00" }
    ],
    "detalle": [
      { "tipo": "venta", "folio": "V-3-24", "fecha": "2026-06-11T09:30:00-07:00", "importe_comercial": "100.00" }
    ]
  },
  "meta": { "page": 1, "rows": 1, "total": 3, "filtros_aplicados": { "sucursal_id": 3 }, "permisos": { "exportar": false } }
}
```

La gráfica de ventas usa `por_dia`, con un punto por fecha civil en orden ascendente. Los días sin operaciones llevan importes cero. `detalle` puede representar venta, devolución simple o cambio. El importe comercial del cambio es mercancía entregada menos recibida.

## Inicio · GET /api/v1/inicio/resumen

```json
{
  "data": {
    "fecha_corte": "2026-06-11",
    "zona_horaria": "America/Tijuana",
    "sucursal_id": 3,
    "ventas_hoy": { "cantidad": 1, "total": "100.00" },
    "gastos_hoy": "0.00",
    "ventas_netas_comerciales_mes": "100.00",
    "productos_activos": 8,
    "alertas_stock_bajo": 2,
    "ventas_ultimos_siete_dias": [
      { "fecha": "2026-06-05", "vendido": "0.00" },
      { "fecha": "2026-06-06", "vendido": "0.00" },
      { "fecha": "2026-06-07", "vendido": "0.00" },
      { "fecha": "2026-06-08", "vendido": "0.00" },
      { "fecha": "2026-06-09", "vendido": "0.00" },
      { "fecha": "2026-06-10", "vendido": "0.00" },
      { "fecha": "2026-06-11", "vendido": "100.00" }
    ],
    "ranking_variantes": [
      { "unidad": { "id": 1, "nombre": "Pieza" }, "variantes": [{ "variante_id": 18, "producto_nombre": "Agua 1 L", "cantidad_base": "5.000" }] }
    ],
    "apartados_por_vencer": []
  }
}
```

La serie termina en el día civil del corte. El estado de caja conserva su fuente actual. `ventas_hoy.total` corresponde a Vendido, mientras que el KPI mensual corresponde al neto comercial.

## Cartera y CRM

Para las pruebas de plantilla, Cartera usa saldo actual pendiente, vencido y desglose por antigüedad, con `fecha_corte` civil y los detalles paginados. CRM conserva los segmentos actuales, el resumen de interacciones, puntos y campañas, a nivel tenant. Ninguno usa filtro de sucursal. P1 puede usar la misma plantilla con gráficas omitidas para ambos.
