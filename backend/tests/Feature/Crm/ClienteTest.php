<?php

namespace Tests\Feature\Crm;

use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ClienteTest extends TestCase
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

    public function test_lista_pagina_filtra_ordena_y_reporta_los_permisos_efectivos(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['clientes.ver', 'clientes.crear']);
        Cliente::create(['tenant_id' => $tenant->id, 'nombre' => 'Beatriz Solis']);
        Cliente::create(['tenant_id' => $tenant->id, 'nombre' => 'Carlos Ruiz']);
        // + el "Publico General" que ya crea el TenantObserver al crear el tenant.

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/clientes?rows=2&page=1&sort_field=nombre&sort_order=asc');

        $respuesta->assertOk();
        $respuesta->assertJsonPath('meta.total', 3);
        $respuesta->assertJsonPath('meta.permisos.crear', true);
        $respuesta->assertJsonPath('meta.permisos.editar', false);
        $respuesta->assertJsonCount(2, 'data');
        $respuesta->assertJsonPath('data.0.nombre', 'Beatriz Solis');

        $filtrado = $this->getJson('/api/clientes?filtro_nombre=carlos');
        $filtrado->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.nombre', 'Carlos Ruiz');
    }

    public function test_show_incluye_los_permisos_efectivos_para_la_vista_de_registro(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['clientes.ver', 'clientes.editar']);
        $cliente = Cliente::create(['tenant_id' => $tenant->id, 'nombre' => 'Gabriel Rios']);

        $this->actingAs($usuario);

        $this->getJson("/api/clientes/{$cliente->id}")
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Gabriel Rios')
            ->assertJsonPath('meta.permisos.editar', true)
            ->assertJsonPath('meta.permisos.eliminar', false);
    }

    public function test_index_exige_el_permiso_clientes_ver(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $this->actingAs($usuario);

        $this->getJson('/api/clientes')->assertForbidden();
    }

    public function test_crear_cliente_exige_permiso_y_valida_el_nombre(): void
    {
        ['usuario' => $sinPermiso] = $this->crearUsuarioConPermisos(['clientes.ver']);
        $this->actingAs($sinPermiso);
        $this->postJson('/api/clientes', ['nombre' => 'Nuevo'])->assertForbidden();

        ['usuario' => $conPermiso] = $this->crearUsuarioConPermisos(['clientes.ver', 'clientes.crear']);
        $this->actingAs($conPermiso);

        $this->postJson('/api/clientes', [])->assertUnprocessable()->assertJsonValidationErrors('nombre');

        $this->postJson('/api/clientes', ['nombre' => 'Diana Torres', 'correo' => 'diana@test.com'])
            ->assertCreated()
            ->assertJsonPath('data.nombre', 'Diana Torres')
            ->assertJsonPath('data.activo', true)
            ->assertJsonPath('data.es_sistema', false);
    }

    public function test_el_cliente_publico_general_no_se_puede_editar_ni_desactivar(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['clientes.editar', 'clientes.eliminar']);
        $publicoGeneral = Cliente::where('tenant_id', $tenant->id)->where('es_sistema', true)->firstOrFail();

        $this->actingAs($usuario);

        $this->putJson("/api/clientes/{$publicoGeneral->id}", ['nombre' => 'Intento de cambio'])->assertForbidden();
        $this->patchJson("/api/clientes/{$publicoGeneral->id}/desactivar")->assertForbidden();

        $this->assertSame('Publico General', $publicoGeneral->fresh()->nombre);
        $this->assertTrue($publicoGeneral->fresh()->activo);
    }

    public function test_desactivar_un_cliente_normal_solo_apaga_activo(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['clientes.eliminar']);
        $cliente = Cliente::create(['tenant_id' => $tenant->id, 'nombre' => 'Elena Vargas']);

        $this->actingAs($usuario);

        $this->patchJson("/api/clientes/{$cliente->id}/desactivar")
            ->assertOk()
            ->assertJsonPath('data.activo', false);

        $this->assertDatabaseHas('clientes', ['id' => $cliente->id, 'activo' => false]);
    }

    public function test_ventas_por_cliente_solo_devuelve_las_de_ese_cliente_en_su_tenant(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['clientes.ver']);
        $sucursal = Sucursal::where('tenant_id', $tenant->id)->firstOrFail();
        $cajaSesion = CajaSesion::create([
            'sucursal_id' => $sucursal->id,
            'usuario_id' => $usuario->id,
            'monto_apertura' => 0,
            'fecha_apertura' => now(),
        ]);

        $clienteA = Cliente::create(['tenant_id' => $tenant->id, 'nombre' => 'Cliente A']);
        $clienteB = Cliente::create(['tenant_id' => $tenant->id, 'nombre' => 'Cliente B']);

        Venta::create([
            'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id, 'caja_sesion_id' => $cajaSesion->id,
            'usuario_id' => $usuario->id, 'cliente_id' => $clienteA->id, 'total' => 150.00,
        ]);
        Venta::create([
            'tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id, 'caja_sesion_id' => $cajaSesion->id,
            'usuario_id' => $usuario->id, 'cliente_id' => $clienteB->id, 'total' => 300.00,
        ]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson("/api/clientes/{$clienteA->id}/ventas");

        $respuesta->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.total', '150.00');
    }

    public function test_auditoria_devuelve_las_entradas_del_registro_solicitado(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['clientes.editar', 'auditoria.ver']);
        $this->actingAs($usuario);

        $cliente = Cliente::create(['tenant_id' => $tenant->id, 'nombre' => 'Fernanda Ibarra']);
        $this->putJson("/api/clientes/{$cliente->id}", ['nombre' => 'Fernanda I. Torres'])->assertOk();

        $respuesta = $this->getJson("/api/auditoria?tabla=clientes&registro_id={$cliente->id}");

        $respuesta->assertOk();
        $acciones = collect($respuesta->json('data'))->pluck('accion');
        $this->assertTrue($acciones->contains('create'));
        $this->assertTrue($acciones->contains('update'));
    }
}
