<?php

declare(strict_types=1);

namespace Tests\Feature\Produccion;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class CostoUnitarioAltaTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    public function test_el_alta_sin_costo_devuelve_el_default_de_la_base_con_cuatro_decimales(): void
    {
        $this->prepararNegocio(['produccion.crear']);
        $this->actingAs($this->usuario)->postJson('/api/v1/insumos', [
            'nombre' => 'Costo por defecto',
            'unidad_medida_id' => $this->unidadMedidaGlobal->id,
        ])->assertCreated()->assertJsonPath('data.costo', '0.0000');
    }
}
