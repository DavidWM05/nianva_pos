# Manual técnico de Núcleo

Documento de referencia profunda — no es un README de setup (para eso, ver
[README.md](../README.md), [backend/README.md](../backend/README.md) y
[frontend/README.md](../frontend/README.md)). Este documento asume que ya tienes el proyecto
corriendo y cubre tres cosas: el mapa de dependencias entre módulos, el catálogo de patrones que
ya están resueltos y no deberían reinventarse, y el runbook para arrancar un producto nuevo
clonando este repo. Para la decisión de arquitectura original y el schema SQL completo, ver
[nucleo_arquitectura.md](nucleo_arquitectura.md) (mismo directorio).

Todo lo que sigue está verificado contra el código real al momento de escribirlo (grep directo
sobre `app/Modules/*/Http/Controllers`, `bootstrap/app.php`, los seeders, y los componentes de
`libs/ui-shared`). Donde algo no está resuelto o documentado en el código, se dice explícitamente
en vez de inferir cómo "debería" funcionar.

---

## 1. Mapa de dependencias entre los 10 módulos

Dirección permitida de dependencia **a nivel de `Services`** (un módulo "nuevo" puede importar de
uno "más viejo" en este orden, nunca al revés):

```
Núcleo
  └── (fundamento: tenants, usuarios, roles/permisos, auth, métodos de pago --
       ningún módulo de negocio importa Services de aquí; sí se usan sus
       utilidades transversales desde cualquier Controller: TenantContext
       inyectado directamente, y el middleware `permiso:modulo.accion`
       aplicado por alias en las rutas, sin import en la clase)

Inventario         Crm
     \             /
      \           /
       Precios   /              (Precios -> Inventario)
          \     /
           \   /
            Tpv                 (Tpv -> Crm + Inventario + Precios)
           /    \
          /      \
   Apartados   Devoluciones     (Apartados -> Crm + Inventario + Precios + Tpv)
                                 (Devoluciones -> Inventario + Tpv)
      Gastos                    (Gastos -> Tpv, pero SOLO Model/Exception,
                                  NUNCA Service -- ver CajaService)

Configuración, Auditoría: sin dependencias de negocio hacia ningún otro módulo.
```

Auditoría es un caso especial: no depende de los otros 10 módulos en el sentido de
Service→Service, pero **`config/auditoria.php` sí conoce el FQCN de un modelo de cada módulo
auditado** — es, a propósito, el único archivo de toda la app que tiene ese conocimiento
transversal (ver §2.2).

**Dependencia externa (no es un módulo del grafo de arriba)**: `Núcleo` también le habla a un
sistema fuera de este repo, el servidor central de licencias (repo `Servidor_Licencias`), vía
`LicenciaClienteService` (HTTP, `POST /api/validar-licencia`). No es una dependencia
Service→Service entre módulos de este monolito, así que no aparece en el diagrama — pero es la
única integración saliente por red que existe hoy en todo el backend. Ver el patrón completo en
§2.6.

### Regla de orquestación: Controllers sí, Services nunca

La dirección de arriba es la regla para `Services`. A nivel de `Http\Controllers` existe una
**excepción formal, ya usada 3 veces en el código**: un Controller puede importar directamente un
`Service` o `Model` de un módulo "posterior" en el grafo cuando necesita un dato de presentación o
un cálculo autoritativo que el backend no puede confiar al cliente — pero el `Service` propio del
módulo nunca debe enterarse de esa dependencia. Las 3 instancias documentadas hoy:

| # | Controller (módulo) | Importa de | Para qué |
|---|---|---|---|
| 1 | `CajaController::actual()` / `::cerrar()` (Tpv) | `GastoService` (Gastos) | `total_gastos` autoritativo al cerrar caja — el monto no puede venir del cliente. |
| 2 | `ProductoVarianteController::store()` (Inventario) | `ConfiguracionTenant` (Configuración) | Leer el flag `codigo_barras_automatico` del tenant para decidir si autogenerar el código de barras de una variante nueva. |
| 3 | `InicioController::resumen()` (Núcleo) | `Venta` (Tpv), `Apartado` (Apartados) | Resumen de la pantalla de Inicio: ventas del día + apartados por vencer. |

