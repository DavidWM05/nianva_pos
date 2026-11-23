<?php

declare(strict_types=1);

namespace Tests\Feature\Metricas;

use App\Modules\CuentasCobrar\Metricas\ReporteCuentasCobrar;
use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\CuentasPagar\Metricas\ReporteCuentasPagar;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Metricas\Valores\ContextoMetricas;
use App\Modules\Metricas\Valores\PeriodoMetricas;
use App\Modules\Nucleo\Dtos\ConsultarReporteTenantDto;
use App\Modules\Nucleo\Models\Tenant;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class CarteraAntiguedadTest extends TestCase
{
    use RefreshDatabase;

    public function test_cobrar_y_pagar_comparten_los_limites_civiles_y_los_totales_no_dependen_de_la_pagina(): void
    {
        $tenant = Tenant::factory()->create();
        $zona = new DateTimeZone('America/Tijuana');
        $corte = new DateTimeImmutable('2026-06-11', $zona);
        $hoy = $corte->format('Y-m-d');
        $contexto = new ContextoMetricas($tenant->id, null, $zona, PeriodoMetricas::entre($hoy, $hoy, $zona), $hoy);
        $filtros = new ConsultarReporteTenantDto(2, 1, 10);

        foreach ([CuentaCobrar::factory(), CuentaPagar::factory()] as $fabrica) {
            foreach ([null, 0, 1, 30, 31, 60, 61, 90, 91] as $dias) {
                $fabrica->create([
                    'tenant_id' => $tenant->id,
                    'saldo_pendiente' => '1.01',
                    'fecha_vencimiento' => $dias === null ? null : $corte->modify("-{$dias} days")->format('Y-m-d'),
                ]);
            }
        }

        foreach ([app(ReporteCuentasCobrar::class), app(ReporteCuentasPagar::class)] as $reporte) {
            $resultado = $reporte->consultar($contexto, $filtros);
            self::assertSame('9.09', $resultado['data']['total_pendiente']);
            self::assertSame('7.07', $resultado['data']['total_vencido']);
            self::assertSame([
                'al_dia' => '2.02',
                'vencido_1_30' => '2.02',
                'vencido_31_60' => '2.02',
                'vencido_61_90' => '2.02',
                'vencido_90_mas' => '1.01',
            ], $resultado['data']['por_antiguedad']);
            self::assertCount(1, $resultado['data']['detalle']);
            self::assertSame(9, $resultado['meta']['total']);
        }
    }
}
