<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SucursalControllerTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  list<string>  $permisos
     * @return array{tenant: Tenant, usuario: Usuario}
     */
    private function crearUsuarioConPermisos(array $permisos): array
    {
        $tenant = Tenant::create(['nombre' => 'Nianva POS Ropa', 'pais' => 'MX', 'activo' => true]);
        $sucursal = Sucursal::create(['tenant_id' => $tenant->id, 'nombre' => 'Centro']);
        $usuario = Usuario::create([
            'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id,
            'nombre' => 'Ana', 'correo' => uniqid('ana-').'@test.com', 'password' => 'password-valida-123',
        ]);

        if ($permisos !== []) {
            $rol = Rol::create(['tenant_id' => null, 'nombre' => 'rol-de-prueba-'.uniqid(), 'es_sistema' => false]);
            $ids = collect($permisos)->map(function (string $nombre) {
                [$modulo, $accion] = explode('.', $nombre);

                return Permiso::firstOrCreate(['nombre' => $nombre], ['modulo' => $modulo, 'accion' => $accion])->id;
            });
            $rol->permisos()->attach($ids);
            $usuario->roles()->attach($rol->id);
        }

        return compact('tenant', 'usuario');
    }

    public function test_index_exige_el_permiso_usuarios_ver(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $this->actingAs($usuario);

        $this->getJson('/api/sucursales')->assertForbidden();
    }

    public function test_index_devuelve_solo_las_sucursales_activas(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['usuarios.ver']);
        Sucursal::create(['tenant_id' => $tenant->id, 'nombre' => 'Norte', 'activo' => false]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/sucursales');

        $respuesta->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.nombre', 'Centro');
    }
}
