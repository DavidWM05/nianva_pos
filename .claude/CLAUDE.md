# Nianva POS — reglas para trabajar en este repo

Resumen accionable de los [estándares aprobados](../docs/estandares/README.md). **Los
estándares mandan:** si algo de aquí los contradice, gana el estándar y este archivo se
corrige. El porqué de cada regla está en el estándar citado por su ID; no lo repitas aquí. El
estado del proyecto y las decisiones tomadas están en
[docs/CONTEXTO_MIGRACION.md](../docs/CONTEXTO_MIGRACION.md).

## 1. Módulos y dependencias (ARQ-03)

Cada módulo vive en `backend/app/Modules/<Modulo>`.

- **Base:** Nucleo, Auditoria, Configuracion, Inventario, Precios, Crm, Tpv, Apartados,
  Devoluciones, Gastos.
- **Extensiones:** Cotizaciones, CuentasCobrar, CuentasPagar, GiftCards, NotasCredito,
  Produccion, UnidadesMedida, y los congelados CrmAvanzado, Delivery, Payroll y Prestamos
  (cambio mínimo; sin mejoras fuera del encargo).

Dependencias permitidas entre módulos base, y solo estas:

- `Precios` → `Inventario`
- `Tpv` → `Crm` + `Inventario` + `Precios`
- `Apartados` → `Crm` + `Inventario` + `Precios` + `Tpv`
- `Devoluciones` → `Inventario` + `Tpv`
- `Gastos` → `Tpv`, solo `Model`/`Exception`, nunca `Service`
- `Nucleo`, `Auditoria`, `Configuracion`: sin dependencias de negocio salientes. Sus utilidades
  transversales (`TenantContext`, `ConfiguracionTenant`, `SucursalOperacion`, `permiso:*`,
  `AuditObserver`) y las reglas publicadas en `<Modulo>\Support\Reglas*` se usan desde
  cualquier módulo.

Las extensiones pueden depender de los módulos base, nunca entre sí, y ningún módulo base
depende de ellas. `Arquitectura/DependenciasEntreModulosTest` lo verifica; su lista
`PENDIENTES` es deuda conocida y no recibe entradas nuevas. **Si crees que necesitas otra
dependencia, pregunta antes de escribir código.**

## 2. Capas (ARQ-01 a ARQ-03)

```
Route → middleware permiso:* → FormRequest → Controller → Action / Service → Model
```

- **FormRequest** (`Modules/<Modulo>/Http/Requests/`): extiende
  `Nucleo/Http/Requests/SolicitudNegocio`, declara `rules()` y `toDto()`.
  - Nunca `$request->validate()` ni `Validator::make` en un controller
    (`Arquitectura/EntradasTipadasTest`).
  - `authorize()` solo se sobrescribe para una **guarda del recurso** que debe responder antes
    de validar (rol de sistema, registro global, tenant sin configuración): `abort()` con su
    código y mensaje, nunca `return false`, nunca permisos.
  - Crear y editar comparten un `Guardar<Recurso>Request`; en edición, el registro sale de
    `$this->route('<parametro>')`.
- **DTO** (`Modules/<Modulo>/Dtos/`): `final readonly class` con propiedades tipadas.
  - En ediciones parciales, `camposPresentes()` / `datosPresentes()` distinguen "no llegó" de
    "llegó como null": un DTO con todo en null nunca termina en `->update()`.
  - Contraseñas, códigos TOTP y tokens van con `#[\SensitiveParameter]`.
- **Controller:** delgado; recibe el FormRequest, llama a la Action o al Service y devuelve un
  Resource.
- **Action** (`backend/app/Aplicacion/<Area>/`): un caso de uso por clase, método
  `ejecutar(...)`, dueña de su transacción. Toda orquestación que cruza módulos vive aquí,
  nunca en un controller ni en un Service. Recibe DTOs, nunca `Request` ni arreglos sueltos.
