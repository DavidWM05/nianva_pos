<?php

namespace Tests\Feature\UnidadesMedida;

use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class UnidadMedidaEdicionParcialTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['inventario.crear', 'inventario.editar']);
    }

    public function test_actualizar_unidad_solo_con_nombre_conserva_los_demas_campos(): void
    {
        $unidad = UnidadMedida::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'Kilogramo',
            'abreviatura' => 'kg',
            'tipo' => 'fraccionario',
            'activo' => true,
        ]);
        $this->actingAs($this->usuario);

        $this->putJson("/api/unidades-medida/{$unidad->id}", ['nombre' => 'Gramo'])
            ->assertOk();

        $unidad->refresh();
        $this->assertSame('Gramo', $unidad->nombre);
        $this->assertSame('kg', $unidad->abreviatura);
        $this->assertSame('fraccionario', $unidad->tipo);
        $this->assertTrue($unidad->activo);
    }
}
