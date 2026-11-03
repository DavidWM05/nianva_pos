# Nianva POS

Punto de venta multi-giro: **un solo código** para varios tipos de negocio (ropa, zapatería,
abarrotes con granel, papelería…), con módulos especiales por giro (por ejemplo, Agenda para
barbería y belleza), planes con distinto precio (Lite, Pro, Full) y varios entornos
(escritorio monocaja, LAN multi-tienda, servidor propio o rentado, SaaS).

Nace de [`nucleo-erp-base`](docs/nucleo_arquitectura.md), el núcleo reutilizable de ERP/POS:
monolito modular en Laravel, multi-tenant con base compartida, y un workspace Nx con Angular.
Sobre ese núcleo se construyen los módulos de negocio del POS.

**Estado:** Fase 1, saneamiento. El código se está alineando con los
[estándares aprobados](docs/estandares/README.md); el detalle de lo hecho y de lo que sigue
está en [docs/CONTEXTO_MIGRACION.md](docs/CONTEXTO_MIGRACION.md).

## Qué leer primero

1. **[docs/estandares/](docs/estandares/README.md)**: las reglas del proyecto (arquitectura,
   datos, seguridad, API, UI y proceso). Mandan sobre cualquier otro documento.
2. **[docs/CONTEXTO_MIGRACION.md](docs/CONTEXTO_MIGRACION.md)**: fases, decisiones tomadas,
   estado de cada encargo y siguiente paso.
3. **[.claude/CLAUDE.md](.claude/CLAUDE.md)**: el resumen accionable de los estándares para
   quien escribe código en este repo (personas o agentes).
4. Referencia de por qué se construyó lo que hay:
   - [backend/README.md](backend/README.md): módulos, endpoints y permisos.
   - [frontend/README.md](frontend/README.md): workspace, componentes de `ui-shared` y
     convenciones de pantalla.
   - [docs/MANUAL_TECNICO.md](docs/MANUAL_TECNICO.md) y
     [docs/nucleo_arquitectura.md](docs/nucleo_arquitectura.md): decisiones de arquitectura
     del núcleo.
   - [docs/estandares/catalogo_error_code.md](docs/estandares/catalogo_error_code.md):
     catálogo de `error_code`, generado con `php artisan errores:catalogo`.

## Estructura

```
nianva_pos/
├── backend/    API Laravel 13 (PHP 8.3): app/Modules/<Modulo>, Actions en app/Aplicacion
├── frontend/   Workspace Nx 23 + Angular 22: app pos y librería ui-shared (@nianva/ui-shared)
└── docs/       Estándares, contexto de la migración y referencia
```

**Módulos base** (`backend/app/Modules`): Núcleo (autenticación, usuarios, roles, tenant),
Auditoría, Configuración, Inventario, Precios, CRM, TPV, Apartados, Devoluciones y Gastos.

**Módulos de extensión**, activables por tenant (`modulo:<slug>`): Cotizaciones, Cuentas por
Cobrar, Cuentas por Pagar, Gift Cards, Notas de Crédito, Producción, Unidades de Medida, Ventas
a Plazos, y los congelados CRM Avanzado, Delivery, Nómina y Préstamos. El detalle de cada uno
está en [backend/README.md](backend/README.md).

## Cómo levantarlo

**Prerrequisitos:** PHP 8.3 con Composer, Node 22.20 y pnpm 11.5. El `.env.example` usa
SQLite para arrancar sin instalar nada más; el motor objetivo es MySQL 8 (variables `DB_*` de
`backend/.env`). Los tests siempre corren en SQLite en memoria.

**Primera vez**, o después de un `pull` con cambios en dependencias o migraciones:

```bash
# backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan db:seed --class="App\Modules\Nucleo\Database\Seeders\DesarrolloSeeder"

# frontend
cd frontend
pnpm install
```

Las migraciones de dominio se reescriben mientras no haya datos en producción (DAT-11): si un
`pull` las cambia, usa `php artisan migrate:fresh --seed` y vuelve a correr `DesarrolloSeeder`.

**Cada vez** (dos terminales):

```bash
cd backend && php artisan serve                  # http://localhost:8000
cd frontend && pnpm exec nx serve pos   # http://localhost:4200
```

