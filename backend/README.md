# Backend — Núcleo

API Laravel 13 (PHP 8.3) del núcleo reutilizable. Monolito modular: cada dominio de negocio
vive en su propia carpeta bajo `app/Modules/<Modulo>` (migraciones, modelos, servicios,
controllers, providers propios), no hay una carpeta `app/Http`/`app/Models` compartida entre
módulos. Ver [`docs/nucleo_arquitectura.md`](../docs/nucleo_arquitectura.md) para el detalle
completo de arquitectura y el schema SQL de las 42 tablas.

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan test
```

`--seed` corre `NucleoRolesPermisosSeeder` (roles `admin`/`vendedor` y su catálogo de
permisos `modulo.accion`) y `MetodosPagoSeeder` (catálogo global Efectivo/Tarjeta/
Transferencia). Ninguno de los dos crea tenants ni usuarios — ver la sección
["Usuarios de prueba para desarrollo"](#usuarios-de-prueba-para-desarrollo) más abajo para
eso.

## Los 10 módulos

| Módulo | Carpeta | Resuelve |
|---|---|---|
| Núcleo | `app/Modules/Nucleo` | tenants, sucursales, usuarios, roles/permisos, autenticación (login, 2FA, dispositivos confiables), métodos de pago |
| Auditoría | `app/Modules/Auditoria` | historial de create/update/delete de los modelos listados en `config/auditoria.php`, errores del sistema |
| Inventario | `app/Modules/Inventario` | catálogo (productos/variantes), stock por sucursal, kardex, compras, proveedores |
| Precios y Promociones | `app/Modules/Precios` | reglas de descuento (%, monto fijo, nxm, bundle) y cupones |
| CRM | `app/Modules/Crm` | clientes y financiamiento propio del negocio (`planes_pago_cliente`) |
| TPV / Ventas | `app/Modules/Tpv` | ventas, pagos mixtos, apertura/cierre de caja |
| Apartados | `app/Modules/Apartados` | layaway con abonos y pagos mixtos por abono |
| Devoluciones | `app/Modules/Devoluciones` | devoluciones y cambios, con pago/reembolso mixto |
| Gastos | `app/Modules/Gastos` | egresos de caja (sin pantalla propia — vive dentro de la vista de caja de TPV) |
| Configuración | `app/Modules/Configuracion` | datos de la empresa (moneda, ticket, logo) y ajustes de backup |

## Aislamiento de tenant

Shared database con `tenant_id` en cada tabla de negocio. El tenant activo de la request vive
en `TenantContext` (`app/Modules/Nucleo/Services/TenantContext.php`) — resuelto por el
middleware `ResolveTenant` a partir del usuario autenticado, nunca leído directo de
`Auth::user()->tenant_id` desde otro módulo. Sobre esa base, cada modelo Eloquent usa uno de
tres patrones:

**1. `BelongsToTenant`** — el modelo tiene su propia columna `tenant_id`. El trait registra un
global scope que filtra automáticamente cada consulta.

```php
// app/Modules/Nucleo/Models/Sucursal.php
class Sucursal extends Model
{
    use BelongsToTenant;
    // ...
}
```

**2. `BelongsToTenantViaRelacion`** — el modelo NO tiene columna `tenant_id` propia; el
aislamiento se resuelve consultando una relación `belongsTo` (vía `whereHas`, con soporte
nativo de Eloquent para notación de puntos cuando el tenant está a más de un salto de
distancia):

```php
// app/Modules/Gastos/Models/Gasto.php -- gastos no tiene tenant_id, pero
// caja_sesiones -> sucursales sí. Dos saltos, notación de puntos:
class Gasto extends Model
{
    use BelongsToTenantViaRelacion;

