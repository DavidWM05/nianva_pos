<?php

declare(strict_types=1);

namespace Tests\Feature\Produccion;

use App\Modules\Produccion\Models\Insumo;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class CantidadInsumoContratoTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['produccion.crear']);
        $this->actingAs($this->usuario);
    }

    public function test_el_alta_sin_minimo_conserva_el_null_de_la_respuesta_existente(): void
    {
        $respuesta = $this->postJson('/api/v1/insumos', ['nombre' => 'Sin mínimo', 'unidad_medida_id' => $this->unidadMedidaGlobal->id])
            ->assertCreated()->assertJsonPath('data.stock_minimo', null);
        $this->assertSame('0.00', Insumo::findOrFail($respuesta->json('data.id'))->stock_minimo);
    }

    public function test_el_minimo_fraccionario_conserva_sus_tres_decimales(): void
    {
        $this->postJson('/api/v1/insumos', ['nombre' => 'Mínimo fraccionario', 'unidad_medida_id' => $this->unidadMedidaGlobal->id, 'stock_minimo' => 0.001])
            ->assertCreated()->assertJsonPath('data.stock_minimo', '0.001');
    }
}
