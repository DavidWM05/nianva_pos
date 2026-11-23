<?php

declare(strict_types=1);

namespace Tests\Feature\Metricas;

use App\Aplicacion\Ventas\PresentarRankingVariantes;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Metricas\Valores\ContextoMetricas;
use App\Modules\Metricas\Valores\PeriodoMetricas;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaDetalle;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use DateTimeZone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class RankingVariantesTest extends TestCase
{
    use RefreshDatabase;

    public function test_normaliza_la_foto_agrupa_por_unidad_y_desempata_por_id(): void
    {
        $tenant = Tenant::factory()->create();
        $venta = Venta::factory()->create(['tenant_id' => $tenant->id, 'fecha' => '2026-06-11 10:00:00']);
        $pieza = UnidadMedida::factory()->create(['tenant_id' => null, 'nombre' => 'Unidad de prueba']);
        $kilo = UnidadMedida::factory()->create(['tenant_id' => $tenant->id, 'nombre' => 'Peso de prueba']);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id, 'nombre' => 'Antes']);
        $primera = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        $segunda = ProductoVariante::factory()->create(['producto_id' => $producto->id]);

        foreach ([[$primera->id, $pieza->id, '2.000', '3.000'], [$segunda->id, $pieza->id, '6.000', '1.000'], [$primera->id, $kilo->id, '1.500', '2.000']] as [$variante, $unidad, $cantidad, $factor]) {
            VentaDetalle::factory()->create([
                'venta_id' => $venta->id,
                'variante_id' => $variante,
                'unidad_medida_id' => $unidad,
                'cantidad' => $cantidad,
                'factor' => $factor,
            ]);
        }
        $producto->update(['nombre' => 'Nombre vigente']);

        $zona = new DateTimeZone('UTC');
        $contexto = new ContextoMetricas($tenant->id, null, $zona, PeriodoMetricas::entre('2026-06-11', '2026-06-11', $zona), '2026-06-11');

        $grupos = app(PresentarRankingVariantes::class)->ejecutar($contexto);
        self::assertSame(['Unidad de prueba', 'Peso de prueba'], array_column(array_column($grupos, 'unidad'), 'nombre'));
        self::assertSame([$primera->id, $segunda->id], array_column($grupos[0]['variantes'], 'variante_id'));
        self::assertSame(['6.000', '6.000'], array_column($grupos[0]['variantes'], 'cantidad_base'));
        self::assertSame('3.000', $grupos[1]['variantes'][0]['cantidad_base']);
        self::assertSame('Nombre vigente', $grupos[0]['variantes'][0]['producto_nombre']);
    }
}
