<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Models\CajaSesion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DecimalesAltaTest extends TestCase
{
    use RefreshDatabase;

    private Tenant $tenant;

    private Sucursal $sucursal;

    protected function setUp(): void
    {
        parent::setUp();
        $this->tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($this->tenant);
        $this->sucursal = Sucursal::factory()->create(['tenant_id' => $this->tenant->id]);
        $usuario = Usuario::factory()->create(['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id]);
        $rol = Rol::factory()->create(['tenant_id' => $this->tenant->id]);
        foreach (['inventario.crear', 'apartados.crear', 'ventas.crear'] as $nombre) {
            [$modulo, $accion] = explode('.', $nombre);
            $permiso = Permiso::factory()->create(['nombre' => $nombre, 'modulo' => $modulo, 'accion' => $accion]);
            $rol->permisos()->attach($permiso->id);
        }
        $usuario->roles()->attach($rol->id);
        $this->actingAs($usuario);
    }

    public function test_el_alta_de_producto_sin_precios_responde_los_defaults_de_bd(): void
    {
        $this->postJson('/api/v1/productos', ['precio_compra' => '0.00', 'nombre' => 'Producto sin precios'])
            ->assertCreated()
            ->assertJsonPath('data.precio_compra', '0.00')
            ->assertJsonPath('data.precio_venta', '0.00');
    }

    public function test_el_alta_de_apartado_responde_total_abonado_cero_decimal(): void
    {
        $producto = Producto::factory()->create(['tenant_id' => $this->tenant->id, 'precio_venta' => '10.00']);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        InventarioStock::factory()->create(['variante_id' => $variante->id, 'sucursal_id' => $this->sucursal->id, 'stock_actual' => 2]);
        $cliente = Cliente::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->postJson('/api/v1/apartados', ['cliente_id' => $cliente->ulid, 'items' => [['variante_id' => $variante->id, 'cantidad' => 1]]])
            ->assertCreated()
            ->assertJsonPath('data.total_abonado', '0.00');
    }

    public function test_los_requests_aceptan_dinero_y_cantidad_como_cadenas_numericas(): void
    {
        $productoId = $this->postJson('/api/v1/productos', ['nombre' => 'Granel decimal', 'precio_compra' => '1.25', 'precio_venta' => '10.00'])
            ->assertCreated()->assertJsonPath('data.precio_compra', '1.25')->json('data.id');
        $variante = ProductoVariante::factory()->create(['producto_id' => $productoId, 'es_granel' => true]);
        InventarioStock::factory()->create(['variante_id' => $variante->id, 'sucursal_id' => $this->sucursal->id, 'stock_actual' => 2]);
        $cliente = Cliente::factory()->create(['tenant_id' => $this->tenant->id]);
        $metodo = MetodoPago::factory()->create(['tenant_id' => $this->tenant->id, 'nombre' => 'Efectivo API-02', 'tipo' => 'efectivo']);
        CajaSesion::factory()->create(['sucursal_id' => $this->sucursal->id, 'usuario_id' => auth()->id()]);
        $this->postJson('/api/v1/ventas', [
            'cliente_id' => $cliente->ulid,
            'items' => [['variante_id' => $variante->id, 'cantidad' => '0.500']],
            'pagos' => [['metodo_pago_id' => $metodo->id, 'monto' => '5.00']],
        ])->assertCreated()->assertJsonPath('data.total', '5.00')->assertJsonPath('data.detalles.0.cantidad', '0.500');
    }
}
