<?php

declare(strict_types=1);

namespace Tests\Feature\NotasCredito;

use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Models\NotaCreditoUso;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * ARQ-12b: el detalle de una nota de credito publica cada uso con su monto en D2 y la venta en
 * la que se uso, como lo lee la pantalla (antes era el modelo crudo, sin la venta en el contrato).
 */
class UsosNotaCreditoTest extends TestCase
{
    use RefreshDatabase;

    public function test_el_detalle_trae_cada_uso_con_su_venta(): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $nota = NotaCredito::factory()->create(['tenant_id' => $tenant->id]);
        $uso = NotaCreditoUso::factory()->create(['nota_credito_id' => $nota->id, 'monto_usado' => 12.5]);

        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id]);
        $rol = Rol::factory()->create(['tenant_id' => $tenant->id]);
        foreach (['notas_credito.ver', 'sucursales.todas'] as $nombre) {
            [$modulo, $accion] = explode('.', $nombre);
            $rol->permisos()->attach(Permiso::firstOrCreate(['nombre' => $nombre], ['modulo' => $modulo, 'accion' => $accion])->id);
        }
        $usuario->roles()->attach($rol->id);
        $this->actingAs($usuario);

        $this->getJson("/api/v1/notas-credito/{$nota->id}")
            ->assertOk()
            ->assertJsonPath('data.usos.0.id', $uso->id)
            ->assertJsonPath('data.usos.0.monto_usado', '12.50')
            ->assertJsonPath('data.usos.0.venta.id', $uso->venta_id)
            ->assertJsonMissingPath('data.usos.0.nota_credito_id');
    }
}
