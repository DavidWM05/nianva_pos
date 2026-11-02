<?php

namespace Tests\Feature\Arquitectura;

use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ListadosUniformesTest extends TestCase
{
    use RefreshDatabase;

    /** @var list<string> */
    private const PENDIENTES = [
        'api/v1/apartados',
        'api/v1/auditoria',
        'api/v1/categorias',
        'api/v1/clientes',
        'api/v1/cotizaciones',
        'api/v1/cuentas-cobrar',
        'api/v1/cuentas-pagar',
        'api/v1/cupones',
        'api/v1/departamentos',
        'api/v1/devoluciones',
        'api/v1/dispositivos-confiables',
        'api/v1/gastos',
        'api/v1/gift-cards',
        'api/v1/metodos-pago',
        'api/v1/notas-credito',
        'api/v1/pedidos',
        'api/v1/permisos',
        'api/v1/planes-pago-cliente',
        'api/v1/prestamos',
        'api/v1/productos',
        'api/v1/proveedores',
        'api/v1/reglas-precio',
        'api/v1/sucursales',
        'api/v1/unidades-medida',
        'api/v1/ventas',
    ];

    public function test_los_listados_no_pendientes_cumplen_el_contrato(): void
    {
        $token = 'unico-'.bin2hex(random_bytes(5));
        $this->crearDatosDePrueba($token);

        $rutasIndex = collect(Route::getRoutes())
            ->filter(fn ($route) => in_array('GET', $route->methods(), true)
                && str_starts_with($route->uri(), 'api/v1/')
                && str_ends_with($route->getActionName(), '@index'))
            ->keyBy(fn ($route) => $route->uri());

        $infracciones = [];

        foreach (self::PENDIENTES as $rutaPendiente) {
            $route = $rutasIndex->get($rutaPendiente);

            if ($route === null) {
                $infracciones[] = "{$rutaPendiente}: PENDIENTES apunta a una ruta index inexistente.";

                continue;
            }

            [$clase] = explode('@', $route->getActionName(), 2);
            $archivo = class_exists($clase) ? (new \ReflectionClass($clase))->getFileName() : false;

            if ($archivo !== false && str_contains((string) file_get_contents($archivo), 'Listado::aplicar')) {
                $infracciones[] = "{$rutaPendiente}: ya usa Listado; quitar de PENDIENTES.";
            }
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));

        $rutas = $rutasIndex
            ->keys()
            ->reject(fn (string $ruta) => in_array($ruta, self::PENDIENTES, true))
            ->values();

        $this->assertNotEmpty($rutas);

        foreach ($rutas as $ruta) {
            $sinFiltro = $this->getJson($ruta.'?rows=500&sort_field=no-existe&sort_order=desc');
            $sinFiltro->assertOk();

            $json = $sinFiltro->json();
            $this->assertIsArray($json['meta'] ?? null);
            $this->assertArrayHasKey('total', $json['meta']);
            $this->assertSame(1, $json['meta']['page']);
            $this->assertSame(100, $json['meta']['rows']);
            $this->assertArrayHasKey('filtros_aplicados', $json['meta']);
            $this->assertArrayHasKey('permisos', $json['meta']);
            $this->assertLessThanOrEqual(100, count($json['data']));

            $nombres = array_values(array_map(
                fn (array $fila): string => (string) ($fila['nombre'] ?? ''),
                $json['data'],
            ));
            $ordenados = $nombres;
            sort($ordenados, SORT_STRING);
            $this->assertSame($ordenados, $nombres, "{$ruta}: no usa el orden por defecto.");

            $conBusqueda = $this->getJson($ruta.'?rows=500&q='.urlencode($token));
            $conBusqueda->assertOk();

            $filtrado = $conBusqueda->json();
            $this->assertSame(1, (int) $filtrado['meta']['total']);
            $this->assertCount(1, $filtrado['data']);
            $this->assertStringContainsString($token, json_encode($filtrado['data'], JSON_THROW_ON_ERROR));
            $this->assertSame($token, $filtrado['meta']['filtros_aplicados']['q'] ?? null);
        }
    }

    public function test_parametros_de_listado_como_arreglo_se_ignoran_sin_error(): void
    {
        $this->crearDatosDePrueba('unico-'.bin2hex(random_bytes(5)));

        foreach (['api/v1/roles', 'api/v1/usuarios'] as $ruta) {
            $respuesta = $this->getJson($ruta.'?q[]=x&filtro_nombre[]=y&sort_field[]=nombre&rows[]=5');

            $respuesta->assertOk();
            $this->assertSame([], $respuesta->json('meta.filtros_aplicados'), "{$ruta}: aplicó un parámetro que llegó como arreglo.");
        }
    }

    private function crearDatosDePrueba(string $token): void
    {
        $tenant = Tenant::factory()->create(['nombre' => 'Nianva Listados']);
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id, 'nombre' => 'Centro']);

        $rolAuth = Rol::factory()->create([
            'tenant_id' => $tenant->id,
            'nombre' => 'Auth',
            'es_sistema' => false,
        ]);
        $ids = [];

        foreach (['roles.ver', 'usuarios.ver'] as $nombre) {
            [$modulo, $accion] = explode('.', $nombre);
            $ids[] = Permiso::firstOrCreate(
                ['nombre' => $nombre],
                ['modulo' => $modulo, 'accion' => $accion],
            )->id;
        }

        $rolAuth->permisos()->attach($ids);

        $auth = Usuario::factory()->create([
            'tenant_id' => $tenant->id,
            'sucursal_id' => $sucursal->id,
            'nombre' => 'Ana',
            'correo' => 'ana-listados@test.com',
        ]);
        $auth->roles()->attach($rolAuth->id);

        Rol::factory()->create([
            'tenant_id' => $tenant->id,
            'nombre' => 'Rol '.$token,
            'es_sistema' => false,
        ]);
        Usuario::factory()->create([
            'tenant_id' => $tenant->id,
            'sucursal_id' => $sucursal->id,
            'nombre' => 'Usuario '.$token,
            'correo' => 'unico-'.$token.'@test.com',
        ]);

        for ($i = 1; $i <= 105; $i++) {
            Rol::factory()->create([
                'tenant_id' => $tenant->id,
                'nombre' => sprintf('Rol %03d', $i),
                'es_sistema' => false,
            ]);
            Usuario::factory()->create([
                'tenant_id' => $tenant->id,
                'sucursal_id' => $sucursal->id,
                'nombre' => sprintf('Usuario %03d', $i),
                'correo' => sprintf('usuario-%03d@test.com', $i),
            ]);
        }

        app(TenantContext::class)->set($tenant);
        $this->actingAs($auth);
    }
}
