# CSV de reportes

Cada descarga requiere autenticación, el permiso de lectura indicado y el permiso
reportes.exportar.

| GET bajo /api/v1 | Lectura | Columnas de detalle |
| --- | --- | --- |
| /ventas/reporte/exportar | reportes.ver | tipo, folio, fecha, importe_comercial |
| /cuentas-cobrar/reporte/exportar | reportes_cuentas_cobrar.ver | id, cliente_nombre, fecha_vencimiento, saldo_pendiente |
| /cuentas-pagar/reporte/exportar | reportes_cuentas_pagar.ver | id, proveedor_nombre, fecha_vencimiento, saldo_pendiente |
| /crm/reporte/exportar | reportes_crm.ver | id, asunto, segmento, destinatarios, enviado_en |

La descarga usa los filtros y el alcance del reporte JSON. Devuelve todas las filas
del detalle filtrado en el mismo orden. Los parámetros de paginación se validan
como en el JSON y no recortan la descarga. Si el detalle tiene más de 10 000 filas,
el servidor responde 422 con error_code reporte_exportacion_limite y el campo limite.

El archivo CSV se entrega como adjunto, codificado en UTF-8 y separado por comas.
Después del encabezado y las filas de detalle hay una línea vacía, seguida del
encabezado metrica,valor y los totales del conjunto filtrado. El nombre de cada
métrica sigue su ruta en data del JSON, por ejemplo totales.vendido o
por_antiguedad.al_dia. Los importes conservan su precisión y signo.
Los campos de texto que podrían interpretarse como fórmulas llevan un apóstrofo inicial.
