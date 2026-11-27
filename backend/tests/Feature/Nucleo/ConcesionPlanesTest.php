<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Aplicacion\Planes\CatalogoSucursales;
use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Database\Seeders\NucleoRolesPermisosSeeder;
use App\Modules\Nucleo\Exceptions\FeatureNoConcedidaException;
use App\Modules\Nucleo\Exceptions\LimitePlanExcedidoException;
use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\FuenteConcesion;
use App\Modules\Nucleo\Services\FuenteConcesionLocal;
use App\Modules\Nucleo\Services\Planes;
use App\Modules\Nucleo\Support\MetodoEfectivo;
use App\Modules\Precios\Models\ReglaPrecio;
use App\Modules\Precios\Services\PricingService;
use App\Modules\Precios\Support\Carrito;
use App\Modules\Precios\Support\ContextoPrecio;
use App\Modules\Precios\Support\LineaCarrito;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ConcesionPlanesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['planes.entorno' => 'escritorio', 'planes.concesiones' => [], 'planes.instalacion' => null]);
        $this->app->bind(FuenteConcesion::class, FuenteConcesionLocal::class);
        $this->seed(NucleoRolesPermisosSeeder::class);
    }

    public function test_basico_es_el_plan_por_defecto_y_oculta_clientes_aunque_el_admin_tenga_permiso(): void
    {
        $admin = Usuario::factory()->admin()->create(['two_factor_confirmed_at' => now()]);

        $this->actingAs($admin)->getJson('/api/v1/sesion')->assertOk()
            ->assertJsonPath('data.plan.codigo', 'basico')
            ->assertJsonPath('data.limites.terminales.maximo', 1)
            ->assertJsonPath('data.limites.sucursales.maximo', 1)
            ->assertJsonMissingPath('data.limites.usuarios');

        $this->getJson('/api/v1/clientes')->assertForbidden()
            ->assertJsonPath('error_code', 'feature_no_concedida');
    }

    public function test_concesion_a_medida_se_resuelve_por_features_y_respeta_modulos_activos(): void
    {
        $admin = Usuario::factory()->admin()->create(['two_factor_confirmed_at' => now()]);
        config(['planes.concesiones.'.$admin->tenant_id => [
            'plan_codigo' => 'a_medida',
            'features' => ['clientes', 'cotizaciones', 'desconocida'],
            'cuotas' => ['terminales' => 4, 'sucursales' => 1],
        ]]);

        $this->actingAs($admin)->getJson('/api/v1/sesion')->assertOk()
            ->assertJsonPath('data.plan.features', ['clientes', 'cotizaciones'])
            ->assertJsonPath('data.modulos_activos', ['cotizaciones']);
        $this->getJson('/api/v1/clientes')->assertOk();

        ConfiguracionTenant::actual()?->update(['modulos_activos' => []]);
        $this->getJson('/api/v1/cotizaciones')->assertForbidden()
            ->assertJsonPath('error_code', 'modulo_no_activo');
    }

    public function test_alta_de_terminal_rechaza_exceso_de_cuota_del_tenant(): void
    {
        $admin = Usuario::factory()->admin()->create(['two_factor_confirmed_at' => now()]);
        Terminal::factory()->create(['sucursal_id' => $admin->sucursal_id]);

        $this->actingAs($admin)->postJson('/api/v1/terminales', [
            'nombre' => 'Terminal adicional',
            'sucursal_id' => $admin->sucursal_id,
        ])->assertUnprocessable()->assertJsonPath('error_code', 'limite_plan_excedido');

        $this->assertDatabaseMissing('terminales', ['nombre' => 'Terminal adicional']);
    }

    public function test_la_sesion_central_no_tiene_plan_comercial(): void
    {
        $admin = Usuario::factory()->superadmin()->create(['two_factor_confirmed_at' => now()]);

        $this->actingAs($admin)->getJson('/api/v1/sesion')->assertOk()
            ->assertJsonPath('data.plan', null)
            ->assertJsonPath('data.limites', null);
    }

    public function test_superadmin_sin_tenant_no_accede_a_cxc_y_conserva_la_sesion(): void
    {
        $admin = Usuario::factory()->superadmin()->create(['two_factor_confirmed_at' => now()]);
        $this->assertNull($admin->tenant_id);
        $this->assertTrue($admin->tienePermiso('cuentas_cobrar.ver'));

        $this->actingAs($admin)->getJson('/api/v1/cuentas-cobrar')->assertForbidden();
        $this->getJson('/api/v1/sesion')->assertOk()
            ->assertJsonPath('data.usuario.id', $admin->id)
            ->assertJsonPath('data.plan', null);
    }

    public function test_pro_cuenta_las_terminales_en_una_bolsa_y_excluye_los_congelados(): void
    {
        config(['planes.entorno' => 'propio']);
        $plan = app(Planes::class)->catalogo('pro', 1, 2);

        $this->assertSame(12, $plan->terminales);
        $this->assertSame(2, $plan->sucursales);
        $this->assertContains('multisucursal', $plan->features);
        $this->assertSame([], array_intersect($plan->features, ['crm_avanzado', 'delivery', 'payroll', 'prestamos']));

        config(['planes.entorno' => 'lan']);
        $lan = app(Planes::class)->catalogo('pro', 1, 2);
        $this->assertSame(1, $lan->sucursales);
        $this->assertSame(7, $lan->terminales);
        $this->assertNotContains('multisucursal', $lan->features);
    }

    public function test_sucursales_rechaza_otra_plaza_y_publica_el_limite(): void
    {
        $admin = Usuario::factory()->admin()->create(['two_factor_confirmed_at' => now()]);
        $this->actingAs($admin)->getJson('/api/v1/sucursales')->assertOk()
            ->assertJsonPath('meta.limite', ['maximo' => 1, 'uso' => 1]);

        $this->expectException(LimitePlanExcedidoException::class);
        app(CatalogoSucursales::class)->aprovisionar($admin->tenant_id, 'Segunda');
    }

    public function test_exceso_de_terminales_bloquea_apertura_hasta_deshabilitar_una(): void
    {
        $admin = Usuario::factory()->admin()->create(['two_factor_confirmed_at' => now()]);
        $primera = Terminal::factory()->create(['sucursal_id' => $admin->sucursal_id]);
        $segunda = Terminal::factory()->create(['sucursal_id' => $admin->sucursal_id]);
        $this->actingAs($admin);
        $this->seleccionarTerminalParaPrueba($primera->id);

        $this->postJson('/api/v1/caja/abrir', ['monto_apertura' => 100])
            ->assertUnprocessable()->assertJsonPath('error_code', 'limite_plan_excedido');

        $this->putJson('/api/v1/terminales/'.$segunda->id, [
            'nombre' => $segunda->nombre, 'sucursal_id' => $segunda->sucursal_id, 'activo' => false,
        ])->assertOk()->assertJsonPath('data.activo', false);
        $this->postJson('/api/v1/caja/abrir', ['monto_apertura' => 100])->assertCreated();

        $this->putJson('/api/v1/terminales/'.$segunda->id, [
            'nombre' => $segunda->nombre, 'sucursal_id' => $segunda->sucursal_id, 'activo' => true,
        ])->assertUnprocessable()->assertJsonPath('error_code', 'limite_plan_excedido');

        $this->putJson('/api/v1/terminales/'.$primera->id, [
            'nombre' => $primera->nombre, 'sucursal_id' => $primera->sucursal_id, 'activo' => false,
        ])->assertUnprocessable();
        $this->assertTrue($primera->fresh()->activo);
    }

    public function test_basico_omite_reglas_de_precio_y_rechaza_cupon_en_el_motor(): void
    {
        $admin = Usuario::factory()->admin()->create(['two_factor_confirmed_at' => now()]);
        $producto = Producto::factory()->create(['tenant_id' => $admin->tenant_id]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        ReglaPrecio::factory()->create([
            'tenant_id' => $admin->tenant_id, 'aplica_a' => 'variante', 'variante_id' => $variante->id, 'porcentaje' => 10,
        ]);

        $motor = app(PricingService::class);
        $lineas = [new LineaCarrito($variante->id, 1)];
        $contexto = new ContextoPrecio($admin->tenant_id, null, null, CarbonImmutable::now());
        $cotizacion = $motor->cotizar(new Carrito($lineas), $contexto);
        $this->assertSame([], $cotizacion->lineas[0]->reglas);

        $this->expectException(FeatureNoConcedidaException::class);
        $motor->cotizar(new Carrito($lineas, 'CUPON'), $contexto);
    }

    public function test_basico_cobra_sin_selector_de_cliente_y_usa_publico_general(): void
    {
        $admin = Usuario::factory()->admin()->create(['two_factor_confirmed_at' => now()]);
        $terminal = Terminal::factory()->create(['sucursal_id' => $admin->sucursal_id]);
        $producto = Producto::factory()->create(['tenant_id' => $admin->tenant_id, 'precio_venta' => 10, 'tasa_iva' => 0]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id, 'precio_venta' => 10]);
        InventarioStock::factory()->create([
            'sucursal_id' => $admin->sucursal_id, 'variante_id' => $variante->id, 'stock_actual' => 5,
        ]);

        $this->actingAs($admin);
        $this->seleccionarTerminalParaPrueba($terminal->id);
        $this->postJson('/api/v1/caja/abrir', ['monto_apertura' => 50])->assertCreated();
        $datos = [
            'items' => [['variante_id' => $variante->id, 'cantidad' => 1]],
            'pagos' => [['metodo_pago_id' => MetodoEfectivo::id(), 'monto' => 10]],
        ];
        $this->postJson('/api/v1/ventas', $datos)->assertCreated();

        $publico = Cliente::sinTenant()
            ->where('tenant_id', $admin->tenant_id)->where('es_sistema', true)->sole();
        $this->assertDatabaseHas('ventas', ['tenant_id' => $admin->tenant_id, 'cliente_id' => $publico->id]);
    }

    public function test_entornos_e2e_y_testing_sin_concesion_reciben_basico(): void
    {
        config(['planes' => ['entorno' => 'escritorio', 'concesiones' => [], 'instalacion' => null]]);

        foreach (['e2e', 'testing'] as $entorno) {
            $this->app->instance('env', $entorno);
            $plan = app(Planes::class)->deTenant(42);

            $this->assertSame('basico', $plan->codigo, $entorno);
            $this->assertSame(Planes::BASICO, $plan->features);
        }
    }
}
