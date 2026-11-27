# Licencia del POS instalado

La activación solicita el código con entrada oculta al ejecutar `php artisan licencia:activar ID_TENANT`. Para automatización existe la opción `--codigo`. La revalidación usa el código cifrado de `licencia_local` y la tarea `licencia:revalidar` del scheduler. El recurso de consulta publica estado, modo operativo, última confirmación y soporte.

El responsable de producto agrega el ID de `nianva-pos` en `config/licencias.php` y publica la llave PEM oficial en `backend/resources/licencias/<kid>.pem` antes de entregar a un cliente. Se distribuyen solo llaves públicas. En una rotación se agrega la nueva llave antes de que el emisor la use. Se conservan las llaves anteriores mientras haya tokens vigentes que las necesiten. Los tests generan sus propias llaves. Las llaves privadas de prueba permanecen en memoria.

`LICENCIAS_ARCHIVO_INSTANCIA` permite ubicar el UUID fuera de la base de datos. La instalación conserva ese archivo entre reinicios. El respaldo de datos de Fase 8 lo excluye. Un traslado autorizado requiere liberar la instancia en el panel del emisor y volver a activar el POS. El JWT devuelto tras validar firma la instalación y el ID del producto.

`LICENCIAS_PERMITIR_CONCESION_LOCAL` es falso por defecto. Fase 8 mantiene ese valor al instalar para clientes. Desarrollo y Playwright habilitan explícitamente la concesión de instalación. Sin una concesión aplicable, el catálogo queda en Básico.

## Pantalla de licencia en P2

`GET /api/v1/licencia-local`, `GET /api/v1/sesion` y los controles de PIN siguen accesibles en solo lectura. La activación y la revalidación se ejecutan por CLI en S2. Si P2 ofrece esa recuperación desde la pantalla, sus futuras rutas deberán quedar fuera de `licencia.operativa`. La selección de terminal por `PUT /api/v1/sesion/terminal` sigue bajo el bloqueo. P2 debe permitir llegar a la pantalla de licencia sin pasar por esa selección.

## PRO-01

El PR de S2 requiere la etiqueta `pro-01-autorizado`.

- `LicenciaClienteServiceTest.php`. Solicitudes con código de activación, fixtures RS256 y expectativas aprobadas de SaaS y gracia. El método `test_servidor_responde_vencida_explicito_se_refleja_de_inmediato` pasó a `test_servidor_responde_vencida_explicito_inicia_la_gracia`.
- `ActivarLicenciaCommandTest.php` y `RevalidarLicenciasCommandTest.php`. Código y tokens firmados en los fixtures de comandos.
- `LicenciaLocalControllerTest.php`. El fixture de gracia usa una licencia anual firmada.
- `LicenciaInstaladaTest.php`. Casos nuevos de contrato, verificación, identidad, gracia, perpetuidad, concesión y solo lectura.
