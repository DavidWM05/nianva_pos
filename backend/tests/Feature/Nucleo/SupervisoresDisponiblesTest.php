<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Database\Seeders\NucleoRolesPermisosSeeder;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class SupervisoresDisponiblesTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    public function test_lista_solo_supervisores_elegibles_para_la_accion_y_sucursal(): void
    {
        $this->seed(NucleoRolesPermisosSeeder::class);
        $this->prepararNegocio(['caja.ver']);
        $this->actingAs($this->usuario);
        $otraSucursal = Sucursal::factory()->create(['tenant_id' => $this->tenant->id]);
        $permitido = $this->supervisor($this->sucursal, ['supervisor.autorizar', 'ventas.anular']);
        $multisucursal = $this->supervisor($otraSucursal, ['supervisor.autorizar', 'ventas.anular', 'sucursales.todas']);
        $this->supervisor($otraSucursal, ['supervisor.autorizar', 'ventas.anular']);
        $this->supervisor($this->sucursalB, ['supervisor.autorizar', 'ventas.anular', 'sucursales.todas']);
        $this->supervisor($this->sucursal, ['supervisor.autorizar']);
        $this->supervisor($this->sucursal, ['ventas.anular']);
        $this->supervisor($this->sucursal, ['supervisor.autorizar', 'ventas.anular'])->update(['activo' => false]);
        $this->supervisor($this->sucursal, ['supervisor.autorizar', 'ventas.anular'])->forceFill(['pin_caja_hash' => null])->save();
        $venta = $this->crearVenta();

        $respuesta = $this->getJson("/api/v1/supervisores?accion=ventas.anular&recurso={$venta->ulid}")->assertOk();
        $this->assertEqualsCanonicalizing([$permitido->id, $multisucursal->id], array_column($respuesta->json('data'), 'id'));
        foreach ($respuesta->json('data') as $fila) {
            $this->assertSame(['id', 'nombre'], array_keys($fila));
        }
    }

    public function test_exige_permiso_y_valida_el_contexto_de_la_accion(): void
    {
        $this->prepararNegocio([]);
        $this->actingAs($this->usuario);
        $this->getJson('/api/v1/supervisores?accion=ventas.descuento')->assertForbidden();

        $this->prepararNegocio(['caja.ver']);
        $this->actingAs($this->usuario);
        $this->getJson('/api/v1/supervisores?accion=ventas.anular')
            ->assertUnprocessable()->assertJsonValidationErrors('recurso');
        $this->getJson('/api/v1/supervisores?accion=otra')
            ->assertUnprocessable()->assertJsonValidationErrors('accion');
        $this->getJson('/api/v1/supervisores?accion=ventas.descuento')
            ->assertOk()->assertExactJson(['data' => []]);
    }

    /** @param list<string> $permisos */
    private function supervisor(Sucursal $sucursal, array $permisos): Usuario
    {
        $rol = Rol::factory()->create(['tenant_id' => $sucursal->tenant_id]);
        $rol->permisos()->attach(Permiso::query()->whereIn('nombre', $permisos)->pluck('id'));
        $usuario = Usuario::factory()->create(['tenant_id' => $sucursal->tenant_id, 'sucursal_id' => $sucursal->id]);
        $usuario->roles()->attach($rol->id);
        $usuario->forceFill(['pin_caja_hash' => Hash::make('7410')])->save();

        return $usuario;
    }
}
