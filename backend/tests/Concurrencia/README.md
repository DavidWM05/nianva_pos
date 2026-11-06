# Concurrencia real (ARQ-04a)

El grupo `concurrencia` está excluido de `php artisan test`; se activa explícitamente
con `--group=concurrencia`. Con SQLite falla: no se omite ni simula el bloqueo.

Usa una **base MySQL 8 exclusiva y desechable**, nunca la base de desarrollo ni producción.
En PowerShell, desde `backend/`, con la base ya creada:

```powershell
$env:APP_ENV = 'testing'
$env:DB_CONNECTION = 'mysql'
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '3306'
$env:DB_DATABASE = 'nianva_concurrencia'
$env:DB_USERNAME = 'root'
$env:DB_PASSWORD = 'tu-clave-de-pruebas'
$env:DB_URL = ''
php artisan migrate --force
php artisan test --group=concurrencia
```

Las variables del proceso prevalecen sobre los valores por defecto de `phpunit.xml`.
No uses configuración cacheada. El usuario necesita acceso a la base y el privilegio
`PROCESS` y lectura de `performance_schema.data_lock_waits` y `threads` (el job usa root en su servicio
aislado). El job **Concurrencia (MySQL)** migra su propia base con `mysql:8.4`.

La migración completa en MySQL también comprueba el orden de las migraciones: en SQLite
una FK hacia una tabla que se crea después no falla. Así se encontró que `insumos` se creaba
antes que `unidades_medida` (mismo prefijo de fecha); la de `unidades_medida` pasó a
`2026_08_09_000001` (DAT-11).

Los fixtures se construyen con factories y se confirman, sin `RefreshDatabase`: los
procesos hijos deben verlos. Cada ejecución crea su tenant y conserva los datos para
diagnóstico; la instancia/base se desecha al terminar. No reutilices esa base para otras
suites. Los hijos y la conexión bloqueadora se cierran incluso si falla una aserción.

`ProcesosConcurrentes` inicia hijos con Symfony Process, transmite el mismo entorno de
base de datos y espera evidencia de `LOCK WAIT` en `performance_schema.data_lock_waits`
(sin la caché de `information_schema.innodb_trx`) con un plazo máximo; no se
deduce un bloqueo por un sleep. El padre bloquea el stock en una segunda conexión y
lanza dos `RegistrarVenta` para la última unidad. Ambos deben esperar; al liberar,
solo una venta se confirma, con stock cero y un movimiento de kardex.
Los hijos publican eventos JSONL en archivos temporales propios para evitar el buffering
de stdout en Windows; el helper elimina esos archivos al cerrar los procesos.

**Detalle del código actual:** el upsert de inventario también toma un bloqueo exclusivo.
Por eso quitar `lockForUpdate()` puede mantener la espera y el stock correcto. El hijo
también publica el SQL realmente ejecutado y su nivel de transacción con `DB::listen`;
se exige `SELECT ... FOR UPDATE` dentro de la transacción. Esa aserción detecta la
mutación sin sustituir las consultas. No se atribuye al SELECT la espera del upsert.

Para la mutación, retira temporalmente `->lockForUpdate()` de la lectura de stock en
`InventarioService`, ejecuta el grupo y restaura el archivo: debe fallar con
«La lectura del saldo debe ejecutar SELECT FOR UPDATE». La guarda de arquitectura se
prueba agregando temporalmente un bloqueo a un Service fuera de `PENDIENTES`.

Para nuevas etapas, reutiliza el helper y agrega operaciones al script de prueba
`operacion.php`; verifica cada saldo y rollback con filas propias del caso.
