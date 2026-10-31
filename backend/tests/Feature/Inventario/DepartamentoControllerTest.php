<?php

namespace Tests\Feature\Inventario;

use App\Modules\Inventario\Models\Departamento;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DepartamentoControllerTest extends TestCase
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

        return compact('tenant', 'sucursal', 'usuario');
    }

    public function test_solo_activos_devuelve_la_lista_plana_sin_paginar(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.ver']);
        Departamento::create(['tenant_id' => $tenant->id, 'nombre' => 'Damas', 'activo' => true]);
        Departamento::create(['tenant_id' => $tenant->id, 'nombre' => 'Descontinuado', 'activo' => false]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/v1/departamentos?solo_activos=1');

        $respuesta->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.nombre', 'Damas');
        $respuesta->assertJsonMissingPath('meta');
    }

    public function test_index_pagina_filtra_y_reporta_permisos(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.ver', 'inventario.crear']);
        Departamento::create(['tenant_id' => $tenant->id, 'nombre' => 'Damas', 'activo' => true]);
        Departamento::create(['tenant_id' => $tenant->id, 'nombre' => 'Caballeros', 'activo' => true]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/v1/departamentos?filtro_nombre=dama');

        $respuesta->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nombre', 'Damas')
            ->assertJsonPath('meta.permisos.crear', true)
            ->assertJsonPath('meta.permisos.editar', false);
    }

    public function test_index_exige_el_permiso_inventario_ver(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $this->actingAs($usuario);

        $this->getJson('/api/v1/departamentos')->assertForbidden();
    }

    public function test_crear_departamento(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.crear']);
        $this->actingAs($usuario);

        $this->postJson('/api/v1/departamentos', ['nombre' => 'Niños', 'descripcion' => 'Ropa infantil'])
            ->assertCreated()
            ->assertJsonPath('data.nombre', 'Niños')
            ->assertJsonPath('data.activo', true);
    }

    public function test_crear_exige_nombre(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.crear']);
        $this->actingAs($usuario);

        $this->postJson('/api/v1/departamentos', ['nombre' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('nombre');
    }

    public function test_editar_departamento(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.editar']);
        $departamento = Departamento::create(['tenant_id' => $tenant->id, 'nombre' => 'Damas', 'activo' => true]);

        $this->actingAs($usuario);

        $this->putJson("/api/v1/departamentos/{$departamento->id}", ['nombre' => 'Damas y Juniors'])
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Damas y Juniors');
    }

    public function test_desactivar_departamento_nunca_borra_fisicamente(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.eliminar']);
        $departamento = Departamento::create(['tenant_id' => $tenant->id, 'nombre' => 'Damas', 'activo' => true]);

        $this->actingAs($usuario);

        $this->patchJson("/api/v1/departamentos/{$departamento->id}/desactivar")
            ->assertOk()
            ->assertJsonPath('data.activo', false);

        $this->assertDatabaseHas('departamentos', ['id' => $departamento->id, 'activo' => false]);
    }
}
