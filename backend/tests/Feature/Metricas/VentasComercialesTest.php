<?php

declare(strict_types=1);

namespace Tests\Feature\Metricas;

use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Metricas\Services\VentasComerciales;
use App\Modules\Metricas\Valores\ContextoMetricas;
use App\Modules\Metricas\Valores\PeriodoMetricas;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Tpv\Models\Venta;
use DateTimeZone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class VentasComercialesTest extends TestCase
{
    use RefreshDatabase;

    public function test_separa_ventas_de_devoluciones_y_cambios_en_el_corte_local(): void
    {
        $tenant = Tenant::factory()->create();
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $fuera = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $ajeno = Tenant::factory()->create();
        $datos = ['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id];
        $real = Venta::factory()->create($datos + ['total' => '100.03', 'fecha' => '2026-06-11 07:30:00']);
        $anterior = Venta::factory()->create($datos + ['total' => '500.00', 'fecha' => '2026-06-11 06:30:00']);
        Venta::factory()->anulada()->create($datos + ['total' => '444.00', 'fecha' => '2026-06-11 07:30:00']);
        $sombra = Venta::factory()->create($datos + ['total' => '30.00', 'es_venta_sombra' => true, 'fecha' => '2026-06-11 08:30:00']);
        Venta::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $fuera->id, 'fecha' => '2026-06-11 08:30:00']);
        Venta::factory()->create(['tenant_id' => $ajeno->id, 'fecha' => '2026-06-11 08:30:00']);

        Devolucion::factory()->create(['venta_id' => $anterior->id, 'monto_devolucion' => '10.01', 'fecha' => '2026-06-11 09:00:00']);
        Devolucion::factory()->create([
            'venta_id' => $real->id,
            'venta_sombra_id' => $sombra->id,
            'tipo' => 'cambio',
            'monto_devolucion' => '20.02',
            'monto_cambio' => '30.00',
            'fecha' => '2026-06-11 10:00:00',
        ]);
        Devolucion::factory()->create(['venta_id' => $real->id, 'monto_devolucion' => '15.00', 'fecha' => '2026-06-12 07:00:00']);

        $zona = new DateTimeZone('America/Tijuana');
        $periodo = PeriodoMetricas::entre('2026-06-11', '2026-06-11', $zona);
        $contexto = new ContextoMetricas($tenant->id, $sucursal->id, $zona, $periodo, '2026-06-11');

        self::assertSame([
            'vendido' => '100.03',
            'tickets' => 1,
            'ticket_promedio' => '100.03',
            'mercancia_devuelta_simple' => '10.01',
            'mercancia_recibida_en_cambios' => '20.02',
            'mercancia_entregada_en_cambios' => '30.00',
            'ventas_netas_comerciales' => '100.00',
        ], app(VentasComerciales::class)->totales($contexto)->aArray());

        $metricas = app(VentasComerciales::class);
        self::assertSame([['fecha' => '2026-06-11', 'vendido' => '100.03', 'ventas_netas_comerciales' => '100.00']], $metricas->porDia($contexto));
        $detalle = $metricas->detalle($contexto, 2, 1);
        self::assertSame(3, $detalle['total']);
        self::assertSame('devolucion', $detalle['filas'][0]['tipo']);
        self::assertSame('-10.01', $detalle['filas'][0]['importe_comercial']);
    }

    public function test_periodo_vacio_conserva_ceros(): void
    {
        $tenant = Tenant::factory()->create();
        $zona = new DateTimeZone('UTC');
        $contexto = new ContextoMetricas($tenant->id, null, $zona, PeriodoMetricas::entre('2026-06-11', '2026-06-11', $zona), '2026-06-11');

        $totales = app(VentasComerciales::class)->totales($contexto)->aArray();
        self::assertSame(0, $totales['tickets']);
        self::assertSame('0.00', $totales['ticket_promedio']);
        self::assertSame('0.00', $totales['ventas_netas_comerciales']);
    }
}
