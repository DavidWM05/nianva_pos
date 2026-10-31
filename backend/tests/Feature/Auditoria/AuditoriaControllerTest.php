<?php

namespace Tests\Feature\Auditoria;

use App\Modules\Auditoria\Models\Auditoria;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * NOTA: AuditObserver (ver app/Modules/Auditoria/Observers/AuditObserver.php)
 * escribe automaticamente en `auditoria` cada vez que se crea/edita/borra
 * CUALQUIER modelo auditable -- incluidos Tenant/Sucursal/Usuario/Rol, que
 * crearUsuarioConPermisos() ya crea para armar el fixture de cada test. Por
 * eso todas las aserciones de conteo aqui filtran por `tabla=productos`
 * (una tabla que el fixture nunca toca) en vez de asumir que la unica
 * auditoria en la base de datos es la que el test crea a mano.
 */
class AuditoriaControllerTest extends TestCase
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

    public function test_index_exige_tabla_y_registro_id(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['auditoria.ver']);
        $this->actingAs($usuario);

        $this->getJson('/api/v1/auditoria')->assertUnprocessable();
    }

    public function test_index_exige_el_permiso_auditoria_ver(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $this->actingAs($usuario);

        $this->getJson('/api/v1/auditoria?tabla=productos&registro_id=555')->assertForbidden();

        ['tenant' => $tenant, 'usuario' => $conPermiso] = $this->crearUsuarioConPermisos(['auditoria.ver']);
        Auditoria::create([
            'tenant_id' => $tenant->id, 'tabla_afectada' => 'productos', 'registro_id' => 555,
            'accion' => 'create', 'usuario_id' => $conPermiso->id,
        ]);

        $this->actingAs($conPermiso);

        $this->getJson('/api/v1/auditoria?tabla=productos&registro_id=555')->assertOk()->assertJsonCount(1, 'data');
    }

    public function test_global_exige_el_permiso_auditoria_ver(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $this->actingAs($usuario);

        $this->getJson('/api/v1/auditoria/global')->assertForbidden();
    }

    public function test_global_pagina_y_reporta_el_total(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['auditoria.ver']);
        Auditoria::create(['tenant_id' => $tenant->id, 'tabla_afectada' => 'productos', 'registro_id' => 501, 'accion' => 'create', 'usuario_id' => $usuario->id]);
        Auditoria::create(['tenant_id' => $tenant->id, 'tabla_afectada' => 'productos', 'registro_id' => 502, 'accion' => 'update', 'usuario_id' => $usuario->id]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/v1/auditoria/global?tabla=productos');

        $respuesta->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('meta.total', 2)
            ->assertJsonPath('data.0.usuario_nombre', 'Ana');
    }

    public function test_global_filtra_por_tabla(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['auditoria.ver']);
        Auditoria::create(['tenant_id' => $tenant->id, 'tabla_afectada' => 'productos', 'registro_id' => 601, 'accion' => 'create', 'usuario_id' => $usuario->id]);
        Auditoria::create(['tenant_id' => $tenant->id, 'tabla_afectada' => 'departamentos', 'registro_id' => 602, 'accion' => 'update', 'usuario_id' => $usuario->id]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/v1/auditoria/global?tabla=departamentos');

        $respuesta->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.tabla_afectada', 'departamentos');
    }

    public function test_global_filtra_por_usuario(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['auditoria.ver']);
        $otro = Usuario::create(['tenant_id' => $tenant->id, 'nombre' => 'Carlos', 'correo' => 'carlos@test.com', 'password' => 'password-valida-123']);

        Auditoria::create(['tenant_id' => $tenant->id, 'tabla_afectada' => 'productos', 'registro_id' => 701, 'accion' => 'create', 'usuario_id' => $usuario->id]);
        Auditoria::create(['tenant_id' => $tenant->id, 'tabla_afectada' => 'productos', 'registro_id' => 702, 'accion' => 'create', 'usuario_id' => $otro->id]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson("/api/v1/auditoria/global?tabla=productos&usuario_id={$otro->id}");

        $respuesta->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.usuario_nombre', 'Carlos');
    }

    public function test_global_filtra_por_rango_de_fechas(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['auditoria.ver']);

        $entradaVieja = Auditoria::create(['tenant_id' => $tenant->id, 'tabla_afectada' => 'productos', 'registro_id' => 801, 'accion' => 'create', 'usuario_id' => $usuario->id]);
        $entradaVieja->forceFill(['created_at' => now()->subDays(10)])->save();

        Auditoria::create(['tenant_id' => $tenant->id, 'tabla_afectada' => 'productos', 'registro_id' => 802, 'accion' => 'create', 'usuario_id' => $usuario->id]);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/v1/auditoria/global?tabla=productos&fecha_desde='.today()->subDay()->toDateString());

        $respuesta->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.registro_id', 802);
    }

    public function test_global_nunca_expone_entradas_de_otro_tenant(): void
    {
        ['tenant' => $tenantA, 'usuario' => $usuarioA] = $this->crearUsuarioConPermisos(['auditoria.ver']);
        $tenantB = Tenant::create(['nombre' => 'Otro tenant', 'pais' => 'MX', 'activo' => true]);

        Auditoria::create(['tenant_id' => $tenantA->id, 'tabla_afectada' => 'productos', 'registro_id' => 901, 'accion' => 'create', 'usuario_id' => $usuarioA->id]);
        Auditoria::create(['tenant_id' => $tenantB->id, 'tabla_afectada' => 'productos', 'registro_id' => 902, 'accion' => 'create', 'usuario_id' => $usuarioA->id]);

        $this->actingAs($usuarioA);

        $this->getJson('/api/v1/auditoria/global?tabla=productos')->assertOk()->assertJsonCount(1, 'data');
    }
}
