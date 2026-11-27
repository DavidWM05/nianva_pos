# Ejemplos de sesión para P1

Los JSON contienen respuestas completas de `GET /api/v1/sesion` para Básico sin licencia, Avanzado anual en gracia por vencimiento confirmado y Pro perpetua en entorno propio con dos sucursales. Viven fuera de `src/` y los tests de P1 pueden leerlos desde aquí. El código de producción usa el contrato generado.

`SesionPorPlanTest` compara cada respuesta con su JSON. El reloj se fija en `2026-11-28T12:00:00Z`. Las factories fijan el nombre, apellido y correo del usuario y los nombres de la sucursal y de la terminal seleccionada. Solo los IDs se sustituyen en la respuesta, por 101 para usuario, 201 para tenant, 301 para sucursal y 401 para terminal. Los campos relacionados reutilizan el mismo ID. Los permisos, las features, las fechas y los límites se comparan completos.

Para regenerar desde `backend` en PowerShell:

```powershell
$env:REGENERAR_FIXTURES_SESION = '1'
php artisan test --filter=test_los_ejemplos_de_p1_coinciden_con_la_sesion_real
Remove-Item Env:REGENERAR_FIXTURES_SESION
```

`gracia_hasta` es el instante UTC en formato RFC 3339 con `Z` en que acaba una gracia vigente. El corte es exclusivo y el campo vuelve a `null` al agotarse. `soporte_hasta` es la fecha UTC de calendario `YYYY-MM-DD` del JWT verificado. Informa hasta cuándo hay soporte para actualizaciones.

La sesión central tiene `plan`, `limites`, `licencia`, `perfil_giro`, `sucursal` y `terminal` en `null`. Una sesión comercial sin sucursal conserva su plan, límites, licencia y perfil y tiene `sucursal` y `terminal` en `null`.
