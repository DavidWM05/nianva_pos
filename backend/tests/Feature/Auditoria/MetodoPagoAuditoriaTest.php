<?php

declare(strict_types=1);

namespace Tests\Feature\Auditoria;

use App\Modules\Auditoria\Models\Auditoria;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

/**
 * La pantalla de detalle de un método de pago tiene pestaña de auditoría (50c), pero
 * MetodoPago no estaba en config/auditoria.php: la pestaña salía siempre vacía.
 */
class MetodoPagoAuditoriaTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['metodos_pago.crear', 'metodos_pago.editar', 'metodos_pago.eliminar']);
        $this->usuario->refresh();
    }

    private function auditoria(int $id, string $accion): int
    {
        return Auditoria::sinTenant()
            ->where('tabla_afectada', 'metodos_pago')
            ->where('registro_id', $id)
            ->where('accion', $accion)
            ->count();
    }

    public function test_crear_editar_y_desactivar_un_metodo_de_pago_dejan_auditoria(): void
    {
        $id = (int) $this->actingAs($this->usuario)
            ->postJson('/api/v1/metodos-pago', [
                'nombre' => 'Vales de despensa',
                'tipo' => 'otro',
                'incluir_en_financiero' => true,
            ])
            ->assertCreated()
            ->json('data.id');

        $this->assertSame(1, $this->auditoria($id, 'create'));

        $this->actingAs($this->usuario)
            ->putJson("/api/v1/metodos-pago/{$id}", [
                'nombre' => 'Vales',
                'tipo' => 'otro',
                'incluir_en_financiero' => false,
            ])
            ->assertOk();

        $this->assertSame(1, $this->auditoria($id, 'update'));

        $this->actingAs($this->usuario)
            ->patchJson("/api/v1/metodos-pago/{$id}/desactivar")
            ->assertOk();

        $this->assertSame(2, $this->auditoria($id, 'update'));
    }
}
