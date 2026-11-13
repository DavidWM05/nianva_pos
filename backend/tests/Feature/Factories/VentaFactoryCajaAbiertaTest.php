<?php

namespace Tests\Feature\Factories;

use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Una sucursal tiene a lo sumo una caja abierta (CajaService::abrirCajaConSucursal).
 * Venta::factory() respeta esa regla: usa la caja abierta de la sucursal en vez de abrir otra.
 */
class VentaFactoryCajaAbiertaTest extends TestCase
{
    use RefreshDatabase;

    public function test_reutiliza_la_caja_abierta_de_la_sucursal(): void
    {
        $caja = CajaSesion::factory()->create();
        $sucursal = Sucursal::query()->withoutGlobalScopes()->findOrFail($caja->sucursal_id);

        $venta = Venta::factory()->create([
            'tenant_id' => $sucursal->tenant_id,
            'sucursal_id' => $sucursal->id,
        ]);

        $this->assertSame($caja->id, $venta->caja_sesion_id);
        $this->assertSame(1, $this->cajasAbiertas($sucursal->id));
    }

    public function test_varias_ventas_de_la_misma_sucursal_comparten_una_caja(): void
    {
        $sucursal = Sucursal::factory()->create();

        $ventas = Venta::factory()->count(3)->create([
            'tenant_id' => $sucursal->tenant_id,
            'sucursal_id' => $sucursal->id,
        ]);

        $this->assertCount(1, $ventas->pluck('caja_sesion_id')->unique());
        $this->assertSame(1, $this->cajasAbiertas($sucursal->id));
    }

    public function test_abre_una_caja_si_la_sucursal_solo_tiene_cajas_cerradas(): void
    {
        $cerrada = CajaSesion::factory()->cerrada()->create();
        $sucursal = Sucursal::query()->withoutGlobalScopes()->findOrFail($cerrada->sucursal_id);

        $venta = Venta::factory()->create([
            'tenant_id' => $sucursal->tenant_id,
            'sucursal_id' => $sucursal->id,
        ]);

        $this->assertNotSame($cerrada->id, $venta->caja_sesion_id);
        $this->assertSame(1, $this->cajasAbiertas($sucursal->id));
    }

    public function test_respeta_la_caja_que_pasa_el_test(): void
    {
        $abierta = CajaSesion::factory()->create();
        $cerrada = CajaSesion::factory()->cerrada()->create(['sucursal_id' => $abierta->sucursal_id]);
        $sucursal = Sucursal::query()->withoutGlobalScopes()->findOrFail($abierta->sucursal_id);

        $venta = Venta::factory()->create([
            'tenant_id' => $sucursal->tenant_id,
            'sucursal_id' => $sucursal->id,
            'caja_sesion_id' => $cerrada->id,
        ]);

        $this->assertSame($cerrada->id, $venta->caja_sesion_id);
    }

    private function cajasAbiertas(int $sucursalId): int
    {
        return CajaSesion::query()->withoutGlobalScopes()
            ->where('sucursal_id', $sucursalId)
            ->where('estado', 'abierta')
            ->count();
    }
}
