<?php

namespace Tests\Feature\Produccion;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class ProduccionExistsTenantTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['produccion.crear', 'produccion.transformar']);
    }

    public function test_insumo_rechaza_unidad_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/insumos', [
            'nombre' => 'Insumo',
            'unidad_medida_id' => $this->unidadMedidaB->id,
        ])->assertStatus(422)->assertJsonValidationErrors(['unidad_medida_id']);
    }

    public function test_insumo_acepta_unidad_global(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/insumos', [
            'nombre' => 'Insumo',
            'unidad_medida_id' => $this->unidadMedidaGlobal->id,
        ])->assertCreated();
    }

    public function test_stock_rechaza_sucursal_de_otro_tenant(): void
    {
        $insumo = $this->crearInsumo();
        $this->actingAs($this->usuario);

        $this->postJson("/api/v1/insumos/{$insumo->id}/stocks", [
            'sucursal_id' => $this->sucursalB->id,
            'cantidad' => 1,
        ])->assertStatus(422)->assertJsonValidationErrors(['sucursal_id']);
    }

    public function test_receta_rechaza_variante_de_otro_tenant(): void
    {
        $insumo = $this->crearInsumo();
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/recetas', [
            'variante_id' => $this->varianteB->id,
            'nombre' => 'Receta',
            'ingredientes' => [[
                'insumo_id' => $insumo->id,
                'cantidad' => 1,
                'unidad_medida_id' => $this->unidadMedidaGlobal->id,
            ]],
        ])->assertStatus(422)->assertJsonValidationErrors(['variante_id']);
    }

    public function test_receta_rechaza_insumo_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/recetas', [
            'variante_id' => $this->variante->id,
            'nombre' => 'Receta',
            'ingredientes' => [[
                'insumo_id' => $this->insumoB->id,
                'cantidad' => 1,
                'unidad_medida_id' => $this->unidadMedidaGlobal->id,
            ]],
        ])->assertStatus(422)->assertJsonValidationErrors(['ingredientes.0.insumo_id']);
    }

    public function test_receta_rechaza_unidad_de_otro_tenant(): void
    {
        $insumo = $this->crearInsumo();
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/recetas', [
            'variante_id' => $this->variante->id,
            'nombre' => 'Receta',
            'ingredientes' => [[
                'insumo_id' => $insumo->id,
                'cantidad' => 1,
                'unidad_medida_id' => $this->unidadMedidaB->id,
            ]],
        ])->assertStatus(422)->assertJsonValidationErrors(['ingredientes.0.unidad_medida_id']);
    }

    public function test_receta_acepta_unidad_global(): void
    {
        $insumo = $this->crearInsumo();
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/recetas', [
            'variante_id' => $this->variante->id,
            'nombre' => 'Receta',
            'ingredientes' => [[
                'insumo_id' => $insumo->id,
                'cantidad' => 1,
                'unidad_medida_id' => $this->unidadMedidaGlobal->id,
            ]],
        ])->assertCreated();
    }

    public function test_orden_rechaza_receta_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/ordenes-produccion', [
            'receta_id' => $this->recetaB->id,
            'cantidad_programada' => 1,
        ])->assertStatus(422)->assertJsonValidationErrors(['receta_id']);
    }

    public function test_transformacion_rechaza_variante_origen_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/transformaciones', [
            'variante_origen_id' => $this->varianteB->id,
            'variante_destino_id' => $this->variante->id,
            'cantidad_origen' => 1,
            'cantidad_destino' => 1,
        ])->assertStatus(422)->assertJsonValidationErrors(['variante_origen_id']);
    }

    public function test_transformacion_rechaza_variante_destino_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/transformaciones', [
            'variante_origen_id' => $this->variante->id,
            'variante_destino_id' => $this->varianteB->id,
            'cantidad_origen' => 1,
            'cantidad_destino' => 1,
        ])->assertStatus(422)->assertJsonValidationErrors(['variante_destino_id']);
    }
}