Las tres siguen el mismo criterio, citado literalmente en el docblock de `InicioController`
(que a su vez cita a las otras dos): **"los Controllers pueden orquestar entre módulos para
presentación/cálculo, los Services nunca"**. En los tres casos, el `Service` propio del módulo
(`CajaService`, `InventarioService`, y en el caso de Inicio no existe un `Service` dedicado)
sigue sin importar nada del módulo "posterior" — la orquestación vive únicamente en la capa Http.

Si necesitas una cuarta instancia de este patrón, es válida siempre que: (a) la orquestación
quede en el Controller, nunca en el Service; (b) el docblock del método la documente
explícitamente, citando las anteriores, para que esta tabla se pueda mantener actualizada.

---

## 2. Catálogo de patrones establecidos

### 2.1 Pago mixto: tablas `*_pagos`, nunca un campo de método en la entidad padre

Ninguna entidad transaccional (`ventas`, `apartado_abonos`, `devoluciones`) tiene una columna de
método de pago. Cada una tiene, en cambio, una tabla hija dedicada con 1+ filas por operación:

| Entidad padre | Tabla de pagos | 
|---|---|
| `ventas` | `venta_pagos` (`venta_id`, `metodo_pago_id`, `monto`) |
| `apartado_abonos` | `apartado_abono_pagos` (`abono_id`, `metodo_pago_id`, `monto`) |
| `devoluciones` | `devolucion_pagos` (`devolucion_id`, `metodo_pago_id`, `monto`) — el monto puede representar un reembolso o un cobro de diferencia, según `devoluciones.diferencia` |

Toda venta, tenga uno o varios métodos de pago, siempre tiene 1+ filas en `venta_pagos` — nunca
hay un valor mágico tipo `forma_pago = 'mixto'`. Un corte de caja simplemente suma
`venta_pagos` agrupado por `metodo_pago_id`, sin `COALESCE` ni casos especiales. Regla de negocio
que vive en la capa de aplicación, no en el schema: solo el método `efectivo` puede recibir más
del monto pendiente y generar vuelto; el resto se autolimita al saldo restante. (Detalle completo
y el razonamiento contra los dos sistemas legados que originaron esta decisión: `nucleo_arquitectura.md` §3.9.)

### 2.2 Auditoría desacoplada vía config + Observer

