<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RolControllerTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  list<string>  $permisos
     * @return array{tenant: Tenant, usuario: Usuario}
     */
    private function crearUsuarioConPermisos(array $permisos, bool $superadmin = false): array
    {
        $tenant = Tenant::create(['nombre' => 'Nianva POS Ropa', 'pais' => 'MX', 'activo' => true]);
        $sucursal = Sucursal::create(['tenant_id' => $tenant->id, 'nombre' => 'Centro']);
        $usuario = Usuario::create([
            'tenant_id' => $superadmin ? null : $tenant->id,
            'sucursal_id' => $superadmin ? null : $sucursal->id,
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

    public function test_index_exige_el_permiso_roles_ver(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $this->actingAs($usuario);

        $this->getJson('/api/roles')->assertForbidden();
    }

    public function test_crear_rol_con_permisos(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['roles.crear']);
        $permiso = Permiso::firstOrCreate(['nombre' => 'clientes.ver'], ['modulo' => 'clientes', 'accion' => 'ver']);

        $this->actingAs($usuario);

        $respuesta = $this->postJson('/api/roles', [
            'nombre' => 'Cajero', 'descripcion' => 'Solo caja y ventas', 'permisos' => [$permiso->id],
        ]);

        $respuesta->assertCreated()
            ->assertJsonPath('data.nombre', 'Cajero')
            ->assertJsonPath('data.es_sistema', false)
            ->assertJsonPath('data.permisos.0', $permiso->id);
    }

    public function test_crear_rol_ignora_ids_de_permisos_que_no_existen(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['roles.crear']);
        $this->actingAs($usuario);

        $this->postJson('/api/roles', ['nombre' => 'Cajero', 'permisos' => [999999]])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('permisos.0');
    }

    public function test_editar_un_rol_de_sistema_esta_prohibido_para_un_usuario_normal(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['roles.editar']);
        $rolSistema = Rol::create(['tenant_id' => null, 'nombre' => 'admin', 'es_sistema' => true]);

        $this->actingAs($usuario);

        $this->putJson("/api/roles/{$rolSistema->id}", ['nombre' => 'admin modificado'])->assertForbidden();
    }

    public function test_editar_un_rol_de_sistema_funciona_para_un_superadmin(): void
    {
        ['usuario' => $superadmin] = $this->crearUsuarioConPermisos(['roles.editar'], superadmin: true);
        $rolSistema = Rol::create(['tenant_id' => null, 'nombre' => 'admin', 'es_sistema' => true]);

        // Un superadmin requiere 2FA confirmado (ver Usuario::requiereDosFactor())
        // -- sin esto, EnsureTwoFactorIsConfigured bloquea con 423 antes de
        // llegar al controlador.
        $superadmin->forceFill(['two_factor_confirmed_at' => now()])->save();

        $this->actingAs($superadmin);

        $this->putJson("/api/roles/{$rolSistema->id}", ['nombre' => 'admin'])->assertOk();
    }

    public function test_eliminar_un_rol_con_usuarios_asignados_esta_prohibido(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['roles.eliminar']);
        $rol = Rol::create(['tenant_id' => $tenant->id, 'nombre' => 'Cajero', 'es_sistema' => false]);
        $rol->usuarios()->attach($usuario->id);

        $this->actingAs($usuario);

        $this->deleteJson("/api/roles/{$rol->id}")->assertStatus(422);
        $this->assertDatabaseHas('roles', ['id' => $rol->id]);
    }

    public function test_eliminar_un_rol_sin_usuarios_asignados_lo_borra_fisicamente(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['roles.eliminar']);
        $rol = Rol::create(['tenant_id' => $tenant->id, 'nombre' => 'Cajero', 'es_sistema' => false]);

        $this->actingAs($usuario);

        $this->deleteJson("/api/roles/{$rol->id}")->assertOk();
        $this->assertDatabaseMissing('roles', ['id' => $rol->id]);
    }

    public function test_eliminar_un_rol_de_sistema_esta_prohibido_para_un_usuario_normal(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['roles.eliminar']);
        $rolSistema = Rol::create(['tenant_id' => null, 'nombre' => 'vendedor', 'es_sistema' => true]);

        $this->actingAs($usuario);

        $this->deleteJson("/api/roles/{$rolSistema->id}")->assertForbidden();
        $this->assertDatabaseHas('roles', ['id' => $rolSistema->id]);
    }
}
