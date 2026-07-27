<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\ConfiguracionSeguridad;
use App\Modules\Nucleo\Models\DispositivoConfiable;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TrustedDeviceService;
use App\Modules\Nucleo\Services\TwoFactorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class TrustedDeviceTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'password-valida-123';

    /**
     * @return array{tenant: Tenant, sucursal: Sucursal, usuario: Usuario, secret: string}
     */
    private function crearUsuarioCon2fa(bool $esAdmin = false, bool $conPermisoConfiguracion = false): array
    {
        $tenant = Tenant::create(['nombre' => 'Nianva POS Ropa', 'pais' => 'MX', 'activo' => true]);
        $sucursal = Sucursal::create(['tenant_id' => $tenant->id, 'nombre' => 'Centro']);

        $secret = app(TwoFactorService::class)->generateSecretKey();

        $usuario = Usuario::create([
            'tenant_id' => $tenant->id,
            'sucursal_id' => $sucursal->id,
            'nombre' => 'Ana',
            'correo' => 'ana@test.com',
            'password' => self::PASSWORD,
        ]);
        $usuario->forceFill(['two_factor_secret' => $secret, 'two_factor_confirmed_at' => now()])->save();

        if ($esAdmin) {
            $rolAdmin = Rol::create(['tenant_id' => null, 'nombre' => 'admin', 'es_sistema' => true]);

            if ($conPermisoConfiguracion) {
                $permisoVer = Permiso::firstOrCreate(['nombre' => 'configuracion.ver'], ['modulo' => 'configuracion', 'accion' => 'ver']);
                $permisoEditar = Permiso::firstOrCreate(['nombre' => 'configuracion.editar'], ['modulo' => 'configuracion', 'accion' => 'editar']);
                $rolAdmin->permisos()->attach([$permisoVer->id, $permisoEditar->id]);
            }

            $usuario->roles()->attach($rolAdmin->id);
        }

        return compact('tenant', 'sucursal', 'usuario', 'secret');
    }

    /**
     * Login completo (correo+password, luego el segundo factor) que
     * devuelve el valor crudo de la cookie de dispositivo confiable que
     * puso el servidor -- lista para reenviarse en un request posterior via
     * withUnencryptedCookie() + withCredentials() (postJson()/getJson() no
     * mandan cookies por default; y esta cookie ya viene encriptada por el
     * servidor, no hay que re-encriptarla), igual que haria el navegador.
     */
    private function loginYConfiarDispositivo(Usuario $usuario, string $secret): string
    {
        $this->postJson('/login', ['correo' => $usuario->correo, 'password' => self::PASSWORD])
            ->assertOk()
            ->assertJson(['two_factor_required' => true]);

        $verify = $this->postJson('/login/2fa-verify', ['code' => $this->generarCodigoValido($secret)]);
        $verify->assertOk();

        $cookie = collect($verify->headers->getCookies())
            ->first(fn ($c) => $c->getName() === TrustedDeviceService::NOMBRE_COOKIE);

        $this->assertNotNull($cookie, 'Se esperaba la cookie de dispositivo confiable en la respuesta.');

        return (string) $cookie->getValue();
    }

    private function generarCodigoValido(string $secret): string
    {
        return (new Google2FA)->getCurrentOtp($secret);
    }

    public function test_login_sin_dispositivo_confiable_pide_2fa(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioCon2fa();

        $this->postJson('/login', ['correo' => $usuario->correo, 'password' => self::PASSWORD])
            ->assertOk()
            ->assertJson(['two_factor_required' => true]);
        $this->assertGuest();
    }

    public function test_login_con_dispositivo_ya_confiado_omite_2fa_pero_no_la_password(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioCon2fa();

        // Confia el dispositivo directamente (el mismo efecto que deja
        // TwoFactorController::verifyLogin() tras un 2FA exitoso) en vez de
        // encadenar un segundo login real -- Auth::login() via HTTP dos
        // veces en el mismo metodo de test choca con el cacheo de guards de
        // AuthManager entre requests de un mismo TestCase (confirmado que
        // NO ocurre en la app real: la verificacion en vivo contra
        // php artisan serve mostro logout/login repetidos funcionando
        // bien). Aqui alcanza con UN solo login real para probar el skip.
        $token = Str::random(64);
        DispositivoConfiable::create([
            'usuario_id' => $usuario->id,
            'identificador_dispositivo' => hash('sha256', $token),
            'fecha_creacion' => now(),
            'fecha_expiracion' => now()->addDays(14),
        ]);

        $this->withCredentials()->withCookie(TrustedDeviceService::NOMBRE_COOKIE, $token)
            ->postJson('/login', ['correo' => $usuario->correo, 'password' => 'incorrecta'])
            ->assertUnprocessable();
        $this->assertGuest();

        $this->withCredentials()->withCookie(TrustedDeviceService::NOMBRE_COOKIE, $token)
            ->postJson('/login', ['correo' => $usuario->correo, 'password' => self::PASSWORD])
            ->assertOk()
            ->assertJson(['two_factor_required' => false]);
        $this->assertAuthenticated();
    }

    public function test_cambiar_dias_dispositivo_fuera_de_rango_se_rechaza(): void
    {
        ['usuario' => $usuario] = $this->crearUsuarioCon2fa(esAdmin: true, conPermisoConfiguracion: true);
        $this->actingAs($usuario);

        $this->putJson('/api/configuracion-seguridad', [
            'dias_dispositivo_normal' => 30,
            'dias_dispositivo_admin' => 91,
        ])->assertUnprocessable()->assertJsonValidationErrors('dias_dispositivo_admin');

        $this->putJson('/api/configuracion-seguridad', [
            'dias_dispositivo_normal' => 0,
            'dias_dispositivo_admin' => 14,
        ])->assertUnprocessable()->assertJsonValidationErrors('dias_dispositivo_normal');

        $this->putJson('/api/configuracion-seguridad', [
            'dias_dispositivo_normal' => 45,
            'dias_dispositivo_admin' => 20,
        ])->assertOk()->assertJson(['dias_dispositivo_normal' => 45, 'dias_dispositivo_admin' => 20]);
    }

    public function test_cambiar_password_invalida_el_dispositivo_confiable(): void
    {
        ['usuario' => $usuario, 'secret' => $secret] = $this->crearUsuarioCon2fa();
        $cookie = $this->loginYConfiarDispositivo($usuario, $secret);

        $this->postJson('/api/password/change', [
            'password_actual' => self::PASSWORD,
            'password' => 'nueva-password-456',
            'password_confirmation' => 'nueva-password-456',
            'code' => $this->generarCodigoValido($secret),
        ])->assertOk();

        $this->postJson('/logout')->assertNoContent();

        // Misma cookie de antes, password nueva: el dispositivo ya no esta
        // confiado (cambiar password lo invalido), vuelve a pedir 2FA.
        $this->withCredentials()->withUnencryptedCookie(TrustedDeviceService::NOMBRE_COOKIE, $cookie)
            ->postJson('/login', ['correo' => $usuario->correo, 'password' => 'nueva-password-456'])
            ->assertOk()
            ->assertJson(['two_factor_required' => true]);
    }

    public function test_revocar_dispositivo_desde_el_perfil_fuerza_2fa_en_el_siguiente_login(): void
    {
        ['usuario' => $usuario, 'secret' => $secret] = $this->crearUsuarioCon2fa();
        $cookie = $this->loginYConfiarDispositivo($usuario, $secret);

        $lista = $this->getJson('/api/dispositivos-confiables')->assertOk()->json('data');
        $this->assertCount(1, $lista);

        $this->deleteJson("/api/dispositivos-confiables/{$lista[0]['id']}")->assertNoContent();

        $this->postJson('/logout')->assertNoContent();

        $this->withCredentials()->withUnencryptedCookie(TrustedDeviceService::NOMBRE_COOKIE, $cookie)
            ->postJson('/login', ['correo' => $usuario->correo, 'password' => self::PASSWORD])
            ->assertOk()
            ->assertJson(['two_factor_required' => true]);
    }

    /**
     * Desactivar 2FA ya no es autoservicio (ver el reporte): un admin lo
     * hace sobre OTRO usuario, via /api/usuarios/{id}/desactivar-2fa. El
     * TOTP que exige dos-factor.reciente es del ADMIN que ejecuta la
     * accion, no del usuario objetivo -- sigue sin importar si el
     * dispositivo del admin ya esta confiado.
     */
    public function test_admin_desactiva_2fa_de_otro_usuario_exige_su_propio_totp_aunque_el_dispositivo_este_confiado(): void
    {
        ['usuario' => $admin, 'secret' => $secretAdmin, 'tenant' => $tenant] = $this->crearUsuarioCon2fa(esAdmin: true);
        $rolAdmin = Rol::where('nombre', 'admin')->firstOrFail();
        $permisoEditar = Permiso::firstOrCreate(['nombre' => 'usuarios.editar'], ['modulo' => 'usuarios', 'accion' => 'editar']);
        $rolAdmin->permisos()->attach($permisoEditar->id);

        $this->loginYConfiarDispositivo($admin, $secretAdmin);

        $objetivo = Usuario::create(['tenant_id' => $tenant->id, 'nombre' => 'Carlos', 'correo' => 'carlos@test.com', 'password' => self::PASSWORD]);
        $secretObjetivo = app(TwoFactorService::class)->generateSecretKey();
        $objetivo->forceFill(['two_factor_secret' => $secretObjetivo, 'two_factor_confirmed_at' => now()])->save();

        $this->postJson("/api/usuarios/{$objetivo->id}/desactivar-2fa", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('code');

        $this->postJson("/api/usuarios/{$objetivo->id}/desactivar-2fa", ['code' => '000000'])
            ->assertUnprocessable();

        $this->postJson("/api/usuarios/{$objetivo->id}/desactivar-2fa", ['code' => $this->generarCodigoValido($secretAdmin)])
            ->assertOk();

        $this->assertNull($objetivo->fresh()->two_factor_confirmed_at);
    }

    public function test_no_se_puede_desactivar_2fa_de_un_usuario_que_lo_requiere_por_su_rol(): void
    {
        ['usuario' => $admin, 'secret' => $secretAdmin, 'tenant' => $tenant] = $this->crearUsuarioCon2fa(esAdmin: true);
        $rolAdmin = Rol::where('nombre', 'admin')->firstOrFail();
        $permisoEditar = Permiso::firstOrCreate(['nombre' => 'usuarios.editar'], ['modulo' => 'usuarios', 'accion' => 'editar']);
        $rolAdmin->permisos()->attach($permisoEditar->id);
        $this->actingAs($admin);

        // El objetivo tambien tiene el rol admin -> requiereDosFactor() true.
        $objetivo = Usuario::create(['tenant_id' => $tenant->id, 'nombre' => 'Beto', 'correo' => 'beto@test.com', 'password' => self::PASSWORD]);
        $secretObjetivo = app(TwoFactorService::class)->generateSecretKey();
        $objetivo->forceFill(['two_factor_secret' => $secretObjetivo, 'two_factor_confirmed_at' => now()])->save();
        $objetivo->roles()->attach($rolAdmin->id);

        $this->postJson("/api/usuarios/{$objetivo->id}/desactivar-2fa", ['code' => $this->generarCodigoValido($secretAdmin)])
            ->assertForbidden();

        $this->assertNotNull($objetivo->fresh()->two_factor_confirmed_at);
    }

    public function test_cambio_de_configuracion_no_es_retroactivo_para_dispositivos_ya_confiados(): void
    {
        ['usuario' => $usuario, 'secret' => $secret, 'tenant' => $tenant] = $this->crearUsuarioCon2fa(esAdmin: true);
        $this->loginYConfiarDispositivo($usuario, $secret);

        $dispositivo = DispositivoConfiable::where('usuario_id', $usuario->id)->firstOrFail();
        $expiracionOriginal = $dispositivo->fecha_expiracion->toDateTimeString();

        // dias_dispositivo_admin por default es 14 (ver TenantObserver) --
        // confirma que el dispositivo ya confiado uso ese valor.
        $this->assertSame(now()->addDays(14)->toDateString(), $dispositivo->fecha_expiracion->toDateString());

        ConfiguracionSeguridad::where('tenant_id', $tenant->id)->first()->update(['dias_dispositivo_admin' => 60]);

        $this->assertSame(
            $expiracionOriginal,
            $dispositivo->fresh()->fecha_expiracion->toDateTimeString(),
            'El dispositivo ya confiado no debe cambiar su expiracion cuando se edita la configuracion despues.',
        );
    }
}