    public static function tenantRelacion(): string
    {
        return 'cajaSesion.sucursal';
    }
}
```

Otro ejemplo de dos saltos: `ApartadoAbonoPago::tenantRelacion()` devuelve `'abono.apartado'`.
La mayoría de los casos son de un solo salto (`ProductoVariante` → `'producto'`,
`VentaDetalle` → `'venta'`, etc.).

Ambos traits exponen el mismo bypass explícito para cruzar la frontera de tenant a propósito
(paneles de superadmin, mantenimiento): `Modelo::sinTenant()->find($id)`. Nunca es implícito.

**3. Sin ninguno de los dos traits** — 7 modelos, todos en `app/Modules/Nucleo/Models`:

- `Tenant` — es el propio agregado raíz; no puede aislarse de sí mismo.
- `Permiso` y `PlanSuscripcion` — catálogos globales (sus tablas no tienen columna
  `tenant_id`): el RBAC usa el mismo catálogo de permisos `modulo.accion` para todos los
  tenants, y los planes de suscripción son datos de la plataforma, no del negocio de un tenant.
- `RolPermiso` y `UsuarioRol` — pivots (`Illuminate\Database\Eloquent\Relations\Pivot`); sus
  tablas tampoco tienen `tenant_id`, el aislamiento ya lo aplican `Rol`/`Usuario` (que sí usan
  `BelongsToTenant`) en el lado padre de la relación.
- `DispositivoConfiable` — su tabla tampoco tiene `tenant_id`. A diferencia de los anteriores,
  **el código no documenta explícitamente por qué no usa `BelongsToTenantViaRelacion`** (podría
  hacerlo vía `usuario`, igual que otros modelos de un salto); en la práctica
  `DispositivosConfiablesController` siempre filtra manualmente por
  `usuario_id = $request->user()->id`, así que el aislamiento existe pero no pasa por el
  mecanismo de scope global. Si se agrega una nueva vía de acceso a este modelo sin ese filtro
  manual, quedaría sin aislar — vale la pena revisarlo si el modelo gana un segundo consumidor.
- `InstalacionNucleo` — tabla `instalacion_nucleo`, **una sola fila, global**. A diferencia de
  todos los anteriores, no es un catálogo ni un pivot: identifica la instalación física/lógica
  de Núcleo en sí (potencialmente varios tenants sobre la misma base de datos), no un tenant en
  particular — por eso no tiene ni puede tener `tenant_id`. Su valor (`InstalacionNucleo::identificador()`)
  lo usa `LicenciaClienteService` en cada llamada al servidor central de licencias (ver
  `docs/MANUAL_TECNICO.md` §2.6).

## Auditoría desacoplada

Una sola tabla `auditoria` (create/update/delete con diff en JSON) para toda la app. El
mecanismo vive enteramente en el módulo Auditoría y ningún otro módulo lo importa:

- `config/auditoria.php` — array `auditables` con el FQCN de cada modelo que se audita. Es
  **el único archivo de toda la app que conoce a los 10 módulos a la vez**; ninguno de ellos
  importa nada de los otros para esto.
- `AuditoriaServiceProvider::boot()` recorre ese array y llama `$modelo::observe(AuditObserver::class)`
  por cada uno.
- `AuditObserver` (`app/Modules/Auditoria/Observers/AuditObserver.php`) es genérico — no conoce
  ningún modelo en particular, solo reacciona a los eventos `created`/`updated`/`deleted` de
  Eloquent y escribe el diff en `auditoria`.

**Agregar auditoría a un modelo nuevo es una sola línea**: añadir su FQCN al array
`auditables` en `config/auditoria.php`. No requiere tocar el modelo ni el módulo Auditoría. El
propio archivo de config documenta, modelo por modelo, el criterio para incluir o excluir cada
uno (p. ej. las tablas "detalle"/"pago" de cada módulo transaccional quedan fuera porque su
propio registro fijo ya es su historial — ver los comentarios de `auditoria.php`).

## Direcciones de dependencia entre módulos

Los `Services` de un módulo solo pueden importar de módulos "anteriores" en este orden, nunca
al revés:

```
Nucleo
  └── (base: tenant, usuarios, roles/permisos -- ningun modulo de negocio importa de aqui)

Inventario         Crm
     \             /
      \           /
       Precios   /            (Precios -> Inventario)
          \     /
           \   /
            Tpv                (Tpv -> Crm + Inventario + Precios)
           /    \
          /      \
   Apartados   Devoluciones    (Apartados -> Crm+Inventario+Precios+Tpv)
                                (Devoluciones -> Inventario+Tpv)
      Gastos                   (Gastos -> Tpv, solo Model/Exception, NUNCA Service --
                                 ver el docblock de CajaService)

