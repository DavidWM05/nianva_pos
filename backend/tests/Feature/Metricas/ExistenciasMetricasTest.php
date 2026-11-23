<?php

declare(strict_types=1);

namespace Tests\Feature\Metricas;

use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Metricas\Services\ExistenciasMetricas;
use App\Modules\Metricas\Valores\ContextoMetricas;
use App\Modules\Metricas\Valores\PeriodoMetricas;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use DateTimeZone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class ExistenciasMetricasTest extends TestCase
{
    use RefreshDatabase;

    public function test_alertas_cuentan_filas_activas_con_minimo_positivo_hasta_el_umbral(): void
    {
        $tenant = Tenant::factory()->create();
        $propia = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $otra = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $ajena = Sucursal::factory()->create();
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id, 'activo' => true]);
        $activa = ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        $inactiva = ProductoVariante::factory()->create(['producto_id' => $producto->id, 'activo' => false]);

        $umbral = ['stock_actual' => '2.000', 'stock_minimo' => '2.000'];
        InventarioStock::factory()->create($umbral + ['sucursal_id' => $propia->id, 'variante_id' => $activa->id]);
        InventarioStock::factory()->create($umbral + ['sucursal_id' => $otra->id, 'variante_id' => $activa->id]);
        InventarioStock::factory()->create($umbral + ['sucursal_id' => $propia->id, 'variante_id' => $inactiva->id]);
        InventarioStock::factory()->create($umbral + ['sucursal_id' => $ajena->id]);
        InventarioStock::factory()->create(['sucursal_id' => $propia->id, 'stock_actual' => 0, 'stock_minimo' => 0]);
        InventarioStock::factory()->create(['sucursal_id' => $propia->id, 'stock_actual' => '2.001', 'stock_minimo' => '2.000']);

        $zona = new DateTimeZone('UTC');
        $periodo = PeriodoMetricas::entre('2026-06-11', '2026-06-11', $zona);
        $metricas = app(ExistenciasMetricas::class);

        self::assertSame(1, $metricas->alertasStockBajo(new ContextoMetricas($tenant->id, $propia->id, $zona, $periodo, '2026-06-11')));
        self::assertSame(2, $metricas->alertasStockBajo(new ContextoMetricas($tenant->id, null, $zona, $periodo, '2026-06-11')));
    }
}
