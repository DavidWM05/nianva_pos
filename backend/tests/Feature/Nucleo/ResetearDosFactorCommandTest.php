<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Auditoria\Models\Auditoria;
use App\Modules\Nucleo\Models\DispositivoConfiable;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TwoFactorService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ResetearDosFactorCommandTest extends TestCase
{
    use RefreshDatabase;

    /**
     * @return array{tenant: Tenant, usuario: Usuario, secreto: string}
     */
    private function crearAdmin(string $correo = 'admin@reseteo.test'): array
    {
        $tenant = Tenant::create(['nombre' => 'Tenant Reseteo', 'pais' => 'MX', 'activo' => true]);
        $sucursal = Sucursal::create(['tenant_id' => $tenant->id, 'nombre' => 'Centro']);
        $usuario = Usuario::create([
            'tenant_id' => $tenant->id,
            'sucursal_id' => $sucursal->id,
            'nombre' => 'Admin',
            'apellido' => 'Reseteo',
            'correo' => $correo,
            'password' => 'password-valida-123',
        ]);

        $rolAdmin = Rol::create(['tenant_id' => null, 'nombre' => 'admin', 'es_sistema' => true]);
        $usuario->roles()->attach($rolAdmin->id);

        $secreto = app(TwoFactorService::class)->generateSecretKey();
        $usuario->forceFill([
            'two_factor_secret' => $secreto,
            'two_factor_recovery_codes' => ['CODIGO-UNO', 'CODIGO-DOS'],
            'two_factor_confirmed_at' => now(),
        ])->save();

        DispositivoConfiable::create([
            'usuario_id' => $usuario->id,
            'identificador_dispositivo' => hash('sha256', 'token-'.$correo),
            'fecha_creacion' => now(),
            'fecha_expiracion' => now()->addDays(30),
        ]);

        return compact('tenant', 'usuario', 'secreto');
    }

    public function test_resetea_el_2fa_y_los_dispositivos_con_force(): void
    {
        ['usuario' => $usuario] = $this->crearAdmin();

        $this->artisan('usuarios:resetear-2fa', [
            'correo' => $usuario->correo,
            '--force' => true,
        ])->assertExitCode(0);

        $usuario->refresh();

        $this->assertNull($usuario->two_factor_secret);
        $this->assertNull($usuario->two_factor_recovery_codes);
        $this->assertNull($usuario->two_factor_confirmed_at);
        $this->assertSame(0, DispositivoConfiable::where('usuario_id', $usuario->id)->count());

        $auditoria = Auditoria::sinTenant()
            ->where('tabla_afectada', 'usuarios')
            ->where('registro_id', $usuario->id)
            ->where('accion', 'update')
            ->first();

        $this->assertNotNull($auditoria);
        $this->assertNull($auditoria->usuario_id);
    }

    public function test_sin_force_y_confirmacion_negativa_no_cambia_nada(): void
    {
        ['usuario' => $usuario] = $this->crearAdmin();

        $this->artisan('usuarios:resetear-2fa', ['correo' => $usuario->correo])
            ->expectsConfirmation('¿Resetear la autenticacion en dos pasos de este usuario?', 'no')
            ->assertExitCode(0);

        $usuario->refresh();

        $this->assertNotNull($usuario->two_factor_secret);
        $this->assertNotNull($usuario->two_factor_recovery_codes);
        $this->assertNotNull($usuario->two_factor_confirmed_at);
        $this->assertSame(1, DispositivoConfiable::where('usuario_id', $usuario->id)->count());
    }

    public function test_correo_inexistente_devuelve_salida_1(): void
    {
        $this->artisan('usuarios:resetear-2fa', ['correo' => 'nadie@test.com', '--force' => true])
            ->expectsOutputToContain('No existe un usuario con el correo nadie@test.com.')
            ->assertExitCode(1);
    }

    public function test_no_toca_a_otros_usuarios(): void
    {
        ['usuario' => $usuario] = $this->crearAdmin('admin@reseteo.test');
        ['usuario' => $otro] = $this->crearAdmin('otro@reseteo.test');

        $this->artisan('usuarios:resetear-2fa', [
            'correo' => $usuario->correo,
            '--force' => true,
        ])->assertExitCode(0);

        $otro->refresh();

        $this->assertNotNull($otro->two_factor_secret);
        $this->assertNotNull($otro->two_factor_recovery_codes);
        $this->assertNotNull($otro->two_factor_confirmed_at);
        $this->assertSame(1, DispositivoConfiable::where('usuario_id', $otro->id)->count());
    }

    public function test_despues_del_reseteo_el_admin_recibe_423_en_una_ruta_protegida(): void
    {
        ['usuario' => $usuario] = $this->crearAdmin();

        Route::middleware(['web', 'auth', 'two-factor.confirmed'])
            ->get('/test-protegida-reseteo', fn () => response()->json(['ok' => true]));

        $this->artisan('usuarios:resetear-2fa', [
            'correo' => $usuario->correo,
            '--force' => true,
        ])->assertExitCode(0);

        $usuario->refresh();
        $this->actingAs($usuario);

        $this->getJson('/test-protegida-reseteo')
            ->assertStatus(423)
            ->assertJsonPath('error_code', 'dos_pasos_requeridos');
    }
}