Configuracion, Auditoria: sin dependencias de negocio.
```

**Regla explícita, con 3 excepciones documentadas hoy** (la primera, `CajaController`, ya
citada arriba como ejemplo — ver el detalle de las 3 y el porqué de cada una en
[docs/MANUAL_TECNICO.md](../docs/MANUAL_TECNICO.md#regla-de-orquestación-controllers-sí-services-nunca)):
`CajaController::cerrar()` (Tpv, capa Http) importa `GastoService` (Gastos) para calcular
`total_gastos` de forma autoritativa al cerrar caja — un módulo "anterior" (Tpv) cruzando hacia
uno "posterior" (Gastos). El patrón, explícito en el docblock de ese método, es: **los
`Controllers` pueden orquestar entre módulos para presentación o cálculo autoritativo; los
`Services` nunca** — `CajaService` en sí mismo sigue sin conocer `Gastos`.

## Esquema de `error_code` para excepciones de negocio

Las excepciones de negocio (`CajaYaAbiertaException`, `StockInsuficienteException`, etc.) son
`RuntimeException` planas, sin `render()` propio — sin registro previo, Laravel las convertía
en un 500 genérico. Se mapean todas en `bootstrap/app.php`, dentro de `withExceptions()`, con
el mismo patrón: un `$exceptions->render(fn (TalException $e) => ...)` por excepción, que
responde `422` con `message` + un `error_code` estable + los campos propios de esa excepción.
El frontend distingue el error por `error_code`, nunca parseando `message`:

```php
$exceptions->render(fn (CajaSesionNoAbiertaException $e) => response()->json([
    'message' => $e->getMessage(),
    'error_code' => 'caja_no_abierta',
    'sucursal_id' => $e->sucursalId,
], 422));
```

Las 10 excepciones mapeadas hoy: `caja_no_abierta`, `caja_ya_abierta`, `pago_no_cuadra`,
`stock_insuficiente`, `cupon_invalido`, `abono_pago_no_cuadra`, `apartado_estado_invalido`,
`apartado_saldo_insuficiente`, `devolucion_pago_no_cuadra`, `devolucion_sobre_venta_sombra`.
Agregar una nueva es el mismo patrón: una excepción propia del módulo + un bloque
`$exceptions->render()` en `bootstrap/app.php`.

## Arquitectura completa

Ver **[docs/nucleo_arquitectura.md](../docs/nucleo_arquitectura.md)** para el mapa completo de
módulos, las decisiones de diseño (fuente única de verdad de stock, variantes siempre presentes,
RBAC real, venta sombra, patrón de pago mixto, etc.) y el schema SQL completo de las 42 tablas.

Ver **[docs/MANUAL_TECNICO.md](../docs/MANUAL_TECNICO.md)** para el mapa de dependencias entre
módulos con diagrama de texto, el catálogo completo de patrones establecidos, y el runbook para
arrancar un producto nuevo clonando este repo.

## Usuarios de prueba para desarrollo

`DesarrolloSeeder` (`app/Modules/Nucleo/Database/Seeders/DesarrolloSeeder.php`) crea un tenant
de desarrollo, una sucursal, y dos usuarios (`admin`/`vendedor`) listos para iniciar sesión sin
configurar nada más a mano. A diferencia de `NucleoRolesPermisosSeeder` y `MetodosPagoSeeder`,
**no se llama desde `DatabaseSeeder`** — `migrate --seed` nunca lo ejecuta. Se corre siempre a
mano:

```bash
php artisan db:seed --class="App\Modules\Nucleo\Database\Seeders\DesarrolloSeeder"
```

Es idempotente en tenant/sucursal/usuarios (no los duplica si se corre varias veces) y llama
internamente a `NucleoRolesPermisosSeeder`, así que funciona aunque solo se haya corrido
`migrate` sin `--seed`.

**Credenciales**: el correo y la contraseña son fijos y de bajo riesgo (`admin@nucleo.test` /
`vendedor@nucleo.test`, contraseña `password-dev-123` para ambos) — se documentan aquí porque
no cambian entre corridas. El admin requiere 2FA obligatorio (`Usuario::requiereDosFactor()`
es `true` para el rol `admin`); el seeder lo pre-confirma para no tener que pasar por la
pantalla de configuración de 2FA a mano, pero el **secreto TOTP se regenera en cada corrida y
solo se imprime en la consola** al ejecutar el seeder (junto con la URI `otpauth://`
equivalente) — nunca queda fijo en el código ni en este README. Para completar el login del
admin hace falta cargar ese secreto en una app de autenticador (Google Authenticator, Authy,
1Password, ...) y generar el código de 6 dígitos que pide `/login/2fa-verify`. El usuario
`vendedor` no requiere 2FA — es el camino más corto para probar el login de punta a punta sin
ningún paso extra.

> [!WARNING]
> **`DesarrolloSeeder` nunca debe correr en un entorno de producción.** Crea usuarios con
> contraseñas conocidas y públicas en este README. Está separado a propósito de
> `DatabaseSeeder`/`--seed` para que no exista ninguna forma de que corra por accidente — pero
> la responsabilidad de no invocarlo a mano en producción es de quien opera el despliegue.