Ver el detalle completo, con ejemplo de código, en
[`backend/README.md#auditoría-desacoplada`](../backend/README.md#auditoría-desacoplada). Resumen:
`config/auditoria.php` → array `auditables` con el FQCN de cada modelo auditado →
`AuditoriaServiceProvider::boot()` registra `AuditObserver` en cada uno → `AuditObserver` escribe
en la tabla `auditoria` (create/update/delete, diff en JSON) sin conocer ningún modelo en
particular. Agregar auditoría a un modelo nuevo es una línea en ese array, nunca tocar el modelo
ni el módulo Auditoría.

**No resuelto en el código**: el schema documentado en `nucleo_arquitectura.md` (§3.4) también
define una tabla `logs_sistema` / modelo `LogSistema` (`app/Modules/Auditoria/Models/LogSistema.php`,
con un método estático `registrar()`) para errores técnicos, separada de `auditoria` (cambios de
negocio) por tener consumidores distintos. La tabla y el modelo existen, pero **`LogSistema::registrar()`
no se llama desde ningún lugar de la app hoy** (verificado por grep) — no hay un exception handler
ni middleware que lo alimente automáticamente. Si tu producto necesita ese log de errores, hay que
conectarlo (p. ej. desde `bootstrap/app.php`, junto a los `$exceptions->render()` de §2.5) — no
asumas que ya está funcionando.

**También no resuelto**: `LicenciaLocal` (ver §2.6) no está en el array `auditables` de
`config/auditoria.php` (verificado — no aparece) — cambios de estado de licencia (activar,
revalidar, que el servidor la marque revocada) hoy no dejan rastro en la tabla `auditoria`.
Agregarlo es la misma línea de siempre si se decide que vale la pena.

### 2.3 RBAC con permisos `modulo.accion`

- Catálogo plano: tabla `permisos` (`modulo`, `accion`, `nombre` = `"{modulo}.{accion}"`, único).
  Sembrado por `NucleoRolesPermisosSeeder::PERMISOS`
  (`backend/app/Modules/Nucleo/Database/Seeders/NucleoRolesPermisosSeeder.php`) — agregar un
  permiso nuevo es añadir una entrada a ese array constante, sin migración.
- Dos roles de sistema sembrados por defecto: `admin` (recibe automáticamente **todos** los
  permisos vía `Permiso::all()->pluck('id')` — no hace falta listar nada a mano cuando agregas un
  permiso nuevo) y `vendedor` (lista explícita `PERMISOS_VENDEDOR`, pensada para operar el POS del
  día a día). Un rol de sistema tiene `tenant_id = null` y `es_sistema = true` — reusable por
  todos los tenants, no se puede editar salvo por un superadmin (`Usuario::esSuperadmin()`, ver
  el guard `rechazarSiEsSistema()` en `RolController`).
- Verificación: `Usuario::tienePermiso(string $nombrePermiso): bool` — `true` automático si
  `esSuperadmin()`, si no, consulta si alguno de sus roles tiene ese permiso.
- Gating de rutas: middleware `permiso:modulo.accion` (`CheckPermiso`,
  `app/Modules/Nucleo/Http/Middleware/CheckPermiso.php`) — 403 si `tienePermiso()` es `false`.
  Nunca se gatea por nombre de rol, siempre por permiso puntual.
- Catálogo de permisos hoy (módulo → acciones, ver el array completo en el seeder):
  `tenants`/`sucursales`/`roles`/`permisos`/`usuarios`/`metodos_pago`/`inventario`
  (ver/crear/editar/eliminar), `compras` (ver/crear), `clientes`
  (ver/crear/editar/eliminar), `ventas` (ver/crear/anular), `caja` (ver/abrir/cerrar),
  `apartados` (ver/crear/abonar/cancelar), `devoluciones` (ver/crear), `gastos` (ver/crear),
  `reglas_precio`/`cupones` (ver/crear/editar/eliminar), `configuracion` (ver/editar),
  `reportes` (ver), `auditoria` (ver).

### 2.4 2FA / dispositivo confiable

- **Obligatorio, no opcional, para admin/superadmin**: `Usuario::requiereDosFactor()` es
  `esSuperadmin() || tieneRol('admin')`. El middleware `EnsureTwoFactorIsConfigured` (alias
  `two-factor.confirmed`) bloquea con **423 Locked** (no 401/403 — la sesión es válida, solo está
  incompleta) cualquier ruta protegida mientras ese usuario no haya confirmado su 2FA.
- **Confirmación reciente para acciones sensibles**: middleware `RequiereDosFactorReciente`
  (alias `dos-factor.reciente`) exige el TOTP de nuevo — sin importar si el dispositivo actual ya
  es uno confiado — para cambiar la contraseña propia (`/password/change`) y para que un admin
  desactive el 2FA de otro usuario (`/usuarios/{id}/desactivar-2fa`). Siempre valida
  `$request->user()`, es decir, **quien ejecuta la acción**, nunca el usuario objetivo — esto es
  lo que permite reutilizar el mismo middleware para "confirmar mi propia contraseña" y para
  "un admin confirma su propio TOTP antes de tocar la cuenta de otro usuario" sin escribir lógica
  nueva.
- **Dispositivo confiable**: `TrustedDeviceService` guarda un token de 64 caracteres, hasheado con
  SHA-256, en `dispositivos_confiables` + una cookie separada de la sesión de Sanctum
  (`dispositivo_confiable`, `httpOnly`, encriptada por el middleware `EncryptCookies` de Laravel).
  Un login posterior desde el mismo dispositivo puede omitir el paso de 2FA — nunca el de
  correo+password. Los días de vigencia (`dias_dispositivo_normal`/`dias_dispositivo_admin`,
  configurables por tenant en `ConfiguracionSeguridad`, tab Empresa del frontend) se calculan
  **una sola vez**, al confiar el dispositivo, y no son retroactivos: cambiar la configuración
  después no altera dispositivos ya confiados.
  Cambiar la contraseña, revocar un dispositivo puntual, o desactivar el 2FA revocan la confianza
  ya otorgada — el siguiente login (desde cualquier dispositivo) vuelve a exigir el segundo
  factor.
- **Desactivar 2FA ya no es autoservicio**: el endpoint viejo (`POST /api/two-factor/disable`,
  iniciado por el propio usuario) se eliminó. Hoy solo un admin/superadmin con el permiso
  `usuarios.editar` puede desactivar el 2FA de **otro** usuario
  (`UsuarioController::desactivarDosFactor()`), confirmando su propio TOTP vía
  `dos-factor.reciente`. Sigue bloqueado si el usuario objetivo requiere 2FA por su rol
  (`requiereDosFactor()`) — ni siquiera un admin puede apagárselo a otro admin.

### 2.5 `error_code` estable para excepciones de negocio

Ver el detalle completo, con ejemplo de código, en
[`backend/README.md#esquema-de-error_code-para-excepciones-de-negocio`](../backend/README.md).
Resumen: excepciones de negocio (`RuntimeException` planas) se mapean una por una en
`bootstrap/app.php` dentro de `withExceptions()`, cada una respondiendo `422` con `message` + un
`error_code` estable + los campos propios de esa excepción. El frontend distingue el error por
`error_code`, nunca parseando `message`. Las 10 excepciones mapeadas hoy (verificado contra
`bootstrap/app.php`): `caja_no_abierta`, `caja_ya_abierta`, `pago_no_cuadra`,
`stock_insuficiente`, `cupon_invalido`, `abono_pago_no_cuadra`, `apartado_estado_invalido`,
`apartado_saldo_insuficiente`, `devolucion_pago_no_cuadra`, `devolucion_sobre_venta_sombra`.

`LicenciaActivacionFallidaException` (ver §2.6) usa el mismo espíritu (excepción propia,
mensaje claro) pero **no está en esta lista** — no se lanza desde ningún Controller, solo desde
`licencia:activar` (CLI), así que no necesita un `error_code` HTTP.

### 2.6 Cliente de servicio externo con período de gracia (licenciamiento)

Único caso hoy de un servicio de Núcleo hablando por red con un sistema fuera de este repo. El
patrón, reutilizable para cualquier integración externa futura:

- **Un solo punto de contacto** (`LicenciaClienteService`, `app/Modules/Nucleo/Services`) — nadie
  más en el backend llama `Http::` hacia el servidor de licencias directamente.
- **Contrato verificado contra el código real del otro lado**, no contra memoria de "cómo
  debería ser" — el docblock de la clase documenta el shape exacto de request/response
  (`token_actual` de entrada, `token` de salida — nombres distintos a propósito, no un typo) y
  qué representa cada código de estado HTTP (200 con `estado` explícito, 404 = nunca
  registrada, 422 = límite de instalaciones del plan violado).
- **Dos entradas con manejo de fallo distinto**: `activar()` (primera vez, sin estado previo del
  cual caer hacia atrás → cualquier fallo es error duro) vs. `revalidar()` (ya hay un
  `licencia_local` existente → un fallo de RED (timeout/conexión) no cambia el estado de
  inmediato, aplica un **período de gracia configurable** contado desde la última validación
  EXITOSA; una respuesta explícita del servidor, sea cual sea, siempre se aplica de inmediato,
  nunca espera gracia).
- **Nunca on-request**: la revalidación corre en un comando programado por el scheduler de
  Laravel (`licencia:revalidar` + `Schedule::command()` en `routes/console.php`), no en cada
  request de un usuario — evita que una caída del servidor central tumbe la app en vivo de cada
  cliente al mismo tiempo.
- **Identificador de instalación separado del tenant**: `InstalacionNucleo::identificador()`
  (tabla `instalacion_nucleo`, una sola fila, sin `tenant_id`) — generado una vez (UUID), nunca
  regenerado, para que el servidor central pueda distinguir instalaciones físicas distintas del
  mismo tenant.

**No resuelto en el código**: no existe ningún middleware ni gate que bloquee o degrade la app
si `licencia_local.estado` es `vencida`/`revocada` — hoy el estado solo se **muestra**
(`GET /api/licencia-local`, tab Licencia del frontend), no se **hace cumplir**. Si tu producto
necesita bloquear funcionalidad cuando la licencia no es válida, eso es lógica nueva que no
existe todavía.

---

## 3. Runbook — cómo arrancar un producto nuevo desde este núcleo

### a. Clonar y renombrar

```bash
git clone <este-repo> mi-producto-nuevo
cd mi-producto-nuevo
```

**No resuelto en el código** — estos tres nombres siguen siendo el placeholder por defecto del
scaffold, nadie los ha parametrizado todavía. Renómbralos a mano:

- `backend/composer.json` → campo `"name"` sigue en `"laravel/laravel"` (el default de
  `laravel new`). Cámbialo a algo como `"tu-org/tu-producto"`.
- `backend/.env` (no `.env.example`, ese se queda como plantilla) → `APP_NAME=Núcleo` — cámbialo
  al nombre real del producto. Se propaga solo a `MAIL_FROM_NAME` y `VITE_APP_NAME`
  (`.env.example` líneas 62 y 70) porque ambos leen `${APP_NAME}`.
- `frontend/package.json` → campo `"name"` sigue en `"@org/source"` — cámbialo al scope/nombre
  real de tu paquete si vas a publicar algo, o dejarlo si el frontend nunca se publica a un
  registro.

No hay ningún otro identificador de "Núcleo" hardcodeado que bloquee un rename — el resto del
código no depende del nombre del proyecto.

**Además, específico de este clon (no un rename, una configuración nueva)**: `backend/.env` →
`LICENCIAS_PRODUCTO_SLUG` debe ser el slug con el que ESTE producto está registrado en el
servidor central de licencias (repo `Servidor_Licencias`, tabla `productos`) — si no coincide,
`licencia:activar` recibe 404 (ver §2.6). `LICENCIAS_SERVIDOR_URL` debe apuntar al servidor de
licencias real, no al de otro producto.

### b. Qué módulos son universales vs. cuáles evaluar

**Esto es una inferencia a partir del grafo de dependencias documentado en §1, no una
categorización que exista ya escrita en el código** — como cualquier inferencia, revisa si aplica
a tu caso concreto antes de borrar un módulo.

- **Universales (ningún otro módulo funciona sin ellos)**: Núcleo (tenants, usuarios, roles,
  auth), Auditoría, Configuración. Todo producto que reutilice este núcleo los necesita tal cual.
- **Ampliamente reusables, pero evalúa si tu vertical los necesita**: Inventario, Precios y
  Promociones, CRM. Ninguno depende de TPV — puedes tener Inventario+CRM sin nunca construir una
  pantalla de venta (ej. un sistema de control de activos internos que reutiliza el catálogo de
  Inventario pero no vende nada).
- **Específicos de un negocio con punto de venta físico/caja**: TPV, y por extensión —porque
  **dependen de TPV** según el grafo de §1— Apartados, Devoluciones y Gastos. Si tu vertical no
  vende productos con cobro en caja (el ejemplo del pedido original: un sistema escolar), estos
  4 módulos probablemente no aplican, y quitar TPV implica quitar los otros 3 (no puedes
  conservar Apartados sin TPV, por ejemplo — `ApartadoService` depende de `VentaService`).

### c. Reskin del frontend sin tocar componentes

Ver [`frontend/libs/design-tokens/README.md`](../frontend/libs/design-tokens/README.md) para el
procedimiento completo (no se duplica aquí). Resumen de una línea: todo color/tipografía/
espaciado/radio vive en `tokens.ts` (+ su espejo `tokens.scss`) — cambiar la marca de un producto
nuevo es editar esos dos archivos, nunca los componentes de `ui-shared` ni el preset de PrimeNG
directamente (`primeng-preset.ts` los lee automáticamente).

### d. Qué no tocar sin pensarlo dos veces vs. qué es seguro personalizar

**No toques a la ligera** (son la base de seguridad/aislamiento multi-tenant de todo el núcleo;
un error aquí es un error de aislamiento de datos entre clientes, no un bug cosmético):

- Los 3 patrones de aislamiento de tenant (`BelongsToTenant`, `BelongsToTenantViaRelacion`, y el
  bypass explícito `Modelo::sinTenant()`) — ver `backend/README.md#aislamiento-de-tenant`.
  Cambiar cómo se resuelve el tenant activo (`TenantContext`/`ResolveTenant`) afecta a las 42+
  tablas de negocio a la vez.
- El mecanismo de auditoría (`config/auditoria.php` + `AuditObserver`) — es genérico a propósito;
  si necesitas comportamiento distinto para un modelo específico, hazlo agregando lógica en ese
  modelo, no bifurcando el Observer.
- La regla de orquestación de §1 (Controllers sí, Services nunca) — si la rompes en un `Service`,
  pierdes la propiedad de que cada `Service` se puede probar/entender sin cargar módulos
  "posteriores".

**Seguro de personalizar libremente por proyecto**:

- Los tokens de diseño (§3.c).
- El catálogo de permisos (`NucleoRolesPermisosSeeder::PERMISOS`) y los roles de sistema que
  siembras — agregar/quitar módulos de negocio implica agregar/quitar sus permisos aquí.
- `NUCLEO_NAV_GROUPS`/`NUCLEO_ITEM_INICIO` (`frontend/apps/nucleo-shell/src/app/modules/modules.config.ts`)
  — la agrupación del sidebar es específica de cada producto.
- Cualquier módulo nuevo, exclusivo de tu vertical (expediente clínico, citas, boletas
  escolares, ...) — vive fuera de los 10 módulos del núcleo, siguiendo la misma estructura de
  carpeta `app/Modules/<TuModulo>` y las mismas reglas de dependencia de §1 (puede depender de
  los módulos del núcleo, nunca al revés).
- Validaciones y copy específicos de negocio dentro de los `Controllers`/formularios existentes.

### e. Checklist mínimo antes de considerar el clon "listo"

- [ ] `php artisan migrate` corre limpio desde una base de datos vacía (sin errores de FK ni de
      orden de migraciones).
- [ ] `php artisan db:seed --class="App\Modules\Nucleo\Database\Seeders\DesarrolloSeeder"` corre
      sin error y deja usuarios de prueba funcionales (ver `backend/README.md#usuarios-de-prueba-para-desarrollo`).
- [ ] Login probado en un navegador real de punta a punta, para **ambos** casos: un usuario sin
      2FA obligatorio (`vendedor@nucleo.test` o equivalente) y uno que sí lo requiere
      (`admin@nucleo.test`, completando el TOTP con el secreto impreso en consola por el seeder).
- [ ] `php artisan test` (backend) en verde.
- [ ] `pnpm exec nx run-many -t test -p nucleo-shell ui-shared` (frontend) en verde.
- [ ] `pnpm exec nx build nucleo-shell` (producción) termina sin errores.
- [ ] `php artisan licencia:activar {tenant_id}` corrido contra el servidor de licencias REAL
      (no un fake) al menos una vez, con `LICENCIAS_PRODUCTO_SLUG`/`LICENCIAS_SERVIDOR_URL` ya
      configurados (ver §3.a) — confirma que el producto está bien registrado ahí antes de
      depender de la revalidación automática.

Ninguno de estos pasos reemplaza un despliegue real a producción (secretos, `APP_ENV=production`,
motor MySQL real en vez de SQLite de test, etc.) — es el mínimo para confirmar que el clon en sí,
antes de agregar lógica de negocio nueva, quedó íntegro.
