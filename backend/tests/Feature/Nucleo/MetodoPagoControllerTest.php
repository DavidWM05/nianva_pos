<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MetodoPagoControllerTest extends TestCase
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

        return compact('tenant', 'usuario');
    }

    public function test_solo_activos_devuelve_solo_los_metodos_activos_ordenados_por_nombre(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['metodos_pago.ver']);
        MetodoPago::create(['tenant_id' => null, 'nombre' => 'Transferencia', 'tipo' => 'transferencia']);
        MetodoPago::create(['tenant_id' => null, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);
        MetodoPago::create(['tenant_id' => $tenant->id, 'nombre' => 'Inactivo', 'tipo' => 'otro', 'activo' => false]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/metodos-pago?solo_activos=1');

        $respuesta->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.nombre', 'Efectivo')
            ->assertJsonPath('data.1.nombre', 'Transferencia');
        $respuesta->assertJsonMissingPath('meta');
    }

    public function test_index_exige_el_permiso_metodos_pago_ver(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $this->actingAs($usuario);

        $this->getJson('/api/metodos-pago')->assertForbidden();
    }

    public function test_index_pagina_filtra_y_reporta_permisos(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['metodos_pago.ver', 'metodos_pago.crear']);
        MetodoPago::create(['tenant_id' => null, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);
        MetodoPago::create(['tenant_id' => $tenant->id, 'nombre' => 'Vales de despensa', 'tipo' => 'otro']);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/metodos-pago?filtro_nombre=vale');

        $respuesta->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nombre', 'Vales de despensa')
            ->assertJsonPath('meta.permisos.crear', true)
            ->assertJsonPath('meta.permisos.editar', false);
    }

    public function test_index_incluye_las_filas_globales_ademas_de_las_del_tenant(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['metodos_pago.ver']);
        MetodoPago::create(['tenant_id' => null, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);
        MetodoPago::create(['tenant_id' => $tenant->id, 'nombre' => 'Vales de despensa', 'tipo' => 'otro']);

        $this->actingAs($usuario);

        $this->getJson('/api/metodos-pago')->assertOk()->assertJsonCount(2, 'data');
    }

    public function test_crear_metodo_de_pago_siempre_lo_asigna_al_tenant_actual(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['metodos_pago.crear']);
        $this->actingAs($usuario);

        $respuesta = $this->postJson('/api/metodos-pago', [
            'nombre' => 'Vales de despensa', 'tipo' => 'otro', 'incluir_en_financiero' => true,
        ]);

        $respuesta->assertCreated()->assertJsonPath('data.es_global', false);
        $this->assertDatabaseHas('metodos_pago', ['nombre' => 'Vales de despensa', 'tenant_id' => $tenant->id]);
    }

    public function test_editar_un_metodo_de_pago_global_esta_prohibido_para_un_usuario_normal(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['metodos_pago.editar']);
        $global = MetodoPago::create(['tenant_id' => null, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);

        $this->actingAs($usuario);

        $this->putJson("/api/metodos-pago/{$global->id}", [
            'nombre' => 'Efectivo (modificado)', 'tipo' => 'efectivo', 'incluir_en_financiero' => true,
        ])->assertForbidden();
    }

    public function test_desactivar_un_metodo_de_pago_global_esta_prohibido_para_un_usuario_normal(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['metodos_pago.eliminar']);
        $global = MetodoPago::create(['tenant_id' => null, 'nombre' => 'Efectivo', 'tipo' => 'efectivo']);

        $this->actingAs($usuario);

        $this->patchJson("/api/metodos-pago/{$global->id}/desactivar")->assertForbidden();
    }

    public function test_editar_un_metodo_de_pago_propio_del_tenant_funciona(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['metodos_pago.editar']);
        $propio = MetodoPago::create(['tenant_id' => $tenant->id, 'nombre' => 'Vales', 'tipo' => 'otro']);

        $this->actingAs($usuario);

        $this->putJson("/api/metodos-pago/{$propio->id}", [
            'nombre' => 'Vales de despensa', 'tipo' => 'otro', 'incluir_en_financiero' => false,
        ])->assertOk()->assertJsonPath('data.nombre', 'Vales de despensa');
    }
}
