<?php

namespace Tests\Feature\Gastos;

use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Services\CajaService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GastoControllerTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  list<string>  $permisos
     * @return array{tenant: Tenant, sucursal: Sucursal, usuario: Usuario}
     */
    private function crearUsuarioConPermisos(array $permisos): array
    {
        $tenant = Tenant::create(['nombre' => 'Nianva POS Ropa', 'pais' => 'MX', 'activo' => true]);
        $sucursal = Sucursal::create(['tenant_id' => $tenant->id, 'nombre' => 'Centro']);
        $usuario = Usuario::create([
            'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id,
            'nombre' => 'Ana', 'correo' => uniqid('ana-').'@test.com', 'password' => 'password-valida-123',
        ]);

        app(TenantContext::class)->set($tenant);

        if ($permisos !== []) {
            $rol = Rol::create(['tenant_id' => null, 'nombre' => 'rol-de-prueba-'.uniqid(), 'es_sistema' => false]);
            $ids = collect($permisos)->map(function (string $nombre) {
                [$modulo, $accion] = explode('.', $nombre);

                return Permiso::firstOrCreate(['nombre' => $nombre], ['modulo' => $modulo, 'accion' => $accion])->id;
            });
            $rol->permisos()->attach($ids);
            $usuario->roles()->attach($rol->id);
        }

        return compact('tenant', 'sucursal', 'usuario');
    }

    public function test_store_registra_un_gasto_de_la_sesion_abierta(): void
    {
        ['sucursal' => $sucursal, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['caja.abrir', 'gastos.crear']);
        app(CajaService::class)->abrirCaja($sucursal->id, $usuario->id, 500);
        $this->actingAs($usuario);

        $this->postJson('/api/v1/gastos', ['descripcion' => 'Luz', 'monto' => 80])
            ->assertCreated()
            ->assertJsonPath('data.descripcion', 'Luz')
            ->assertJsonPath('data.monto', '80.00');
    }

    public function test_store_sin_caja_abierta_devuelve_422_con_error_code_caja_no_abierta(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['gastos.crear']);
        $this->actingAs($usuario);

        $this->postJson('/api/v1/gastos', ['descripcion' => 'Luz', 'monto' => 80])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'caja_no_abierta');
    }

    public function test_store_sin_permiso_devuelve_403(): void
    {
        ['sucursal' => $sucursal, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['caja.abrir']);
        app(CajaService::class)->abrirCaja($sucursal->id, $usuario->id, 500);
        $this->actingAs($usuario);

        $this->postJson('/api/v1/gastos', ['descripcion' => 'Luz', 'monto' => 80])->assertForbidden();
    }

    public function test_index_lista_los_gastos_de_la_sesion_indicada(): void
    {
        ['sucursal' => $sucursal, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['caja.abrir', 'gastos.ver', 'gastos.crear']);
        $sesion = app(CajaService::class)->abrirCaja($sucursal->id, $usuario->id, 500);
        $this->actingAs($usuario);

        $this->postJson('/api/v1/gastos', ['descripcion' => 'Luz', 'monto' => 80])->assertCreated();
        $this->postJson('/api/v1/gastos', ['descripcion' => 'Agua', 'monto' => 40])->assertCreated();

        $respuesta = $this->getJson("/api/v1/gastos?caja_sesion_id={$sesion->id}");

        $respuesta->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_index_sin_permiso_devuelve_403(): void
    {
        ['sucursal' => $sucursal, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['caja.abrir']);
        $sesion = app(CajaService::class)->abrirCaja($sucursal->id, $usuario->id, 500);
        $this->actingAs($usuario);

        $this->getJson("/api/v1/gastos?caja_sesion_id={$sesion->id}")->assertForbidden();
    }
}