**Cómo se hablan:**
- La API vive en `/api/v1`. Las rutas de sesión de Sanctum (`/login`, `/logout`,
  `/login/2fa-verify`, `/password/*`, `/sanctum/csrf-cookie`) están en la raíz, sin versión.
- El frontend lee la dirección del backend de `frontend/apps/pos/public/config.json`
  al arrancar (`{ "apiBaseUrl": "http://localhost:8000" }`). Sin ese archivo usa el mismo
  origen.
- CORS y Sanctum ya apuntan a `localhost:4200` (`backend/config/cors.php` y
  `SANCTUM_STATEFUL_DOMAINS` en `.env`).

### Iniciar sesión

`DesarrolloSeeder` crea dos cuentas:

| Usuario | Correo | Contraseña | 2FA |
|---|---|---|---|
| Admin | `admin@nucleo.test` | `password-dev-123` | Sí |
| Vendedor | `vendedor@nucleo.test` | `password-dev-123` | No |

- **Vendedor** es el camino corto para probar el TPV de punta a punta.
- **Admin** hace falta para los módulos de extensión, los reportes y la administración: el rol
  `vendedor` no tiene esos permisos y el menú no los muestra.
- **2FA del admin:** es obligatorio para el rol. El seeder lo deja confirmado y **imprime en la
  consola** el secreto TOTP, el URI `otpauth://` y **8 códigos de recuperación**; nada de eso
  se guarda en el código. Carga el secreto en una app de autenticación (introducir clave a
  mano) y usa el código de 6 dígitos en `/login/2fa-verify`, o escribe ahí uno de los códigos
  de recuperación (cada uno sirve una vez). Después de pasar el 2FA, ese navegador queda
  recordado 30 días. Cada corrida del seeder genera un secreto y unos códigos nuevos.

#### Si no puedes entrar

- **"Credenciales no válidas" con las cuentas de prueba:** casi siempre es que la base se
  recreó (`migrate:fresh`) y no hay usuarios. Desde `backend/`:

  ```bash
  php artisan db:seed
  php artisan db:seed --class="App\Modules\Nucleo\Database\Seeders\DesarrolloSeeder"
  ```

- **Te pide el código de 2FA y no lo tienes:** usa uno de los códigos de recuperación que
  imprimió el seeder, o reinicia el 2FA del admin. En el siguiente login te pide configurarlo
  de nuevo con un QR:

  ```bash
  php artisan usuarios:resetear-2fa admin@nucleo.test --force
  ```

Más casos en [backend/README.md](backend/README.md), en "Recuperar el acceso con 2FA". Para
tener tenants de ejemplo (ropa, abarrotes, multi-sucursal y plan Lite), ver "Escenarios de
datos" en el mismo archivo.

## Calidad

CI (`.github/workflows/ci.yml`) bloquea el merge a `master` si falla cualquiera de estos pasos.
Para correrlos en local:

```bash
# backend
cd backend
vendor/bin/pint --test
vendor/bin/phpstan analyse --memory-limit=1G
php artisan test

# frontend
cd frontend
pnpm nx run-many -t lint build test
```

- La deuda de PHPStan está congelada en `backend/phpstan-baseline.neon`; en cada PR, CI falla
  si su total sube (PRO-03).
- `backend/tests/Feature/Arquitectura/` guarda las reglas como tests: dependencias entre
  módulos, permisos en las rutas, reglas `exists` y unicidad con tenant, sucursal del contexto,
  entradas tipadas, rutas versionadas y modelos estrictos.
- Todo entra por PR a `master`, con los tres checks en verde, y se fusiona con
  **Rebase and merge**.

## Solución de problemas

**`[ERR_PNPM_IGNORED_BUILDS]` al correr `pnpm install` o `nx serve`.** pnpm bloquea los scripts
de build de dependencias nativas (aquí, `@swc/core`) hasta que se aprueban. Ya está aprobado en
`frontend/pnpm-workspace.yaml` (`allowBuilds`, `'@swc/core': true`). Si aun así aparece:

- en tu terminal, `cd frontend && pnpm approve-builds`, selecciona `@swc/core` y confirma;
- o revisa que `frontend/pnpm-workspace.yaml` tenga esa línea bajo `allowBuilds`. Esta versión
  de pnpm ya no lee `pnpm.onlyBuiltDependencies` de `package.json`.
