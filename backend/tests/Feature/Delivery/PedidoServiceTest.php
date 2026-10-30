<?php

namespace Tests\Feature\Delivery;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Delivery\Exceptions\PedidoNoAsignableException;
use App\Modules\Delivery\Exceptions\TransicionEstadoInvalidaException;
use App\Modules\Delivery\Models\Pedido;
use App\Modules\Delivery\Services\PedidoService;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PedidoServiceTest extends TestCase
{
    use RefreshDatabase;

    private PedidoService $service;

    private Tenant $tenant;

    private Sucursal $sucursal;

    private Usuario $usuario;

    private Usuario $repartidor;

    private Cliente $cliente;

    private ProductoVariante $variante;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(PedidoService::class);

        $this->tenant = Tenant::create(['nombre' => 'Test Delivery', 'pais' => 'MX']);
        $this->sucursal = Sucursal::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Centro']);
        $this->usuario = Usuario::create([
            'tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Carlos', 'correo' => 'carlos-del@test.com', 'password' => 'secret123',
        ]);
        $this->repartidor = Usuario::create([
            'tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Repartidor1', 'correo' => 'repartidor@test.com', 'password' => 'secret123',
        ]);
        app(TenantContext::class)->set($this->tenant);

        $this->cliente = Cliente::where('tenant_id', $this->tenant->id)->where('nombre', 'Publico General')->firstOrFail();

        $cat = Categoria::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Test']);
        $prod = Producto::create(['tenant_id' => $this->tenant->id, 'categoria_id' => $cat->id, 'nombre' => 'Prod', 'precio_compra' => 10, 'precio_venta' => 50]);
        $this->variante = ProductoVariante::create(['producto_id' => $prod->id]);
    }

    public function test_crear_pedido_sin_items(): void
    {
        $pedido = $this->service->crear([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'cliente_id' => $this->cliente->id,
            'direccion_entrega' => 'Av. Siempre Viva 123',
            'costo_delivery' => 5.00,
            'notas' => 'Sin cebolla',
        ]);

        $this->assertStringStartsWith('PED-', $pedido->numero_pedido);
        $this->assertSame('pendiente', $pedido->estado);
        $this->assertSame(5.0, (float) $pedido->costo_delivery);
        $this->assertSame('Av. Siempre Viva 123', $pedido->direccion_entrega);
    }

    public function test_crear_pedido_con_items(): void
    {
        $pedido = $this->service->crear(
            [
                'tenant_id' => $this->tenant->id,
                'sucursal_id' => $this->sucursal->id,
                'usuario_id' => $this->usuario->id,
                'cliente_id' => $this->cliente->id,
            ],
            [
                ['variante_id' => $this->variante->id, 'cantidad' => 2, 'precio_unitario' => 50],
            ],
        );

        $this->assertCount(1, $pedido->items);
        $this->assertSame(2, $pedido->items->first()->cantidad);
    }

    public function test_transicion_estado_pendiente_a_preparando(): void
    {
        $pedido = $this->crearPedidoBasico();

        $actualizado = $this->service->cambiarEstado($pedido->id, 'preparando');

        $this->assertSame('preparando', $actualizado->estado);
    }

    public function test_transicion_completa_hasta_entregado(): void
    {
        $pedido = $this->crearPedidoBasico();

        $this->service->cambiarEstado($pedido->id, 'preparando');
        $this->service->cambiarEstado($pedido->id, 'en_camino');
        $entregado = $this->service->cambiarEstado($pedido->id, 'entregado');

        $this->assertSame('entregado', $entregado->estado);
        $this->assertNotNull($entregado->fecha_entrega);
    }

    public function test_transicion_invalida_pendiente_a_entregado(): void
    {
        $pedido = $this->crearPedidoBasico();

        $this->expectException(TransicionEstadoInvalidaException::class);
        $this->service->cambiarEstado($pedido->id, 'entregado');
    }

    public function test_cancelar_desde_cualquier_estado(): void
    {
        $pedido = $this->crearPedidoBasico();

        $this->service->cambiarEstado($pedido->id, 'preparando');
        $cancelado = $this->service->cambiarEstado($pedido->id, 'cancelado');

        $this->assertSame('cancelado', $cancelado->estado);
    }

    public function test_entregado_no_permite_mas_cambios(): void
    {
        $pedido = $this->crearPedidoBasico();
        $this->service->cambiarEstado($pedido->id, 'preparando');
        $this->service->cambiarEstado($pedido->id, 'en_camino');
        $this->service->cambiarEstado($pedido->id, 'entregado');

        $this->expectException(TransicionEstadoInvalidaException::class);
        $this->service->cambiarEstado($pedido->id, 'cancelado');
    }

    public function test_asignar_repartidor(): void
    {
        $pedido = $this->crearPedidoBasico();

        $actualizado = $this->service->asignarRepartidor($pedido->id, $this->repartidor->id);

        $this->assertSame($this->repartidor->id, $actualizado->repartidor_id);
    }

    public function test_asignar_repartidor_en_entregado_lanza_excepcion(): void
    {
        $pedido = $this->crearPedidoBasico();
        $this->service->cambiarEstado($pedido->id, 'preparando');
        $this->service->cambiarEstado($pedido->id, 'en_camino');
        $this->service->cambiarEstado($pedido->id, 'entregado');

        $this->expectException(PedidoNoAsignableException::class);
        $this->service->asignarRepartidor($pedido->id, $this->repartidor->id);
    }

    public function test_aislamiento_tenant(): void
    {
        $this->crearPedidoBasico();

        $tenant2 = Tenant::create(['nombre' => 'Otro', 'pais' => 'MX']);
        app(TenantContext::class)->set($tenant2);

        $this->assertSame(0, Pedido::all()->count());
    }

    private function crearPedidoBasico(): Pedido
    {
        return $this->service->crear([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
            'usuario_id' => $this->usuario->id,
            'cliente_id' => $this->cliente->id,
        ]);
    }
}
