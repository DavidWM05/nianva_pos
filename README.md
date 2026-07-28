# Núcleo

**Núcleo reutilizable de ERP/POS**, no un framework instalable ni un paquete: cada producto
vertical (POS de ropa, clínica dental, barbería, escuela, ...) **clona este repositorio** y
construye su propia lógica de negocio específica *sobre* los 10 módulos que ya trae resueltos
(Núcleo/Auth, Auditoría, Inventario, Precios y Promociones, CRM, TPV, Apartados, Devoluciones,
Gastos, Configuración). Lo específico de cada vertical (expediente clínico, citas,
odontograma, boletas escolares, ...) vive **fuera** del núcleo, en el propio proyecto que lo
clonó.

Este repositorio es, además, el clon concreto para **Nianva POS** (punto de venta para tienda de
ropa): sobre los 10 módulos base se construyeron los módulos de negocio propios de ese vertical
— ver la sección "Módulos de negocio (Nianva POS)" más abajo.

Ver [`docs/nucleo_arquitectura.md`](docs/nucleo_arquitectura.md) para la decisión de
arquitectura completa (por qué monolito modular, por qué shared-database multi-tenant, el
schema SQL de las 42 tablas).

## Estructura de alto nivel

```
Nucleo/
├── backend/     API Laravel (PHP 8.3, monolito modular por dominio en app/Modules/<Modulo>)
└── frontend/    Workspace Nx (Angular, standalone components) -- shell + módulos + librería UI
```

Cada carpeta tiene su propio README con el detalle de setup y arquitectura interna:

- **[backend/README.md](backend/README.md)** — módulos, aislamiento de tenant, auditoría,
  direcciones de dependencia entre módulos, esquema de errores, usuarios de prueba.
- **[frontend/README.md](frontend/README.md)** — estructura del workspace, componentes de
  `ui-shared`, convención de navegación y de vistas, patrón de buscadores entre módulos.
- **[docs/MANUAL_TECNICO.md](docs/MANUAL_TECNICO.md)** — documento de referencia profunda: mapa
  de dependencias entre los 10 módulos, catálogo de patrones establecidos, y el runbook para
  arrancar un producto nuevo clonando este repo.
- **[docs/nucleo_arquitectura.md](docs/nucleo_arquitectura.md)** — la decisión de arquitectura
  original (por qué monolito modular, por qué shared-database multi-tenant) y el schema SQL
  completo de las 42 tablas.

## Módulos de negocio (Nianva POS)

Construidos sobre los 10 módulos base, en `backend/app/Modules/<Modulo>` igual que ellos —
respetan la misma dirección de dependencia (nunca importan el `Service` de un módulo fuera de lo
documentado en `backend/README.md`). Cada uno activable/desactivable por tenant vía
`modulo:<slug>` (middleware `ModuloActivo`) y protegido por su propio catálogo de permisos
(`NucleoRolesPermisosSeeder`).

| Módulo | Carpeta | Resuelve |
|---|---|---|
| Cotizaciones | `app/Modules/Cotizaciones` | cotizaciones de venta, editables hasta que se convierten en una venta real |
| CRM Avanzado | `app/Modules/CrmAvanzado` | interacciones con clientes (llamadas, visitas...), programa de puntos de lealtad, envío de campañas |
| Cuentas por Cobrar | `app/Modules/CuentasCobrar` | crédito a clientes generado desde una venta, abonos, antigüedad de saldos |
| Cuentas por Pagar | `app/Modules/CuentasPagar` | crédito de proveedores generado desde una compra, pagos, antigüedad de saldos |
| Pedidos (Delivery) | `app/Modules/Delivery` | pedidos a domicilio, asignación de repartidor, cambio de estado |
| Gift Cards | `app/Modules/GiftCards` | emisión, recarga, canje y cancelación de tarjetas de regalo |
| Notas de Crédito | `app/Modules/NotasCredito` | notas de crédito generadas automáticamente desde una devolución (solo lectura) |
| Payroll (Nómina) | `app/Modules/Payroll` | empleados y generación/pago de nóminas |
| Préstamos | `app/Modules/Prestamos` | préstamos a empleados/terceros con interés, registro de pagos |
| Producción | `app/Modules/Produccion` | insumos, recetas, órdenes de producción y transformaciones de producto (negocios con manufactura propia) |
| Unidades de Medida | `app/Modules/UnidadesMedida` | catálogo transversal (kg, litro, pieza...) usado por Producción |
| Ventas a Plazos | vive en `Crm\Http\Controllers\PlanPagoController` | planes de pago con interés sobre una venta ya entregada (distinto de Apartados: aquí el producto ya se entregó) |
| Reportes | sin módulo propio — un método `reporte()` en el controller dueño de cada dato | antigüedad de saldos (CxC/CxP), CRM (segmentos/interacciones/loyalty/campañas), ventas por periodo (`Tpv\VentaController`) |

