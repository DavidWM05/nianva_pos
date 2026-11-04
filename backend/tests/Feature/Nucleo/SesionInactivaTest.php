<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Database\Seeders\NucleoRolesPermisosSeeder;
use App\Modules\Nucleo\Models\ConfiguracionSeguridad;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class SesionInactivaTest extends TestCase
{
    use RefreshDatabase;

    private const CLAVE_ULTIMA_ACTIVIDAD = 'auth.ultima_actividad';

    private const PASSWORD = 'password-valida-123';

    private function crearUsuarioConTenant(int $minutosInactividad = 30): Usuario
    {
        $tenant = Tenant::factory()->create();

        ConfiguracionSeguridad::where('tenant_id', $tenant->id)
            ->update(['minutos_inactividad' => $minutosInactividad]);

        return Usuario::factory()->create([
            'tenant_id' => $tenant->id,
            'correo' => 'ana@test.com',
            'password' => self::PASSWORD,
        ])->fresh();
    }

    private function iniciarSesion(Usuario $usuario, int $edadMinutos = 0): void
    {
        config(['sanctum.stateful' => ['localhost:4200']]);

        $this->actingAs($usuario)
            ->withHeader('Referer', 'http://localhost:4200/')
            ->withSession([
                self::CLAVE_ULTIMA_ACTIVIDAD => now()->subMinutes($edadMinutos)->timestamp,
            ]);
    }

    private function crearAdmin(): Usuario
    {
        $this->seed(NucleoRolesPermisosSeeder::class);

        $admin = Usuario::factory()->admin()->create();
        $admin->forceFill(['two_factor_confirmed_at' => now()])->save();

        return $admin->fresh();
    }

    public function test_una_peticion_a_los_29_minutos_pasa(): void
    {
        $usuario = $this->crearUsuarioConTenant(30);
        $this->iniciarSesion($usuario);

        $this->travel(29)->minutes();

        $this->getJson('/api/v1/sesion')->assertOk();
    }

    public function test_una_peticion_a_los_31_minutos_expira_y_cierra_la_sesion(): void
    {
        $usuario = $this->crearUsuarioConTenant(30);
        $this->iniciarSesion($usuario);

        $this->travel(31)->minutes();

        $this->getJson('/api/v1/sesion')
            ->assertUnauthorized()
            ->assertJsonPath('error_code', 'sesion_inactiva');

        $this->getJson('/api/v1/sesion')->assertUnauthorized();
    }

    public function test_cada_peticion_renueva_el_plazo(): void
    {
        $usuario = $this->crearUsuarioConTenant(30);
        $this->iniciarSesion($usuario);

        $this->travel(20)->minutes();
        $this->getJson('/api/v1/sesion')->assertOk();

        $this->travel(20)->minutes();
        $this->getJson('/api/v1/sesion')->assertOk();

        $this->travel(20)->minutes();
        $this->getJson('/api/v1/sesion')->assertOk();
    }

    /**
     * @return array<string, array{int, int, int}>
     */
    public static function limitesDelTenant(): array
    {
        return [
            '5 minutos expira a los 6' => [5, 6, 401],
            '120 minutos sigue viva a los 60' => [120, 60, 200],
        ];
    }

    #[DataProvider('limitesDelTenant')]
    public function test_el_limite_sale_de_la_configuracion_del_tenant(int $minutos, int $transcurridos, int $esperado): void
    {
        $usuario = $this->crearUsuarioConTenant($minutos);
        $this->iniciarSesion($usuario);

        $this->travel($transcurridos)->minutes();

        $this->getJson('/api/v1/sesion')->assertStatus($esperado);
    }

    public function test_el_superadmin_usa_30_minutos(): void
    {
        $superadmin = Usuario::factory()->superadmin()->create([
            'correo' => 'super@test.com',
            'password' => self::PASSWORD,
        ])->fresh();
        $this->iniciarSesion($superadmin);

        $this->travel(31)->minutes();

        $this->getJson('/api/v1/sesion')
            ->assertUnauthorized()
            ->assertJsonPath('error_code', 'sesion_inactiva');
    }

    public function test_un_login_nuevo_arranca_el_plazo_de_cero(): void
    {
        $usuario = $this->crearUsuarioConTenant(30);
        $this->withSession([
            self::CLAVE_ULTIMA_ACTIVIDAD => now()->subMinutes(100)->timestamp,
        ]);

        $this->postJson('/login', ['correo' => $usuario->correo, 'password' => self::PASSWORD])
            ->assertOk();

        $ultimaActividad = $this->app['session']->get(self::CLAVE_ULTIMA_ACTIVIDAD);

        $this->assertIsInt($ultimaActividad);
        $this->assertGreaterThanOrEqual(now()->timestamp, $ultimaActividad);
    }

    public function test_acepta_los_limites_5_y_480_y_guarda_el_valor(): void
    {
        $admin = $this->crearAdmin();
        $this->actingAs($admin);

        $this->putJson('/api/v1/configuracion-seguridad', [
            'dias_dispositivo_normal' => 30,
            'dias_dispositivo_admin' => 30,
            'minutos_inactividad' => 5,
        ])->assertOk()->assertJsonPath('minutos_inactividad', 5);

        $this->putJson('/api/v1/configuracion-seguridad', [
            'dias_dispositivo_normal' => 30,
            'dias_dispositivo_admin' => 30,
            'minutos_inactividad' => 480,
        ])->assertOk()->assertJsonPath('minutos_inactividad', 480);

        $this->assertSame(480, ConfiguracionSeguridad::where('tenant_id', $admin->tenant_id)->value('minutos_inactividad'));
    }

    /**
     * @return array<string, array{mixed}>
     */
    public static function valoresInvalidos(): array
    {
        return [
            'menor que 5' => [4],
            'mayor que 480' => [481],
            'texto' => ['treinta'],
        ];
    }

    #[DataProvider('valoresInvalidos')]
    public function test_rechaza_minutos_inactividad_invalidos(mixed $valor): void
    {
        $admin = $this->crearAdmin();
        $this->actingAs($admin);

        $this->putJson('/api/v1/configuracion-seguridad', [
            'dias_dispositivo_normal' => 30,
            'dias_dispositivo_admin' => 30,
            'minutos_inactividad' => $valor,
        ])->assertUnprocessable()->assertJsonValidationErrors('minutos_inactividad');
    }

    public function test_el_resource_devuelve_minutos_inactividad(): void
    {
        $admin = $this->crearAdmin();
        ConfiguracionSeguridad::where('tenant_id', $admin->tenant_id)
            ->update(['minutos_inactividad' => 45]);

        $this->actingAs($admin)
            ->getJson('/api/v1/configuracion-seguridad')
            ->assertOk()
            ->assertJsonPath('minutos_inactividad', 45);
    }
}
