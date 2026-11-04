<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Database\Seeders\NucleoRolesPermisosSeeder;
use App\Modules\Nucleo\Http\Middleware\ModuloActivo;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * GET /api/v1/sesion (API-09): lo que el frontend necesita para armar el menu, los guards
 * y los formatos, en una sola respuesta.
 */
class SesionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(NucleoRolesPermisosSeeder::class);
    }

    public function test_requiere_sesion_iniciada(): void
    {
        $this->getJson('/api/v1/sesion')->assertUnauthorized();
    }

    public function test_devuelve_el_usuario_su_sucursal_y_exactamente_sus_permisos(): void
    {
        $vendedor = Usuario::factory()->vendedor()->create()->fresh();
        $esperados = $vendedor->roles()->with('permisos')->get()
            ->flatMap(fn ($rol) => $rol->permisos->pluck('nombre'))
            ->unique()->sort()->values()->all();

        $respuesta = $this->actingAs($vendedor)->getJson('/api/v1/sesion')->assertOk();

        $respuesta->assertJsonPath('data.usuario.correo', $vendedor->correo)
            ->assertJsonPath('data.sucursal.id', $vendedor->sucursal_id)
            ->assertJsonPath('data.sucursal.nombre', $vendedor->sucursal->nombre)
            ->assertJsonPath('data.terminal', null)
            ->assertJsonPath('data.perfil_giro', null)
            ->assertJsonPath('data.permisos', $esperados);
        $this->assertContains('ventas.crear', $esperados);
        $this->assertNotContains('usuarios.ver', $esperados);
    }

    public function test_el_admin_recibe_todos_los_permisos(): void
    {
        $admin = Usuario::factory()->admin()->create(['two_factor_confirmed_at' => now()]);

        $this->actingAs($admin)->getJson('/api/v1/sesion')
            ->assertOk()
            ->assertJsonPath('data.permisos', Permiso::orderBy('nombre')->pluck('nombre')->all());
    }

    public function test_el_superadmin_recibe_todos_los_permisos_y_modulos_sin_sucursal(): void
    {
        $superadmin = Usuario::factory()->superadmin()->create(['two_factor_confirmed_at' => now()]);

        $this->actingAs($superadmin)->getJson('/api/v1/sesion')
            ->assertOk()
            ->assertJsonPath('data.permisos', Permiso::orderBy('nombre')->pluck('nombre')->all())
            ->assertJsonPath('data.modulos_activos', ModuloActivo::MODULOS_DEFAULT)
            ->assertJsonPath('data.sucursal', null);
    }

    /**
     * Contrato por "plan": hoy lo que enciende o apaga modulos es
     * configuracion_tenant.modulos_activos (el mismo dato que usa el middleware modulo:).
     *
     * @return array<string, array{?list<string>, list<string>}>
     */
    public static function modulos(): array
    {
        return [
            'sin configurar: todos los modulos' => [null, ModuloActivo::MODULOS_DEFAULT],
            'solo cuentas por cobrar' => [['cxc'], ['cxc']],
            'ninguno' => [[], []],
        ];
    }

    /**
     * @param  ?list<string>  $configurados
     * @param  list<string>  $esperados
     */
    #[DataProvider('modulos')]
    public function test_los_modulos_activos_salen_de_la_configuracion_del_tenant(?array $configurados, array $esperados): void
    {
        $vendedor = Usuario::factory()->vendedor()->create()->fresh();
        ConfiguracionTenant::factory()->create(['tenant_id' => $vendedor->tenant_id, 'modulos_activos' => $configurados]);

        $this->actingAs($vendedor)->getJson('/api/v1/sesion')
            ->assertOk()
            ->assertJsonPath('data.modulos_activos', $esperados);
    }

    public function test_un_tenant_sin_configuracion_tiene_todos_los_modulos(): void
    {
        $vendedor = Usuario::factory()->vendedor()->create()->fresh();

        $this->actingAs($vendedor)->getJson('/api/v1/sesion')
            ->assertOk()
            ->assertJsonPath('data.modulos_activos', ModuloActivo::MODULOS_DEFAULT);
    }

    public function test_la_configuracion_regional_sale_del_tenant(): void
    {
        $vendedor = Usuario::factory()->vendedor()->create()->fresh();
        ConfiguracionTenant::factory()->create([
            'tenant_id' => $vendedor->tenant_id,
            'moneda' => 'USD',
            'zona_horaria' => 'America/Tijuana',
        ]);

        $this->actingAs($vendedor)->getJson('/api/v1/sesion')
            ->assertOk()
            ->assertJsonPath('data.regional', [
                'locale' => 'es-MX',
                'moneda' => 'USD',
                'zona_horaria' => 'America/Tijuana',
            ]);
    }

    public function test_sin_configuracion_usa_los_valores_por_defecto_del_tenant(): void
    {
        $vendedor = Usuario::factory()->vendedor()->create()->fresh();

        $this->actingAs($vendedor)->getJson('/api/v1/sesion')
            ->assertOk()
            ->assertJsonPath('data.regional', [
                'locale' => 'es-MX',
                'moneda' => '$',
                'zona_horaria' => 'America/Mexico_City',
            ]);
    }

    public function test_responde_antes_de_configurar_el_2fa_como_la_ruta_user(): void
    {
        $admin = Usuario::factory()->admin()->create(['two_factor_confirmed_at' => null]);

        $this->actingAs($admin)->getJson('/api/v1/sesion')->assertOk();
    }
}
