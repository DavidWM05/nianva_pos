<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermisoControllerTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  list<string>  $permisos
     */
    private function crearUsuarioConPermisos(array $permisos): Usuario
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

        return $usuario;
    }

    public function test_index_exige_el_permiso_roles_ver(): void
    {
        $usuario = $this->crearUsuarioConPermisos([]);
        $this->actingAs($usuario);

        $this->getJson('/api/v1/permisos')->assertForbidden();
    }

    public function test_index_devuelve_el_catalogo_ordenado_por_modulo_y_accion(): void
    {
        $usuario = $this->crearUsuarioConPermisos(['roles.ver']);
        Permiso::firstOrCreate(['nombre' => 'clientes.crear'], ['modulo' => 'clientes', 'accion' => 'crear']);
        Permiso::firstOrCreate(['nombre' => 'clientes.ver'], ['modulo' => 'clientes', 'accion' => 'ver']);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/v1/permisos');

        $respuesta->assertOk();
        // roles.ver (creado arriba) + los dos de clientes -- ordenados por
        // modulo asc, entonces "clientes" antes que "roles".
        $respuesta->assertJsonPath('data.0.modulo', 'clientes');
        $respuesta->assertJsonPath('data.0.accion', 'crear');
    }
}
