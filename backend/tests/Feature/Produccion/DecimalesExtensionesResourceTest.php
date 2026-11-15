<?php

declare(strict_types=1);

namespace Tests\Feature\Produccion;

use App\Modules\Cotizaciones\Http\Resources\CotizacionDetalleResource;
use App\Modules\Cotizaciones\Models\CotizacionDetalle;
use App\Modules\Delivery\Http\Resources\PedidoItemResource;
use App\Modules\Delivery\Models\PedidoItem;
use App\Modules\Produccion\Http\Resources\OrdenProduccionResource;
use App\Modules\Produccion\Models\OrdenProduccion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class DecimalesExtensionesResourceTest extends TestCase
{
    use RefreshDatabase;

    public static function cantidades(): array
    {
        return [
            'cotización' => [CotizacionDetalle::class, CotizacionDetalleResource::class, 'cantidad'],
            'orden programada' => [OrdenProduccion::class, OrdenProduccionResource::class, 'cantidad_programada'],
            'orden producida' => [OrdenProduccion::class, OrdenProduccionResource::class, 'cantidad_producida'],
            'delivery' => [PedidoItem::class, PedidoItemResource::class, 'cantidad'],
        ];
    }

    #[DataProvider('cantidades')]
    public function test_las_cantidades_fraccionarias_se_serializan_con_tres_decimales(string $modelo, string $resource, string $campo): void
    {
        $registro = $modelo::factory()->make([$campo => '0.500']);
        $datos = (new $resource($registro))->resolve();
        $this->assertSame('0.500', $datos[$campo]);
    }

    public function test_el_dinero_del_detalle_de_cotizacion_conserva_sus_dos_decimales(): void
    {
        $detalle = CotizacionDetalle::factory()->make(['cantidad' => '2.000', 'precio_unitario' => '25.50', 'descuento' => '1.00', 'subtotal' => '50.00']);
        $datos = (new CotizacionDetalleResource($detalle))->resolve();
        $this->assertSame('25.50', $datos['precio_unitario']);
        $this->assertSame('1.00', $datos['descuento']);
        $this->assertSame('50.00', $datos['subtotal']);
    }
}
