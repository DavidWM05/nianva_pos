<?php

declare(strict_types=1);

namespace Tests\Feature\Inventario;

use App\Modules\Inventario\Http\Resources\ProductoResource;
use App\Modules\Inventario\Http\Resources\ProductoVarianteResource;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Sucursal;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class DecimalesResourceTest extends TestCase
{
    use RefreshDatabase;

    public function test_el_producto_conserva_cadena_decimal_en_dinero_y_stock_agregado(): void
    {
        $producto = Producto::factory()->create(['precio_compra' => '33.33', 'precio_venta' => '45.50']);
        $producto->setAttribute('stock_total', '0.500');
        $datos = (new ProductoResource($producto))->resolve();
        $this->assertSame('33.33', $datos['precio_compra']);
        $this->assertSame('45.50', $datos['precio_venta']);
        $this->assertSame('0.500', $datos['stock_total']);
    }

    public function test_el_stock_por_sucursal_y_el_cero_sin_movimientos_tienen_tres_decimales(): void
    {
        $variante = ProductoVariante::factory()->create(['es_granel' => true]);
        $sucursal = Sucursal::factory()->create(['tenant_id' => $variante->producto->tenant_id]);
        InventarioStock::factory()->create(['variante_id' => $variante->id, 'sucursal_id' => $sucursal->id, 'stock_actual' => '0.500', 'stock_minimo' => '1.000']);
        $variante->load('stock.sucursal');
        $datos = (new ProductoVarianteResource($variante))->resolve(Request::create('/'));
        $this->assertSame('0.000', $datos['stock_actual']);
        $this->assertSame('0.500', $datos['stock'][0]['stock_actual']);
        $this->assertSame('1.000', $datos['stock'][0]['stock_minimo']);
    }
}
