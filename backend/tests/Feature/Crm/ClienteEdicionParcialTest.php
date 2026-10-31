<?php

namespace Tests\Feature\Crm;

use App\Modules\Crm\Models\Cliente;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class ClienteEdicionParcialTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['clientes.crear', 'clientes.editar']);
    }

    public function test_actualizar_cliente_solo_con_nombre_conserva_los_demas_campos(): void
    {
        $cliente = Cliente::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'Cliente original',
            'documento_fiscal' => 'RFC-ORIGINAL',
            'telefono' => '555-1234',
            'correo' => 'original@test.com',
            'direccion' => 'Calle Original 123',
        ]);
        $this->actingAs($this->usuario);

        $this->putJson("/api/v1/clientes/{$cliente->id}", ['nombre' => 'Cliente actualizado'])
            ->assertOk();

        $cliente->refresh();
        $this->assertSame('Cliente actualizado', $cliente->nombre);
        $this->assertSame('RFC-ORIGINAL', $cliente->documento_fiscal);
        $this->assertSame('555-1234', $cliente->telefono);
        $this->assertSame('original@test.com', $cliente->correo);
        $this->assertSame('Calle Original 123', $cliente->direccion);
    }
}
