<?php

namespace Tests\Feature\Seeders;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\LicenciaLocal;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Models\Venta;
use Database\Seeders\Escenarios\EscenarioSeederBase;
use Database\Seeders\Escenarios\EscenariosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

class EscenariosSeederTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(EscenariosSeeder::class);
    }

    public function test_cada_escenario_crea_su_tenant_sucursales_usuarios_y_roles(): void
    {
        $esperados = [
            'Boutique Escenario Ropa' => ['sucursales' => 1, 'usuarios' => 2],
            'Abarrotes Escenario Granel' => ['sucursales' => 1, 'usuarios' => 2],
            'Cadena Escenario Multi' => ['sucursales' => 3, 'usuarios' => 5],
            'Tienda Escenario Lite' => ['sucursales' => 1, 'usuarios' => 2],
        ];

        foreach ($esperados as $nombre => $conteos) {
            $tenant = Tenant::where('nombre', $nombre)->firstOrFail();

            $this->enTenant($tenant, function () use ($conteos): void {
                $this->assertSame($conteos['sucursales'], Sucursal::count());
                $this->assertSame($conteos['usuarios'], Usuario::count());
            });
        }

        $this->enTenant(Tenant::where('nombre', 'Boutique Escenario Ropa')->firstOrFail(), function (): void {
            $admin = Usuario::where('correo', 'admin@ropa.test')->firstOrFail();
            $this->assertTrue($admin->tieneRol('admin'));
            $this->assertNotNull($admin->two_factor_confirmed_at);
            $this->assertNotNull($admin->two_factor_secret);
            $this->assertTrue(Usuario::where('correo', 'vendedor@ropa.test')->firstOrFail()->tieneRol('vendedor'));
        });

        $this->enTenant(Tenant::where('nombre', 'Cadena Escenario Multi')->firstOrFail(), function (): void {
            $this->assertTrue(Usuario::where('correo', 'gerente@multi.test')->firstOrFail()->tieneRol('gerente'));
            $this->assertTrue(Usuario::where('correo', 'vendedor1@multi.test')->firstOrFail()->tieneRol('vendedor'));
            $this->assertTrue(Usuario::where('correo', 'vendedor2@multi.test')->firstOrFail()->tieneRol('vendedor'));
            $this->assertTrue(Usuario::where('correo', 'vendedor3@multi.test')->firstOrFail()->tieneRol('vendedor'));
        });
    }

    public function test_ninguna_fila_del_escenario_apunta_a_otro_tenant(): void
    {
        foreach (Tenant::all() as $tenant) {
            $this->enTenant($tenant, function () use ($tenant): void {
                $productos = Producto::all();
                $variantes = ProductoVariante::all();
                $clientes = Cliente::all();
                $ventas = Venta::with('pagos')->get();
                $sucursales = Sucursal::all();

                $this->assertNotEmpty($productos);
                $this->assertNotEmpty($variantes);
                $this->assertNotEmpty($clientes);
                $this->assertNotEmpty($ventas);
                $this->assertNotEmpty($sucursales);

                foreach ($variantes as $variante) {
                    $this->assertSame($tenant->id, $variante->tenant_id);
                    $this->assertSame($tenant->id, $variante->producto()->firstOrFail()->tenant_id);
                }

                foreach ($ventas as $venta) {
                    $this->assertSame($tenant->id, $venta->tenant_id);
                    $this->assertSame($tenant->id, $venta->sucursal()->firstOrFail()->tenant_id);
                    $this->assertSame($tenant->id, $venta->cliente()->firstOrFail()->tenant_id);
                    $this->assertSame((float) $venta->total, (float) $venta->pagos->sum('monto'));
                }

                foreach (Usuario::all() as $usuario) {
                    $this->assertSame($tenant->id, $usuario->tenant_id);
                    $this->assertSame($tenant->id, $usuario->sucursal()->firstOrFail()->tenant_id);
                }
            });
        }
    }

    public function test_stock_y_kardex_cuadran_por_variante_y_sucursal(): void
    {
        foreach (Tenant::all() as $tenant) {
            $this->enTenant($tenant, function (): void {
                $variantes = ProductoVariante::pluck('id');
                $sucursales = Sucursal::pluck('id');

                foreach ($variantes as $varianteId) {
                    foreach ($sucursales as $sucursalId) {
                        $stock = InventarioStock::query()
                            ->where('variante_id', $varianteId)
                            ->where('sucursal_id', $sucursalId)
                            ->value('stock_actual') ?? 0;

                        $entradas = Kardex::query()
                            ->where('variante_id', $varianteId)
                            ->where('sucursal_id', $sucursalId)
                            ->where('tipo', 'entrada')
                            ->sum('cantidad');

                        $salidas = Kardex::query()
                            ->where('variante_id', $varianteId)
                            ->where('sucursal_id', $sucursalId)
                            ->where('tipo', 'salida')
                            ->sum('cantidad');

                        $this->assertSame((int) $stock, (int) $entradas - (int) $salidas);
                    }
                }
            });
        }
    }

    public function test_es_idempotente(): void
    {
        $antes = [
            'tenants' => Tenant::count(),
            'usuarios' => Usuario::sinTenant()->count(),
            'productos' => Producto::sinTenant()->count(),
            'ventas' => Venta::sinTenant()->count(),
        ];

        $this->seed(EscenariosSeeder::class);

        $this->assertSame($antes, [
            'tenants' => Tenant::count(),
            'usuarios' => Usuario::sinTenant()->count(),
            'productos' => Producto::sinTenant()->count(),
            'ventas' => Venta::sinTenant()->count(),
        ]);
    }

    public function test_en_produccion_lanza_excepcion_y_no_crea_nada(): void
    {
        $tenantsAntes = Tenant::count();

        $this->app->instance('env', 'production');

        try {
            (new EscenariosSeeder)->run();
            $this->fail('El seeder debio lanzar una excepcion en produccion.');
        } catch (RuntimeException $e) {
            $this->assertStringContainsString('produccion', $e->getMessage());
        } finally {
            $this->app->instance('env', 'testing');
        }

        $this->assertSame($tenantsAntes, Tenant::count());
    }

    public function test_un_escenario_que_falla_a_medias_no_deja_su_tenant(): void
    {
        $escenario = new class extends EscenarioSeederBase
        {
            public function run(): void
            {
                $tenant = $this->preparar('Escenario Que Falla', 9999);
                $this->crearSucursal($tenant, 'Sucursal Huerfana');

                throw new RuntimeException('falla a medias');
            }
        };

        try {
            $escenario->setContainer($this->app)->__invoke();
            $this->fail('El escenario debio lanzar su excepcion.');
        } catch (RuntimeException $e) {
            $this->assertSame('falla a medias', $e->getMessage());
        }

        $this->assertFalse(Tenant::where('nombre', 'Escenario Que Falla')->exists());
    }

    public function test_lite_tiene_plan_licencia_y_modulos_base_sin_extensiones(): void
    {
        $tenant = Tenant::where('nombre', 'Tienda Escenario Lite')->firstOrFail();
        app(TenantContext::class)->set($tenant);

        $configuracion = ConfiguracionTenant::where('tenant_id', $tenant->id)->firstOrFail();
        $licencia = LicenciaLocal::with('plan')->where('tenant_id', $tenant->id)->firstOrFail();
        $admin = Usuario::where('correo', 'admin@lite.test')->firstOrFail();

        $this->assertSame([], $configuracion->modulos_activos);
        $this->assertSame('activa', $licencia->estado);
        $this->assertSame('lite', $licencia->plan->slug);
        $this->assertSame(1, Sucursal::where('tenant_id', $tenant->id)->count());

        $this->actingAs($admin)
            ->getJson('/api/v1/cotizaciones')
            ->assertStatus(403)
            ->assertJsonPath('error_code', 'modulo_no_activo');
    }

    public function test_multi_sucursal_filtra_por_la_sucursal_del_usuario(): void
    {
        $tenant = Tenant::where('nombre', 'Cadena Escenario Multi')->firstOrFail();
        app(TenantContext::class)->set($tenant);

        $gerente = Usuario::where('correo', 'gerente@multi.test')->firstOrFail();
        $vendedor = Usuario::where('correo', 'vendedor1@multi.test')->firstOrFail();
        $hoy = now()->toDateString();

        $this->actingAs($gerente)
            ->getJson('/api/v1/ventas/reporte?fecha_desde='.$hoy.'&fecha_hasta='.$hoy)
            ->assertOk()
            ->assertJsonCount(3, 'data.por_sucursal');

        $this->actingAs($vendedor)
            ->getJson('/api/v1/ventas/reporte?fecha_desde='.$hoy.'&fecha_hasta='.$hoy)
            ->assertOk()
            ->assertJsonCount(1, 'data.por_sucursal')
            ->assertJsonPath('data.por_sucursal.0.sucursal_id', $vendedor->sucursal_id);
    }

    private function enTenant(Tenant $tenant, callable $callback): mixed
    {
        app(TenantContext::class)->set($tenant);

        try {
            return $callback();
        } finally {
            app(TenantContext::class)->set(null);
        }
    }
}
