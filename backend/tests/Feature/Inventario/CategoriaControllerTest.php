<?php

namespace Tests\Feature\Inventario;

use App\Modules\Inventario\Models\Categoria;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CategoriaControllerTest extends TestCase
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
        Categoria::create(['tenant_id' => $tenant->id, 'nombre' => 'Playeras', 'activo' => true]);
        Categoria::create(['tenant_id' => $tenant->id, 'nombre' => 'Descontinuada', 'activo' => false]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/categorias?solo_activos=1');

        $respuesta->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.nombre', 'Playeras');
        $respuesta->assertJsonMissingPath('meta');
    }

    public function test_index_pagina_filtra_y_reporta_permisos(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.ver', 'inventario.crear']);
        Categoria::create(['tenant_id' => $tenant->id, 'nombre' => 'Playeras', 'activo' => true]);
        Categoria::create(['tenant_id' => $tenant->id, 'nombre' => 'Pantalones', 'activo' => true]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/categorias?filtro_nombre=play');

        $respuesta->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nombre', 'Playeras')
            ->assertJsonPath('meta.permisos.crear', true)
            ->assertJsonPath('meta.permisos.editar', false);
    }

    public function test_index_exige_el_permiso_inventario_ver(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $this->actingAs($usuario);

        $this->getJson('/api/categorias')->assertForbidden();
    }

    public function test_crear_categoria(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.crear']);
        $this->actingAs($usuario);

        $this->postJson('/api/categorias', ['nombre' => 'Accesorios', 'descripcion' => 'Cinturones, gorras, etc.'])
            ->assertCreated()
            ->assertJsonPath('data.nombre', 'Accesorios')
            ->assertJsonPath('data.activo', true);
    }

    public function test_crear_exige_nombre(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.crear']);
        $this->actingAs($usuario);

        $this->postJson('/api/categorias', ['nombre' => ''])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('nombre');
    }

    public function test_editar_categoria(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.editar']);
        $categoria = Categoria::create(['tenant_id' => $tenant->id, 'nombre' => 'Playeras', 'activo' => true]);

        $this->actingAs($usuario);

        $this->putJson("/api/categorias/{$categoria->id}", ['nombre' => 'Playeras y Blusas'])
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Playeras y Blusas');
    }

    public function test_desactivar_categoria_nunca_borra_fisicamente(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['inventario.eliminar']);
        $categoria = Categoria::create(['tenant_id' => $tenant->id, 'nombre' => 'Playeras', 'activo' => true]);

        $this->actingAs($usuario);

        $this->patchJson("/api/categorias/{$categoria->id}/desactivar")
            ->assertOk()
            ->assertJsonPath('data.activo', false);

        $this->assertDatabaseHas('categorias', ['id' => $categoria->id, 'activo' => false]);
    }
}
