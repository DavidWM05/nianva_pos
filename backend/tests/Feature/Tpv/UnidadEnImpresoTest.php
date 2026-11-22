<?php

declare(strict_types=1);

namespace Tests\Feature\Tpv;

use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

final class UnidadEnImpresoTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    public function test_imprime_el_nombre_de_la_unidad_guardada_en_la_linea(): void
    {
        $this->prepararNegocio(['ventas.ver']);
        $venta = $this->crearVenta();
        $linea = $venta->detalles()->firstOrFail();
        $unidad = UnidadMedida::factory()->create(['tenant_id' => $this->tenant->id]);
        $linea->update(['unidad_medida_id' => $unidad->id]);

        $this->actingAs($this->usuario)->getJson("/api/v1/ventas/{$venta->ulid}/impreso")
            ->assertOk()
            ->assertJsonPath('data.lineas.0.unidad_medida_id', $unidad->id)
            ->assertJsonPath('data.lineas.0.unidad_medida_nombre', $unidad->getAttribute('nombre'));
    }

    public function test_imprime_el_nombre_de_cada_unidad_global_y_del_tenant(): void
    {
        $this->prepararNegocio(['ventas.ver']);
        $venta = $this->crearVenta();
        $pieza = UnidadMedida::query()->whereNull('tenant_id')->where('abreviatura', 'pz')->firstOrFail();
        $propia = UnidadMedida::factory()->create(['tenant_id' => $this->tenant->id, 'nombre' => 'Caja propia']);
        $linea = $venta->detalles()->firstOrFail();
        $linea->update(['unidad_medida_id' => $pieza->id]);
        $segunda = $linea->replicate();
        $segunda->setAttribute('unidad_medida_id', $propia->id);
        $segunda->save();

        $respuesta = $this->actingAs($this->usuario)->getJson("/api/v1/ventas/{$venta->ulid}/impreso")
            ->assertOk()->assertJsonCount(2, 'data.lineas');
        $nombres = array_column($respuesta->json('data.lineas'), 'unidad_medida_nombre', 'unidad_medida_id');
        $this->assertSame('Pieza', $nombres[$pieza->id]);
        $this->assertSame('Caja propia', $nombres[$propia->id]);
    }
}
