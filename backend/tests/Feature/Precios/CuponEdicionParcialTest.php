<?php

namespace Tests\Feature\Precios;

use App\Modules\Precios\Models\Cupon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class CuponEdicionParcialTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['cupones.crear', 'cupones.editar']);
    }

    public function test_actualizar_cupon_sin_uso_maximo_conserva_el_valor_anterior(): void
    {
        $cupon = Cupon::create([
            'tenant_id' => $this->tenant->id,
            'codigo' => 'PARCIAL10',
            'nombre' => 'Cupon original',
            'tipo' => 'porcentaje',
            'valor' => 10,
            'uso_maximo' => 5,
        ]);
        $this->actingAs($this->usuario);

        $this->putJson("/api/cupones/{$cupon->id}", [
            'codigo' => 'PARCIAL10',
            'nombre' => 'Cupon actualizado',
            'tipo' => 'porcentaje',
            'valor' => 15,
        ])->assertOk();

        $cupon->refresh();
        $this->assertSame('Cupon actualizado', $cupon->nombre);
        $this->assertSame(15.0, (float) $cupon->valor);
        $this->assertSame(5, $cupon->uso_maximo);
    }
}
