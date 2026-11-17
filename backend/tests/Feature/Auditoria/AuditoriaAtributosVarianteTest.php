<?php

declare(strict_types=1);

namespace Tests\Feature\Auditoria;

use App\Modules\Auditoria\Models\Auditoria;
use App\Modules\Inventario\Database\Factories\ProductoVarianteFactory;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

/**
 * ARQ-07b: sin columnas propias para sus valores, cambiar los atributos de una variante se
 * audita en la variante, con los ids de atributo_valores de antes y de despues.
 */
class AuditoriaAtributosVarianteTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['inventario.editar']);
    }

    public function test_cambiar_los_valores_guarda_el_antes_y_el_despues_en_la_variante(): void
    {
        $producto = Producto::factory()->create(['tenant_id' => $this->tenant->id]);
        $variante = ProductoVariante::factory()->conAtributos(['Medida' => 'Chica', 'Acabado' => 'Mate'])->create(['producto_id' => $producto->id]);
        $antes = ProductoVarianteFactory::idsDeValores($this->tenant->id, ['Medida' => 'Chica', 'Acabado' => 'Mate']);
        $despues = ProductoVarianteFactory::idsDeValores($this->tenant->id, ['Medida' => 'Grande']);
        sort($antes);

        $this->actingAs($this->usuario)
            ->putJson("/api/v1/producto-variantes/{$variante->id}", ['valores' => $despues])
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Grande');

        $filas = Auditoria::sinTenant()
            ->where('tabla_afectada', 'producto_variantes')
            ->where('registro_id', $variante->id)
            ->where('accion', 'update')
            ->get();

        $this->assertCount(1, $filas);
        $this->assertSame(['valores' => ['antes' => $antes, 'despues' => $despues]], $filas->first()?->cambios);
    }
}
