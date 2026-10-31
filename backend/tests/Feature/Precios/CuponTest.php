<?php

namespace Tests\Feature\Precios;

use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Precios\Models\Cupon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CuponTest extends TestCase
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

    public function test_lista_pagina_y_filtra_por_codigo_o_nombre(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['cupones.ver']);
        Cupon::create(['tenant_id' => $tenant->id, 'codigo' => 'VERANO10', 'nombre' => 'Descuento de verano', 'tipo' => 'porcentaje', 'valor' => 10]);
        Cupon::create(['tenant_id' => $tenant->id, 'codigo' => 'INVIERNO20', 'nombre' => 'Descuento de invierno', 'tipo' => 'porcentaje', 'valor' => 20]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/v1/cupones?filtro_nombre=verano');

        $respuesta->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.codigo', 'VERANO10');
    }

    public function test_show_exige_el_permiso_cupones_ver_y_devuelve_el_cupon_con_permisos(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['cupones.ver']);
        $cupon = Cupon::create(['tenant_id' => $tenant->id, 'codigo' => 'VERANO10', 'nombre' => 'Descuento de verano', 'tipo' => 'porcentaje', 'valor' => 10]);

        $this->actingAs($usuario);

        $this->getJson("/api/v1/cupones/{$cupon->id}")
            ->assertOk()
            ->assertJsonPath('data.codigo', 'VERANO10')
            ->assertJsonPath('meta.permisos.editar', false);
    }

    public function test_show_sin_el_permiso_cupones_ver_devuelve_403(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $cupon = Cupon::create(['tenant_id' => $tenant->id, 'codigo' => 'VERANO10', 'nombre' => 'Descuento de verano', 'tipo' => 'porcentaje', 'valor' => 10]);

        $this->actingAs($usuario);

        $this->getJson("/api/v1/cupones/{$cupon->id}")->assertForbidden();
    }

    public function test_index_exige_el_permiso_cupones_ver(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $this->actingAs($usuario);

        $this->getJson('/api/v1/cupones')->assertForbidden();
    }

    public function test_el_codigo_del_cupon_es_unico_por_tenant_no_globalmente(): void
    {
        ['tenant' => $tenantA, 'usuario' => $usuarioA] = $this->crearUsuarioConPermisos(['cupones.crear']);
        Cupon::create(['tenant_id' => $tenantA->id, 'codigo' => 'DESC10', 'nombre' => 'Descuento', 'tipo' => 'porcentaje', 'valor' => 10]);

        $this->actingAs($usuarioA);
        $this->postJson('/api/v1/cupones', ['codigo' => 'DESC10', 'nombre' => 'Otro', 'tipo' => 'porcentaje', 'valor' => 5])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('codigo');

        // Mismo codigo, tenant DISTINTO: no deberia chocar.
        ['usuario' => $usuarioB] = $this->crearUsuarioConPermisos(['cupones.crear']);
        $this->actingAs($usuarioB);
        $this->postJson('/api/v1/cupones', ['codigo' => 'DESC10', 'nombre' => 'Descuento tenant B', 'tipo' => 'porcentaje', 'valor' => 8])
            ->assertCreated();
    }

    public function test_desactivar_cupon_nunca_borra_fisicamente(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['cupones.eliminar']);
        $cupon = Cupon::create(['tenant_id' => $tenant->id, 'codigo' => 'PROMO5', 'nombre' => 'Promo', 'tipo' => 'monto_fijo', 'valor' => 50]);

        $this->actingAs($usuario);

        $this->patchJson("/api/v1/cupones/{$cupon->id}/desactivar")
            ->assertOk()
            ->assertJsonPath('data.activo', false);

        $this->assertDatabaseHas('cupones', ['id' => $cupon->id, 'activo' => false]);
    }

    /**
     * validar() lo usa la pantalla de venta (TPV) -- el permiso es
     * ventas.crear, no cupones.ver (ver CuponController::validar()).
     */
    public function test_validar_devuelve_el_descuento_de_un_cupon_vigente(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['ventas.crear']);
        Cupon::create(['tenant_id' => $tenant->id, 'codigo' => 'VERANO10', 'nombre' => 'Descuento de verano', 'tipo' => 'porcentaje', 'valor' => 10]);

        $this->actingAs($usuario);

        $respuesta = $this->postJson('/api/v1/cupones/validar', ['codigo' => 'VERANO10', 'total' => 200]);

        $respuesta->assertOk()
            ->assertJsonPath('data.cupon.codigo', 'VERANO10')
            ->assertJsonPath('data.descuento', 20)
            ->assertJsonPath('data.total_con_descuento', 180);
    }

    public function test_validar_con_codigo_inexistente_devuelve_422_con_error_code_cupon_invalido(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['ventas.crear']);
        $this->actingAs($usuario);

        $this->postJson('/api/v1/cupones/validar', ['codigo' => 'NOEXISTE', 'total' => 100])
            ->assertStatus(422)
            ->assertJsonPath('error_code', 'cupon_invalido');
    }

    public function test_validar_sin_permiso_ventas_crear_devuelve_403(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['cupones.ver']);
        Cupon::create(['tenant_id' => $tenant->id, 'codigo' => 'VERANO10', 'nombre' => 'Descuento de verano', 'tipo' => 'porcentaje', 'valor' => 10]);

        $this->actingAs($usuario);

        $this->postJson('/api/v1/cupones/validar', ['codigo' => 'VERANO10', 'total' => 200])->assertForbidden();
    }
}
