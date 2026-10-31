<?php

namespace Tests\Feature\Gastos;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class GastoExistsTenantTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['gastos.ver']);
    }

    public function test_listado_rechaza_caja_de_otro_tenant(): void
    {
        $this->actingAs($this->usuario);

        $this->getJson("/api/v1/gastos?caja_sesion_id={$this->cajaB->id}")
            ->assertStatus(422)
            ->assertJsonValidationErrors(['caja_sesion_id']);
    }
}
