<?php

namespace Tests\Feature\CrmAvanzado;

use App\Modules\Crm\Models\Cliente;
use App\Modules\CrmAvanzado\Http\Requests\CrearInteraccionRequest;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class InteraccionGuardTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['crm_interacciones.crear']);
    }

    public function test_cliente_de_otro_tenant_con_payload_invalido_responde_404_antes_de_422(): void
    {
        Route::bind('cliente', fn (string $id) => Cliente::sinTenant()->findOrFail($id));

        Route::middleware(['web', 'auth'])->post(
            '/test-clientes/{cliente}/interacciones',
            fn (CrearInteraccionRequest $request) => response()->json(['ok' => true]),
        );

        $this->actingAs($this->usuario);

        $this->postJson("/test-clientes/{$this->clienteB->id}/interacciones", [
            'tipo' => 'invalido',
        ])
            ->assertNotFound()
            ->assertJsonMissingPath('errors');
    }
}