- **Service:** lógica de dominio reutilizable. Hoy aún recibe arreglos; no cambies su firma
  sin un encargo para eso.

## 3. Seguridad

- **Tenant (SEG-01):** todo modelo de negocio usa `BelongsToTenant` (columna `tenant_id`
  propia) o `BelongsToTenantViaRelacion`.
  - Una regla `exists` sobre una tabla con tenant usa `Nucleo/Support/ReglasTenant::existe()`
    (o `existeGlobalODelTenant()` para catálogos con filas globales), o una regla por
    relación (`ReglasVariante`, `ReglasCuota`, `ReglasCaja`). `usuarios` siempre con
    `existe()`: `tenant_id` NULL es superadmin. (`Arquitectura/ExistenciasConTenantTest`)
  - Todo índice único de negocio incluye `tenant_id` (DAT-09,
    `Arquitectura/UnicidadConTenantTest`).
- **Sucursal (SEG-02):** la de una operación es la del usuario. Si el payload trae
  `sucursal_id`, resuélvelo con `SucursalOperacion::paraEscritura()` o `::paraFiltro()` dentro
  del `toDto()`; solo se acepta otra con `sucursales.todas` y del mismo tenant. Asignar la
  sucursal a un usuario o empleado es un atributo y va en `ATRIBUTOS` de
  `Arquitectura/SucursalDelContextoTest`.
- **Permisos (SEG-03):** toda ruta bajo `auth:sanctum` lleva `permiso:<modulo.accion>`; es la
  única autoridad (no hay Policies). Una ruta sin permiso va en `EXENTAS` de
  `Arquitectura/RutasConPermisoTest` con su razón. Un permiso nuevo se agrega a
  `NucleoRolesPermisosSeeder`; en una instalación existente aparece al correr ese seeder.
- **PIN de caja (SEG-12, Fase 4):** desbloquea una sesión abierta y autoriza como supervisor;
  nunca reemplaza al login ni cambia de usuario en la terminal.

## 4. Datos y modelos

- **Modelos estrictos (DAT-14):** fuera de producción están activos
  `preventSilentlyDiscardingAttributes`, `preventLazyLoading` y
  `preventAccessingMissingAttributes`. Un listado carga sus relaciones con `with()`.
- **Auditoría (SEG-10):** agrega el FQCN del modelo a `config/auditoria.php` (`auditables`).
  Nunca un trait en el modelo ni lógica de auditoría dentro del módulo.
- **Pago mixto:** toda entidad que cobra o paga usa una tabla `*_pagos` dedicada
  (`venta_pagos`, `apartado_abono_pagos`, `devolucion_pagos`). Nunca un campo de método de pago
  con un valor mágico (`forma_pago = 'mixto'`).
- **Migraciones de dominio (DAT-11):** se reescriben mientras no haya datos en producción.
- **Codificación (DAT-12):** UTF-8 sin BOM. Antes de cerrar, busca U+FFFD y `??` seguido de una
  letra en los archivos tocados y compara los bytes; la consola de PowerShell puede mostrar mal
  un archivo correcto.

## 5. API

- **Versión (API-01):** la API vive en `/api/v1` (`apiPrefix` en `bootstrap/app.php`). Las
  rutas de sesión de Sanctum (`/login`, `/logout`, `/login/2fa-verify`, `/password/*`,
  `/sanctum/csrf-cookie`) están en `routes/web.php`, en la raíz y sin versión
  (`Arquitectura/RutasVersionadasTest`).
- **Errores (API-03, API-04):** toda excepción de negocio extiende `ExcepcionNegocio` y declara
  `errorCode()`, `status()` y `contexto()`; el manejador genérico de `bootstrap/app.php` arma
  la respuesta. Nunca agregues un mapeo por excepción en `bootstrap/app.php`. Tras crear o
  cambiar una, corre `php artisan errores:catalogo`: regenera
  `docs/estandares/catalogo_error_code.md` y `libs/ui-shared/src/lib/errores/codigos-error.ts`
  (CI falla si no están al día; `--check` lo comprueba). El frontend decide por `error_code`,
  nunca parseando `message`.

