<?php

namespace Tests\Feature\Inventario;

use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProveedorControllerTest extends TestCase
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
            'tenant_id' => $tenant->id,
            'sucursal_id' => $sucursal->id,
            'nombre' => 'Ana',
            'correo' => uniqid('ana-').'@test.com',
            'password' => 'password-valida-123',
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

    public function test_index_lista_solo_proveedores_activos_ordenados_por_razon_social(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.ver']);
        Proveedor::create(['tenant_id' => $tenant->id, 'razon_social' => 'Zapatos SA', 'activo' => true]);
        Proveedor::create(['tenant_id' => $tenant->id, 'razon_social' => 'Algodones MX', 'activo' => true]);
        Proveedor::create(['tenant_id' => $tenant->id, 'razon_social' => 'Inactivo SA', 'activo' => false]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/v1/proveedores');

        $respuesta->assertOk()->assertJsonCount(2, 'data');
        $respuesta->assertJsonPath('data.0.razon_social', 'Algodones MX');
        $respuesta->assertJsonPath('data.1.razon_social', 'Zapatos SA');
    }

    public function test_store_exige_permiso_inventario_crear_y_valida_razon_social(): void
    {
        ['usuario' => $sinPermiso] = $this->crearUsuarioConPermisos(['inventario.ver']);
        $this->actingAs($sinPermiso);
        $this->postJson('/api/v1/proveedores', ['razon_social' => 'Nuevo'])->assertForbidden();

        ['usuario' => $conPermiso] = $this->crearUsuarioConPermisos(['inventario.crear']);
        $this->actingAs($conPermiso);

        $this->postJson('/api/v1/proveedores', [])->assertUnprocessable()->assertJsonValidationErrors('razon_social');

        $this->postJson('/api/v1/proveedores', ['razon_social' => 'Textiles del Norte'])
            ->assertCreated()
            ->assertJsonPath('data.razon_social', 'Textiles del Norte');
    }
}
