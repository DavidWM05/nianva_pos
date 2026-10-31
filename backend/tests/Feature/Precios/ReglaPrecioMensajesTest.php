<?php

namespace Tests\Feature\Precios;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

/**
 * Los mensajes de las validaciones condicionales de GuardarReglaPrecioRequest
 * llegan intactos (UTF-8) al cliente.
 */
class ReglaPrecioMensajesTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    public function test_aplica_a_categoria_sin_categoria_responde_el_mensaje_con_acento(): void
    {
        $this->prepararNegocio(['reglas_precio.crear']);
        $this->actingAs($this->usuario);

        $this->postJson('/api/v1/reglas-precio', [
            'nombre' => 'Sin categoria',
            'tipo' => 'porcentaje',
            'valor' => 10,
            'aplica_a' => 'categoria',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('errors.categoria_id.0', 'Selecciona una categoría.');
    }
}