## 6. Frontend

- La dirección del backend sale de `public/config.json` al arrancar. Arma las URLs con
  `urlApi('/recurso')` y `urlSesion('/login')` (`core/api-config.ts`); nunca una URL fija.
- Errores del backend: `mensajeError(error, fallback)` para el toast, y `esErrorNegocio(error,
  'codigo')` o `leerErrorNegocio(error)` para reaccionar a un código (`@nianva/ui-shared`).
  Nunca un helper privado por componente ni una lista de códigos a mano.
- Toda entidad raíz tiene vistas dedicadas: `/modulo`, `/modulo/nuevo`, `/modulo/:id`. El modal
  (`p-dialog`) es solo para sub-recursos anidados sin lista ni detalle propios.
- `RecordTabsComponent` (`nucleo-record-tabs`) es obligatorio en toda vista de registro.
- Para buscar o elegir una entidad de otro módulo, usa `EntidadSelectorComponent` con el
  contrato `BuscadorEntidad`/`BuscadorDeHijos` y su token. Nunca importes el servicio concreto
  de otro módulo.

## 7. Pruebas y calidad (PRO-01 a PRO-07)

- **No reescribas tests existentes (PRO-01):** un archivo de test solo recibe métodos nuevos.
  Cambiar o borrar uno requiere la aprobación del responsable y decirlo en el reporte. Un test
  que falla se arregla en el código.
- **Un bug, su test primero (PRO-04):** escribe el test, míralo fallar, corrige y míralo pasar.
- **Funcionalidad nueva = tests permanentes:** PHPUnit en `backend/tests/Feature/...` o Vitest
  (`*.spec.ts`). Un script suelto (`tinker`, un `curl`, un `console.log`) no reemplaza un test.
- **Datos de prueba (PRO-08):** los tests nuevos usan las factories
  (`Modules/<Modulo>/Database/Factories/`). En una factory, toda relación y el tenant se
  resuelven **dentro de un closure** (`fn (array $a) => …`) a partir de los atributos ya
  resueltos, nunca con `create()` por adelantado: así respeta lo que pasa el test y no mezcla
  tenants (`Factories/FactoriesConDatosDadosTest`).
- **Servicio compartido (PRO-07):** si tocas `VentaService`, `InventarioService`,
  `PrecioService`, `TenantContext` u otro con varios consumidores, corre la suite completa.
- **Antes de cerrar**, todo en verde (es lo que corre CI):
  - `backend`: `vendor/bin/pint --test`, `vendor/bin/phpstan analyse --memory-limit=1G`,
    `php artisan test`;
  - `frontend`: `pnpm nx run-many -t lint build test`.
- **Líneas base (PRO-03):** el total de `backend/phpstan-baseline.neon` solo baja. Regenérala
  únicamente cuando corriges deuda, nunca para tapar un error nuevo. Las listas `PENDIENTES` de
  los tests de arquitectura funcionan igual.

## 8. Proceso (PRO-06, PRO-09, PRO-10)

- Un tema por encargo y por PR.
- Revisa `git status` antes de editar; no sobrescribas ni reviertas cambios que no hiciste.
- Nada de commit ni push sin la indicación explícita del responsable. Un commit por tema, en
  español, con prefijo (`feat`, `fix`, `refactor`, `chore`, `docs`, `test`).
- `master` está protegido: todo entra por PR con los checks en verde y se fusiona con
  **Rebase and merge**.
- Los documentos de estrategia (mercado, tabuladores, borradores de plan) no se suben al repo.
- Los encargos a DS siguen PRO-09: prompt con contexto y reglas, reporte con conteos y
  checklist de cierre, revisión del diff contra el prompt.
