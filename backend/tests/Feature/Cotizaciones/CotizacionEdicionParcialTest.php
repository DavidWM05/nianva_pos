<?php

namespace Tests\Feature\Cotizaciones;

use App\Modules\Cotizaciones\Services\CotizacionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class CotizacionEdicionParcialTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['cotizaciones.crear', 'cotizaciones.editar']);
    }

    public function test_actualizar_cotizacion_solo_con_observaciones_conserva_los_demas_campos(): void
    {
        $cotizacion = app(CotizacionService::class)->crear(
            [
                'tenant_id' => $this->tenant->id,
                'sucursal_id' => $this->sucursal->id,
                'usuario_id' => $this->usuario->id,
                'cliente_id' => $this->cliente->id,
                'validez_dias' => 30,
                'descuento' => 5,
                'observaciones' => 'Original',
                'uso_cfdi' => 'G01',
            ],
            [[
                'variante_id' => $this->variante->id,
                'cantidad' => 1,
                'precio_unitario' => 100,
                'descuento' => 0,
            ]],
        );

        $this->actingAs($this->usuario);

        $this->putJson("/api/v1/cotizaciones/{$cotizacion->id}", [
            'observaciones' => 'Actualizada',
            'items' => [[
                'variante_id' => $this->variante->id,
                'cantidad' => 1,
                'precio_unitario' => 100,
            ]],
        ])->assertOk();

        $cotizacion->refresh();
        $this->assertSame('Actualizada', $cotizacion->observaciones);
        $this->assertSame(30, (int) $cotizacion->validez_dias);
        $this->assertSame(5.0, (float) $cotizacion->descuento);
        $this->assertSame('G01', $cotizacion->uso_cfdi);
        $this->assertSame($this->cliente->id, $cotizacion->cliente_id);
    }
}
