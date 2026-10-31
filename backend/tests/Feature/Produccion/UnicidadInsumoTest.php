<?php

namespace Tests\Feature\Produccion;

use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class UnicidadInsumoTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    private UnidadMedida $unidad;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['produccion.crear']);
        $this->darPermisosA($this->usuarioB, ['produccion.crear']);

        $this->unidad = UnidadMedida::create([
            'tenant_id' => null,
            'nombre' => 'Unidad',
            'abreviatura' => 'u',
            'tipo' => 'entero',
        ]);
    }

    public function test_dos_tenants_pueden_usar_el_mismo_sku(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/insumos', [
            'nombre' => 'Insumo A',
            'sku' => 'SKU-DUP',
            'unidad_medida_id' => $this->unidad->id,
        ])->assertCreated();

        $this->actingAs($this->usuarioB);

        $this->postJson('/api/v1/insumos', [
            'nombre' => 'Insumo B',
            'sku' => 'SKU-DUP',
            'unidad_medida_id' => $this->unidad->id,
        ])->assertCreated();

        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/insumos', [
            'nombre' => 'Insumo A repetido',
            'sku' => 'SKU-DUP',
            'unidad_medida_id' => $this->unidad->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['sku']);
    }
}
