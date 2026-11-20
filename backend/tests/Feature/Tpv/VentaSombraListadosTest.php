<?php

declare(strict_types=1);

namespace Tests\Feature\Tpv;

use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class VentaSombraListadosTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    public function test_listado_y_reporte_aceptan_una_sombra_sin_caja_y_no_la_suman_como_venta(): void
    {
        $this->prepararNegocio(['ventas.ver', 'reportes.ver']);
        $venta = $this->crearVenta();
        $sombra = Venta::factory()->create(['tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id,
            'cliente_id' => $this->cliente->id, 'caja_sesion_id' => null,
            'es_venta_sombra' => true, 'total' => '900.00']);
        $this->actingAs($this->usuario);
        $this->getJson('/api/v1/ventas')->assertOk()->assertJsonFragment(['id' => $sombra->id, 'es_venta_sombra' => true]);
        $this->getJson('/api/v1/ventas/reporte?fecha_desde='.now()->toDateString().'&fecha_hasta='.now()->toDateString())
            ->assertOk()->assertJsonPath('data.numero_ventas', 1)
            ->assertJsonPath('data.total_ventas', DecimalApi::dinero($venta->total));
        $this->assertNull($sombra->fresh()->cajaSesion);
    }
}
