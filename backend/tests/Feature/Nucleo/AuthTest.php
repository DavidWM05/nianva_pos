<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TwoFactorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Route;
use PragmaRX\Google2FA\Google2FA;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'password-valida-123';

    /**
     * @return array{tenant: Tenant, sucursal: Sucursal, usuario: Usuario}
     */
    private function crearUsuario(bool $tenantActivo = true, bool $esAdmin = false): array
    {
        $tenant = Tenant::create(['nombre' => 'Nianva POS Ropa', 'pais' => 'MX', 'activo' => $tenantActivo]);
        $sucursal = Sucursal::create(['tenant_id' => $tenant->id, 'nombre' => 'Centro']);

        $usuario = Usuario::create([
            'tenant_id' => $tenant->id,
            'sucursal_id' => $sucursal->id,
            'nombre' => 'Ana',
            'correo' => 'ana@test.com',
            'password' => self::PASSWORD,
        ]);

        if ($esAdmin) {
            $rolAdmin = Rol::create(['tenant_id' => null, 'nombre' => 'admin', 'es_sistema' => true]);
            $usuario->roles()->attach($rolAdmin->id);
        }

        $usuario->refresh();

        return compact('tenant', 'sucursal', 'usuario');
    }

    public function test_login_valido_establece_sesion(): void
    {
        $this->crearUsuario();

        $response = $this->postJson('/login', ['correo' => 'ana@test.com', 'password' => self::PASSWORD]);

        $response->assertOk()->assertJson(['two_factor_required' => false]);
        $this->assertAuthenticated();
    }

    public function test_login_con_credenciales_invalidas_es_rechazado(): void
    {
        $this->crearUsuario();

        $response = $this->postJson('/login', ['correo' => 'ana@test.com', 'password' => 'incorrecta']);

        $response->assertUnprocessable()->assertJsonValidationErrors('correo');
        $this->assertGuest();
    }

    public function test_login_con_2fa_pendiente_no_autentica_hasta_completar_el_segundo_factor(): void
    {
        ['usuario' => $usuario] = $this->crearUsuario();
        $twoFactorService = app(TwoFactorService::class);
        $secret = $twoFactorService->generateSecretKey();
        $usuario->forceFill([
            'two_factor_secret' => $secret,
            'two_factor_confirmed_at' => now(),
        ])->save();

        $loginResponse = $this->postJson('/login', ['correo' => 'ana@test.com', 'password' => self::PASSWORD]);

        $loginResponse->assertOk()->assertJson(['two_factor_required' => true]);
        // Paso 1 (correo+password) correcto, pero la sesion NO debe quedar
        // autenticada todavia -- ese es exactamente el requisito.
        $this->assertGuest();

        $codigoInvalido = $this->postJson('/login/2fa-verify', ['code' => '000000']);
        $codigoInvalido->assertUnprocessable();
        $this->assertGuest();

        $verifyResponse = $this->postJson('/login/2fa-verify', ['code' => $this->generarCodigoValido($secret)]);
        $verifyResponse->assertOk();
        $this->assertAuthenticated();
    }

    public function test_rate_limiting_bloquea_tras_5_intentos_fallidos(): void
    {
        $this->crearUsuario();

        for ($intento = 1; $intento <= 5; $intento++) {
            $this->postJson('/login', ['correo' => 'ana@test.com', 'password' => 'incorrecta'])
                ->assertUnprocessable();
        }

        $this->postJson('/login', ['correo' => 'ana@test.com', 'password' => 'incorrecta'])
            ->assertStatus(429);

        // Incluso con la password CORRECTA, el sexto intento sigue bloqueado
        // por el throttle -- confirma que limita por intentos, no por
        // "intentos fallidos" contados de otra forma.
        $this->postJson('/login', ['correo' => 'ana@test.com', 'password' => self::PASSWORD])
            ->assertStatus(429);
        $this->assertGuest();
    }

    public function test_admin_sin_2fa_configurado_no_puede_acceder_a_rutas_protegidas(): void
    {
        ['usuario' => $usuario] = $this->crearUsuario(esAdmin: true);
        $this->registrarRutaProtegidaDePrueba();

        $this->actingAs($usuario);

        $this->getJson('/test-protegida')->assertStatus(423);

        // Pero SI puede llegar al endpoint de configuracion (el escape hatch).
        $this->getJson('/api/v1/two-factor/qr-code')->assertOk()->assertJsonStructure(['secret', 'otpauth_url']);

        $twoFactorService = app(TwoFactorService::class);
        $secret = $usuario->fresh()->two_factor_secret;
        $this->postJson('/api/v1/two-factor/confirm', ['code' => $this->generarCodigoValido($secret)])
            ->assertOk()
            ->assertJsonStructure(['recovery_codes']);

        // Configurado: ahora si puede.
        $this->getJson('/test-protegida')->assertOk();
    }

    public function test_recuperacion_de_password_de_punta_a_punta(): void
    {
        ['usuario' => $usuario] = $this->crearUsuario();

        $solicitud = $this->postJson('/password/forgot', ['correo' => 'ana@test.com']);
        $solicitud->assertOk();

        $token = Password::broker()->createToken($usuario);

        $resetInvalido = $this->postJson('/password/reset', [
            'correo' => 'ana@test.com',
            'token' => 'token-invalido',
            'password' => 'nueva-password-456',
            'password_confirmation' => 'nueva-password-456',
        ]);
        $resetInvalido->assertUnprocessable();

        $resetValido = $this->postJson('/password/reset', [
            'correo' => 'ana@test.com',
            'token' => $token,
            'password' => 'nueva-password-456',
            'password_confirmation' => 'nueva-password-456',
        ]);
        $resetValido->assertOk();

        // El login con la password VIEJA ya no funciona...
        $this->postJson('/login', ['correo' => 'ana@test.com', 'password' => self::PASSWORD])
            ->assertUnprocessable();
        // ... y con la nueva si.
        $this->postJson('/login', ['correo' => 'ana@test.com', 'password' => 'nueva-password-456'])
            ->assertOk();

        // El mismo token ya usado no se puede reutilizar.
        $this->postJson('/password/reset', [
            'correo' => 'ana@test.com',
            'token' => $token,
            'password' => 'otra-password-789',
            'password_confirmation' => 'otra-password-789',
        ])->assertUnprocessable();
    }

    public function test_token_de_reset_expirado_es_rechazado(): void
    {
        ['usuario' => $usuario] = $this->crearUsuario();

        $token = Password::broker()->createToken($usuario);

        // config/auth.php: 'expire' => 60 (minutos).
        $this->travel(61)->minutes();

        $this->postJson('/password/reset', [
            'correo' => 'ana@test.com',
            'token' => $token,
            'password' => 'nueva-password-456',
            'password_confirmation' => 'nueva-password-456',
        ])->assertUnprocessable();
    }

    public function test_tenant_inactivo_no_puede_iniciar_sesion_aunque_la_password_sea_correcta(): void
    {
        $this->crearUsuario(tenantActivo: false);

        $response = $this->postJson('/login', ['correo' => 'ana@test.com', 'password' => self::PASSWORD]);

        $response->assertUnprocessable()->assertJsonValidationErrors('correo');
        $this->assertGuest();
    }

    /**
     * Ruta ad-hoc identica en espiritu a la de TenantScopeMiddlewareTest:
     * confirma que two-factor.confirmed protege cualquier ruta nueva que
     * lo declare, sin depender de que ya exista una pantalla de modulo real.
     */
    private function registrarRutaProtegidaDePrueba(): void
    {
        Route::middleware(['web', 'auth', 'two-factor.confirmed'])
            ->get('/test-protegida', fn () => response()->json(['ok' => true]));
    }

    private function generarCodigoValido(string $secret): string
    {
        return (new Google2FA)->getCurrentOtp($secret);
    }
}
