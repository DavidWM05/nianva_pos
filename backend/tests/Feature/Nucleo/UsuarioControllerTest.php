<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Nucleo\Services\TwoFactorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UsuarioControllerTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @param  list<string>  $permisos
     * @return array{tenant: Tenant, sucursal: Sucursal, usuario: Usuario}
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

        $usuario->refresh();

        return compact('tenant', 'sucursal', 'usuario');
    }

    public function test_index_exige_el_permiso_usuarios_ver(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $this->actingAs($usuario);

        $this->getJson('/api/usuarios')->assertForbidden();
    }

    public function test_index_pagina_filtra_y_reporta_permisos(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['usuarios.ver', 'usuarios.crear']);
        Usuario::create(['tenant_id' => $tenant->id, 'nombre' => 'Carlos', 'correo' => 'carlos@test.com', 'password' => 'password-valida-123']);

        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/usuarios?filtro_nombre=carlos');

        $respuesta->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.nombre', 'Carlos')
            ->assertJsonPath('meta.permisos.crear', true)
            ->assertJsonPath('meta.permisos.editar', false);
    }

    public function test_index_nunca_expone_password_ni_secretos_2fa(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['usuarios.ver']);
        $this->actingAs($usuario);

        $respuesta = $this->getJson('/api/usuarios');

        $respuesta->assertOk();
        $respuesta->assertJsonMissingPath('data.0.password');
        $respuesta->assertJsonMissingPath('data.0.two_factor_secret');
    }

    public function test_crear_usuario_con_roles(): void
    {
        ['tenant' => $tenant, 'sucursal' => $sucursal, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['usuarios.crear']);
        $rol = Rol::create(['tenant_id' => $tenant->id, 'nombre' => 'Vendedor de prueba', 'es_sistema' => false]);

        $this->actingAs($usuario);

        $respuesta = $this->postJson('/api/usuarios', [
            'nombre' => 'Carlos', 'apellido' => 'Ruiz', 'correo' => 'carlos.ruiz@test.com',
            'password' => 'password-valida-123', 'sucursal_id' => $sucursal->id, 'roles' => [$rol->id],
        ]);

        $respuesta->assertCreated()
            ->assertJsonPath('data.nombre', 'Carlos')
            ->assertJsonPath('data.sucursal.nombre', 'Centro')
            ->assertJsonPath('data.roles.0.nombre', 'Vendedor de prueba');
        $this->assertDatabaseHas('usuarios', ['correo' => 'carlos.ruiz@test.com', 'tenant_id' => $tenant->id]);
    }

    public function test_crear_usuario_exige_password_minimo_8_caracteres(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['usuarios.crear']);
        $this->actingAs($usuario);

        $this->postJson('/api/usuarios', ['nombre' => 'Carlos', 'correo' => 'carlos2@test.com', 'password' => 'corta'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');
    }

    public function test_el_correo_es_unico_globalmente_no_solo_por_tenant(): void
    {
        ['tenant' => $tenantA, 'usuario' => $usuarioA] = $this->crearUsuarioConPermisos(['usuarios.crear']);
        Usuario::create(['tenant_id' => $tenantA->id, 'nombre' => 'Existente', 'correo' => 'repetido@test.com', 'password' => 'password-valida-123']);

        $this->actingAs($usuarioA);

        $this->postJson('/api/usuarios', ['nombre' => 'Otro', 'correo' => 'repetido@test.com', 'password' => 'password-valida-123'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('correo');
    }

    public function test_editar_usuario_sin_password_no_cambia_la_contrasena_actual(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['usuarios.editar']);
        $objetivo = Usuario::create(['tenant_id' => $tenant->id, 'nombre' => 'Carlos', 'correo' => 'carlos3@test.com', 'password' => 'password-original-123']);
        $hashOriginal = $objetivo->password;

        $this->actingAs($usuario);

        $this->putJson("/api/usuarios/{$objetivo->id}", ['nombre' => 'Carlos Ruiz', 'correo' => 'carlos3@test.com'])
            ->assertOk()
            ->assertJsonPath('data.nombre', 'Carlos Ruiz');

        $this->assertSame($hashOriginal, $objetivo->fresh()->password);
    }

    public function test_desactivar_un_usuario_distinto_funciona(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['usuarios.eliminar']);
        $objetivo = Usuario::create(['tenant_id' => $tenant->id, 'nombre' => 'Carlos', 'correo' => 'carlos4@test.com', 'password' => 'password-valida-123']);

        $this->actingAs($usuario);

        $this->patchJson("/api/usuarios/{$objetivo->id}/desactivar")
            ->assertOk()
            ->assertJsonPath('data.activo', false);
    }

    public function test_un_usuario_no_puede_desactivarse_a_si_mismo(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioConPermisos(['usuarios.eliminar']);
        $this->actingAs($usuario);

        $this->patchJson("/api/usuarios/{$usuario->id}/desactivar")->assertForbidden();
    }

    /**
     * Desactivar el 2FA de otro usuario ya no es autoservicio (ver el
     * reporte): vive aqui, gateado por usuarios.editar. Estos tres casos no
     * necesitan un TOTP propio porque el admin de prueba no tiene 2FA
     * activado -- dos-factor.reciente solo lo exige si quien ejecuta la
     * accion SI lo tiene (ver TrustedDeviceTest para el caso con TOTP).
     */
    public function test_desactivar_2fa_de_otro_usuario_exige_el_permiso_usuarios_editar(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos([]);
        $objetivo = Usuario::create(['tenant_id' => $tenant->id, 'nombre' => 'Carlos', 'correo' => 'carlos5@test.com', 'password' => 'password-valida-123']);
        $this->actingAs($usuario);

        $this->postJson("/api/usuarios/{$objetivo->id}/desactivar-2fa", [])->assertForbidden();
    }

    public function test_desactivar_2fa_de_un_usuario_sin_2fa_activo_falla(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['usuarios.editar']);
        $objetivo = Usuario::create(['tenant_id' => $tenant->id, 'nombre' => 'Carlos', 'correo' => 'carlos6@test.com', 'password' => 'password-valida-123']);
        $this->actingAs($usuario);

        $this->postJson("/api/usuarios/{$objetivo->id}/desactivar-2fa", [])->assertStatus(409);
    }

    public function test_desactivar_2fa_de_otro_usuario_funciona(): void
    {
        ['tenant' => $tenant, 'usuario' => $usuario] = $this->crearUsuarioConPermisos(['usuarios.editar']);
        $objetivo = Usuario::create(['tenant_id' => $tenant->id, 'nombre' => 'Carlos', 'correo' => 'carlos7@test.com', 'password' => 'password-valida-123']);
        $objetivo->forceFill([
            'two_factor_secret' => app(TwoFactorService::class)->generateSecretKey(),
            'two_factor_confirmed_at' => now(),
        ])->save();
        $this->actingAs($usuario);

        $this->postJson("/api/usuarios/{$objetivo->id}/desactivar-2fa", [])
            ->assertOk()
            ->assertJsonPath('data.dos_factor_confirmado', false);

        $this->assertNull($objetivo->fresh()->two_factor_confirmed_at);
    }
}
