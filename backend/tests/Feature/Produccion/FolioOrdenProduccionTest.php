<?php

declare(strict_types=1);

namespace Tests\Feature\Produccion;

use App\Modules\Produccion\Models\Receta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class FolioOrdenProduccionTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    public function test_el_alta_asigna_un_folio_op_consecutivo_por_sucursal(): void
    {
        $this->prepararNegocio(['produccion.crear']);
        $this->actingAs($this->usuario);
        $receta = Receta::factory()->create([
            'tenant_id' => $this->tenant->id,
            'variante_id' => $this->variante->id,
        ]);

        foreach ([1, 2] as $consecutivo) {
            $this->postJson('/api/v1/ordenes-produccion', [
                'receta_id' => $receta->id,
                'cantidad_programada' => 1,
            ])->assertCreated()->assertJsonPath('data.folio', "OP-{$this->sucursal->id}-{$consecutivo}");
        }
    }
}