Todo esto tiene su contraparte de frontend en `frontend/apps/nucleo-shell/src/app/modules/`
(carpetas con los mismos nombres, en kebab-case) — ver
[frontend/README.md](frontend/README.md) para las convenciones de pantalla.

## Cómo levantar el proyecto para probar

Backend (`localhost:8000`) y frontend (`localhost:4200`) ya vienen preconfigurados para
hablarse entre sí sin nada extra: CORS/Sanctum del backend ya apuntan a `localhost:4200`
(`backend/config/cors.php`, `SANCTUM_STATEFUL_DOMAINS` en `.env`) y el frontend tiene
`API_BASE_URL` fijo a `http://localhost:8000` (`frontend/apps/nucleo-shell/src/app/core/api-config.ts`).

**Primera vez (o después de clonar/hacer `pull` de cambios en dependencias/migraciones):**

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

**Cada vez que quieras probar** (dos terminales, en paralelo):

```bash
cd backend && php artisan serve      # http://localhost:8000
cd frontend && pnpm exec nx serve nucleo-shell   # http://localhost:4200
```

### Iniciar sesión

Abre **`http://localhost:4200`** e inicia sesión con una de las dos cuentas que crea
`DesarrolloSeeder`:

| Usuario | Correo | Contraseña | 2FA |
|---|---|---|---|
| **Admin** | `admin@nucleo.test` | `password-dev-123` | Sí (ver mecanismo abajo) |
| Vendedor | `vendedor@nucleo.test` | `password-dev-123` | No |

**Usa el admin si vas a probar cualquiera de los módulos "nuevos"** (Producción, Payroll,
Préstamos, Ventas a Plazos, CRM Campañas, Reportes) — todos requieren permisos que **no** están
en el rol `vendedor`; con `vendedor` esos módulos ni siquiera aparecen en el sidebar. `vendedor`
sigue siendo el camino más corto para probar el flujo de punta a punta de TPV/Venta sin pasar
por 2FA.

**Mecanismo de 2FA del admin**: el rol `admin` tiene 2FA obligatorio
(`Usuario::requiereDosFactor()`). `DesarrolloSeeder` lo deja pre-confirmado para no tener que
pasar por la pantalla de configuración a mano, pero **el secreto TOTP se regenera en cada
corrida del seeder y solo se imprime en la consola** al ejecutarlo — nunca queda fijo en el
código ni en ningún README (es una cuenta de prueba, pero el secreto no se versiona igual).
Para completar el login:

1. Corre (o vuelve a correr) el seeder: `php artisan db:seed --class="App\Modules\Nucleo\Database\Seeders\DesarrolloSeeder"`.
2. Copia el secreto (o el URI `otpauth://`) que imprime en consola.
3. Cárgalo en una app de autenticación (Google Authenticator, Authy, 1Password...) — pegando el
   secreto manualmente o importando el URI si tu app lo soporta.
4. Genera el código de 6 dígitos y úsalo en la pantalla `/login/2fa-verify`.

Si ya perdiste el secreto de una corrida anterior, simplemente vuelve a correr el seeder del
paso 1 — es idempotente en tenant/sucursal/usuarios, solo regenera el secreto TOTP.

### Solución de problemas

**`[ERR_PNPM_IGNORED_BUILDS]` al correr `pnpm install` o `nx serve`** — pnpm (v9+) bloquea por
seguridad los scripts de build de dependencias nativas (en este repo, `@swc/core`, que compila/
descarga un binario nativo) a menos que se aprueben explícitamente. Ya está resuelto en el repo
(`frontend/pnpm-workspace.yaml`, sección `allowBuilds`, `'@swc/core': true`) — si de todas
formas te aparece (ej. pnpm-workspace.yaml quedó desactualizado localmente), dos formas de
resolverlo:

- **Puntual, en tu terminal** (pnpm te muestra un checklist interactivo):
  ```bash
  cd frontend && pnpm approve-builds
  ```
  Selecciona `@swc/core`, confirma, y vuelve a correr `nx serve nucleo-shell`.
- **Permanente**: en `frontend/pnpm-workspace.yaml`, bajo `allowBuilds`, poner `'@swc/core': true`
  (esta versión de pnpm ya no lee el campo `pnpm.onlyBuiltDependencies` de `package.json` —
  ver el warning `The "pnpm" field in package.json is no longer read by pnpm` si lo intentas ahí).

## Prerrequisitos

- **PHP 8.3+** y **Composer** (backend).
- **MySQL 8** — motor objetivo del schema (ver `docs/nucleo_arquitectura.md`). El `.env.example`
  del backend trae `DB_CONNECTION=sqlite` por defecto para poder levantar el proyecto sin
  instalar nada más; cambiar a MySQL es editar las variables `DB_*` de `backend/.env`. Los
  tests (`phpunit.xml`) siempre corren contra SQLite en memoria, sin importar el `.env`.
- **Node 22+** y **pnpm** (frontend, workspace Nx).

Para el setup detallado de cada lado, ver los README enlazados arriba — no se duplica aquí.
