<?php

namespace Tests\Feature\Permisos;

use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class PermisosEndpointsTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio([]);
    }

    private function conPermiso(string $permiso): void
    {
        $this->darPermisos([$permiso]);
        $this->actingAs($this->usuario->refresh());
    }

    private function unidad(string $abreviatura): UnidadMedida
    {
        return UnidadMedida::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'Unidad '.$abreviatura,
            'abreviatura' => $abreviatura,
            'tipo' => 'entero',
        ]);
    }

    public function test_unidades_index_exige_inventario_ver(): void
    {
        $this->actingAs($this->usuario);
        $this->getJson('/api/v1/unidades-medida')->assertForbidden();

        $this->conPermiso('inventario.ver');
        $this->getJson('/api/v1/unidades-medida')->assertOk();
    }

    public function test_unidades_store_exige_inventario_crear(): void
    {
        $payload = [
            'nombre' => 'Caja',
            'abreviatura' => 'cj',
            'tipo' => 'entero',
        ];

        $this->actingAs($this->usuario);
        $this->postJson('/api/v1/unidades-medida', $payload)->assertForbidden();

        $this->conPermiso('inventario.crear');
        $this->postJson('/api/v1/unidades-medida', $payload)->assertCreated();
    }

    public function test_unidades_update_exige_inventario_editar(): void
    {
        $unidad = $this->unidad('ed');

        $this->actingAs($this->usuario);
        $this->putJson("/api/v1/unidades-medida/{$unidad->id}", ['nombre' => 'Editada'])->assertForbidden();

        $this->conPermiso('inventario.editar');
        $this->putJson("/api/v1/unidades-medida/{$unidad->id}", ['nombre' => 'Editada'])->assertOk();
    }

    public function test_unidades_destroy_exige_inventario_eliminar(): void
    {
        $unidad = $this->unidad('el');

        $this->actingAs($this->usuario);
        $this->deleteJson("/api/v1/unidades-medida/{$unidad->id}")->assertForbidden();

        $this->conPermiso('inventario.eliminar');
        $this->deleteJson("/api/v1/unidades-medida/{$unidad->id}")->assertOk();
    }

    public function test_auditoria_index_exige_auditoria_ver(): void
    {
        $this->actingAs($this->usuario);
        $this->getJson('/api/v1/auditoria?tabla=clientes&registro_id=1')->assertForbidden();

        $this->conPermiso('auditoria.ver');
        $this->getJson('/api/v1/auditoria?tabla=clientes&registro_id=1')->assertOk();
    }

    public function test_cuentas_pagar_anular_exige_cuentas_pagar_anular(): void
    {
        $cuenta = CuentaPagar::create([
            'tenant_id' => $this->tenant->id,
            'compra_id' => $this->compra->id,
            'proveedor_id' => $this->proveedor->id,
            'monto_total' => 100,
            'saldo_pendiente' => 100,
            'fecha_vencimiento' => now()->addDays(30)->toDateString(),
            'estado' => 'pendiente',
        ]);

        $this->actingAs($this->usuario);
        $this->postJson("/api/v1/cuentas-pagar/{$cuenta->id}/anular")->assertForbidden();

        $this->conPermiso('cuentas_pagar.anular');
        $this->postJson("/api/v1/cuentas-pagar/{$cuenta->id}/anular")->assertOk();
    }
}
