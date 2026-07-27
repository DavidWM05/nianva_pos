# Núcleo

**Núcleo reutilizable de ERP/POS**, no un framework instalable ni un paquete: cada producto
vertical (POS de ropa, clínica dental, barbería, escuela, ...) **clona este repositorio** y
construye su propia lógica de negocio específica *sobre* los 10 módulos que ya trae resueltos
(Núcleo/Auth, Auditoría, Inventario, Precios y Promociones, CRM, TPV, Apartados, Devoluciones,
Gastos, Configuración). Lo específico de cada vertical (expediente clínico, citas,
odontograma, boletas escolares, ...) vive **fuera** del núcleo, en el propio proyecto que lo
clonó.

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

Abre `http://localhost:4200` e inicia sesión con las credenciales que imprimió
`DesarrolloSeeder` (ver `backend/README.md#usuarios-de-prueba-para-desarrollo`):
`vendedor@nucleo.test` (sin 2FA, el más rápido para empezar) o `admin@nucleo.test`
(requiere el código TOTP del secreto impreso en consola).

## Prerrequisitos

- **PHP 8.3+** y **Composer** (backend).
- **MySQL 8** — motor objetivo del schema (ver `docs/nucleo_arquitectura.md`). El `.env.example`
  del backend trae `DB_CONNECTION=sqlite` por defecto para poder levantar el proyecto sin
  instalar nada más; cambiar a MySQL es editar las variables `DB_*` de `backend/.env`. Los
  tests (`phpunit.xml`) siempre corren contra SQLite en memoria, sin importar el `.env`.
- **Node 22+** y **pnpm** (frontend, workspace Nx).

Para el setup detallado de cada lado, ver los README enlazados arriba — no se duplica aquí.
