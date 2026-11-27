<?php

declare(strict_types=1);

namespace Tests\Feature\Nucleo;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Nucleo\Database\Seeders\NucleoRolesPermisosSeeder;
use App\Modules\Nucleo\Models\LicenciaLocal;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\FuenteConcesion;
use App\Modules\Nucleo\Services\FuenteConcesionLicencia;
use App\Modules\Nucleo\Services\IdentidadLicencia;
use App\Modules\Nucleo\Services\LicenciaClienteService;
use App\Modules\Nucleo\Services\Planes;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\Support\FirmaLicenciaPos;
use Tests\TestCase;

final class SesionPorPlanTest extends TestCase
{
    use FirmaLicenciaPos, RefreshDatabase;

    public function test_puede_elegir_terminal_en_solo_lectura_pero_no_registrar_venta(): void
    {
        config(['sanctum.stateful' => ['localhost:4200']]);
        $this->seed(NucleoRolesPermisosSeeder::class);
        $usuario = Usuario::factory()->admin()->create(['two_factor_confirmed_at' => now()]);
        $terminal = Terminal::factory()->create(['tenant_id' => $usuario->tenant_id, 'sucursal_id' => $usuario->sucursal_id]);
        LicenciaLocal::factory()->create(['tenant_id' => $usuario->tenant_id, 'estado' => 'revocada']);

        $this->actingAs($usuario)->withHeader('Referer', 'http://localhost:4200/');
        $this->putJson('/api/v1/sesion/terminal', ['terminal_id' => $terminal->id])->assertNoContent();
        $this->withCredentials()->withCookie(session()->getName(), session()->getId());
        $this->getJson('/api/v1/sesion/terminales')->assertOk()->assertJsonPath('data.0.id', $terminal->id);
        $this->getJson('/api/v1/sesion')->assertOk()->assertJsonPath('data.terminal.id', $terminal->id);
        $this->postJson('/api/v1/ventas')->assertForbidden()->assertJsonPath('error_code', 'licencia_solo_lectura');
    }

    public function test_la_sesion_central_carece_de_contexto_comercial(): void
    {
        $usuario = Usuario::factory()->superadmin()->create(['two_factor_confirmed_at' => null])->refresh();

        $respuesta = $this->actingAs($usuario)->getJson('/api/v1/sesion')->assertOk();
        foreach (['plan', 'limites', 'licencia', 'perfil_giro', 'sucursal', 'terminal'] as $campo) {
            $respuesta->assertJsonPath('data.'.$campo, null);
        }
    }

    public function test_la_fila_sin_codigo_ni_token_publica_basico_sin_licencia(): void
    {
        $usuario = $this->usuario();
        LicenciaLocal::factory()->create(['tenant_id' => $usuario->tenant_id, 'estado' => 'activa']);

        $this->getJson('/api/v1/sesion')->assertOk()
            ->assertJsonPath('data.plan.codigo', 'basico')
            ->assertJsonPath('data.licencia', [
                'estado' => 'sin_licencia',
                'modo_operativo' => 'operativa',
                'motivo' => null,
                'gracia_hasta' => null,
                'soporte_hasta' => null,
            ]);
    }

    public function test_el_usuario_sin_sucursal_conserva_el_contexto_del_tenant(): void
    {
        $usuario = $this->usuario(['sucursal_id' => null]);
        ConfiguracionTenant::factory()->create(['tenant_id' => $usuario->tenant_id, 'perfil_giro' => 'generico']);

        $this->getJson('/api/v1/sesion')->assertOk()
            ->assertJsonPath('data.sucursal', null)
            ->assertJsonPath('data.terminal', null)
            ->assertJsonPath('data.plan.codigo', 'basico')
            ->assertJsonPath('data.licencia.estado', 'sin_licencia')
            ->assertJsonPath('data.licencia.modo_operativo', 'operativa')
            ->assertJsonPath('data.perfil_giro', ['clave' => 'generico', 'nombre' => 'Genérico']);
    }

    public function test_la_anual_sin_confirmacion_publica_gracia_y_respeta_el_corte_exclusivo(): void
    {
        $usuario = $this->usuario();
        $this->instalar($usuario, 'avanzado', ['tipo' => 'anual', 'fecha_expiracion' => '2026-12-31'], [
            'ultima_validacion' => '2026-11-27 08:00:00',
        ]);
        $corte = CarbonImmutable::parse('2026-12-04T08:00:00Z');

        $this->travelTo($corte->subSecond());
        $this->getJson('/api/v1/sesion')->assertOk()
            ->assertJsonPath('data.licencia.estado', 'activa')
            ->assertJsonPath('data.licencia.modo_operativo', 'operativa')
            ->assertJsonPath('data.licencia.motivo', null)
            ->assertJsonPath('data.licencia.gracia_hasta', '2026-12-04T08:00:00Z');

        foreach ([$corte, $corte->addSecond()] as $instante) {
            $this->travelTo($instante);
            $this->getJson('/api/v1/sesion')->assertOk()
                ->assertJsonPath('data.licencia.estado', 'vencida')
                ->assertJsonPath('data.licencia.modo_operativo', 'solo_lectura')
                ->assertJsonPath('data.licencia.motivo', 'gracia_agotada')
                ->assertJsonPath('data.licencia.gracia_hasta', null);
        }
    }

    public function test_la_sesion_refleja_inmediatamente_la_revalidacion_y_el_middleware_coincide(): void
    {
        $usuario = $this->usuario();
        $this->travelTo(CarbonImmutable::parse('2026-11-28T12:00:00Z'));
        $licencia = $this->instalar($usuario, 'avanzado', ['tipo' => 'anual', 'fecha_expiracion' => '2026-12-31']);

        $this->getJson('/api/v1/sesion')->assertOk()->assertHeader('Cache-Control', 'no-store, private')
            ->assertJsonPath('data.licencia.estado', 'activa')
            ->assertJsonPath('data.licencia.gracia_hasta', null);

        config(['licencias.servidor_url' => 'https://licencias.test']);
        Http::fake(['https://licencias.test/api/validar-licencia' => Http::sequence()
            ->push(['estado' => 'vencida', 'token' => null])
            ->push(['estado' => 'revocada', 'token' => null])]);
        $cliente = app(LicenciaClienteService::class);
        $cliente->revalidar($licencia);
        $this->getJson('/api/v1/sesion')->assertOk()
            ->assertJsonPath('data.licencia.estado', 'vencida')
            ->assertJsonPath('data.licencia.modo_operativo', 'operativa')
            ->assertJsonPath('data.licencia.gracia_hasta', '2026-12-05T12:00:00Z');

        $cliente->revalidar($licencia);
        $this->getJson('/api/v1/sesion')->assertOk()
            ->assertJsonPath('data.licencia.modo_operativo', 'solo_lectura')
            ->assertJsonPath('data.licencia.motivo', 'revocada')
            ->assertJsonPath('data.licencia.gracia_hasta', null);
        $this->postJson('/api/v1/ventas')->assertForbidden()
            ->assertJsonPath('error_code', 'licencia_solo_lectura')->assertJsonPath('motivo', 'revocada');
    }

    public function test_la_sesion_refleja_el_perfil_aplicado_sin_conceder_features(): void
    {
        $this->usuario();
        $antes = $this->getJson('/api/v1/sesion')->assertOk()
            ->assertJsonPath('data.perfil_giro', null)->json('data');
        $this->getJson('/api/v1/configuracion')->assertOk()->assertJsonPath('data.perfil_giro', null);
        $this->getJson('/api/v1/perfiles-giro')->assertOk()->assertJsonPath('meta.actual', null);
        $this->putJson('/api/v1/configuracion/perfil-giro', ['perfil' => 'ropa-calzado'])->assertOk();
        $this->getJson('/api/v1/configuracion')->assertOk()->assertJsonPath('data.perfil_giro', 'ropa-calzado');
        $this->getJson('/api/v1/perfiles-giro')->assertOk()->assertJsonPath('meta.actual', 'ropa-calzado');
        $this->getJson('/api/v1/sesion')->assertOk()
            ->assertJsonPath('data.perfil_giro', ['clave' => 'ropa-calzado', 'nombre' => 'Ropa y calzado'])
            ->assertJsonPath('data.plan.features', $antes['plan']['features'])
            ->assertJsonPath('data.modulos_activos', $antes['modulos_activos']);
    }

    public function test_la_sesion_refleja_el_cambio_de_modulos_activos(): void
    {
        $usuario = $this->usuario();
        $this->instalar($usuario, 'avanzado');
        $configuracion = ConfiguracionTenant::factory()->create(['tenant_id' => $usuario->tenant_id, 'modulos_activos' => ['cxc']]);

        $this->getJson('/api/v1/sesion')->assertOk()->assertJsonPath('data.modulos_activos', ['cxc']);
        $this->getJson('/api/v1/cuentas-cobrar')->assertOk();
        $configuracion->update(['modulos_activos' => []]);
        $this->getJson('/api/v1/sesion')->assertOk()->assertJsonPath('data.modulos_activos', []);
        $this->getJson('/api/v1/cuentas-cobrar')->assertForbidden()->assertJsonPath('error_code', 'modulo_no_activo');
    }

    public function test_la_sesion_refleja_la_concesion_de_un_token_nuevo(): void
    {
        $usuario = $this->usuario();
        $licencia = $this->instalar($usuario, 'avanzado');

        $this->getJson('/api/v1/sesion')->assertOk()
            ->assertJsonPath('data.plan.codigo', 'avanzado')
            ->assertJsonPath('data.limites.terminales.maximo', 3);
        $licencia->update(['token_firmado' => $this->tokenDelPlan('pro')]);
        $respuesta = $this->getJson('/api/v1/sesion')->assertOk()
            ->assertJsonPath('data.plan.codigo', 'pro')
            ->assertJsonPath('data.limites.terminales.maximo', 10);
        $this->assertContains('cxp', $respuesta->json('data.modulos_activos'));
        $this->getJson('/api/v1/cuentas-pagar')->assertOk();
    }

    public function test_la_sesion_no_expone_secreto_de_activacion_jwt_instancia_rfc_ni_huella(): void
    {
        $tenant = Tenant::factory()->create(['rfc' => 'XAXX010101000']);
        $usuario = $this->usuario(['tenant_id' => $tenant->id]);
        $huella = hash('sha256', 'huella-privada-del-equipo');
        $licencia = $this->instalar($usuario, 'avanzado', ['huella' => $huella, 'rfc' => $tenant->rfc]);

        $json = $this->getJson('/api/v1/sesion')->assertOk()->getContent();
        foreach ([$tenant->rfc, $huella, $licencia->codigo_activacion, $licencia->token_firmado, app(IdentidadLicencia::class)->identificador()] as $secreto) {
            $this->assertStringNotContainsString($secreto, $json);
        }
        $this->assertDoesNotMatchRegularExpression('/"(?:rfc|huella[^"]*|fingerprint[^"]*|codigo_activacion|identificador_instancia|jwt|token(?:_firmado|_actual)?)"\s*:/i', $json);
    }

    #[DataProvider('planes')]
    public function test_paridad_de_sesion_con_features_modulos_cuota_y_licencia(string $codigo, int $terminales, int $sucursales): void
    {
        $usuario = $this->usuario();
        if ($codigo !== 'basico') {
            $this->instalar($usuario, $codigo);
        }
        $respuesta = $this->getJson('/api/v1/sesion')->assertOk()
            ->assertJsonPath('data.plan.codigo', $codigo)
            ->assertJsonPath('data.permisos', Permiso::orderBy('nombre')->pluck('nombre')->all())
            ->assertJsonPath('data.limites.terminales', ['maximo' => $terminales, 'uso' => 0])
            ->assertJsonPath('data.limites.sucursales', ['maximo' => $sucursales, 'uso' => 1])
            ->assertJsonPath('data.licencia.modo_operativo', 'operativa');
        $features = $respuesta->json('data.plan.features');
        $modulos = $respuesta->json('data.modulos_activos');

        $this->assertSame($codigo !== 'basico', in_array('clientes', $features, true));
        $this->assertSame($codigo !== 'basico', in_array('cxc', $modulos, true));
        $this->assertSame($codigo === 'pro', in_array('cxp', $modulos, true));

        $this->comprobarAcceso('/api/v1/clientes', in_array('clientes', $features, true));
        $this->comprobarAcceso('/api/v1/cuentas-cobrar', in_array('cxc', $modulos, true));
        $this->comprobarAcceso('/api/v1/cuentas-pagar', in_array('cxp', $modulos, true));

        Terminal::factory()->count($terminales - 1)->create(['tenant_id' => $usuario->tenant_id, 'sucursal_id' => $usuario->sucursal_id]);
        $sucursal = ['sucursal_id' => $usuario->sucursal_id];
        $this->postJson('/api/v1/terminales', $sucursal + ['nombre' => 'Última plaza'])->assertCreated();
        $this->getJson('/api/v1/sesion')->assertOk()
            ->assertJsonPath('data.limites.terminales', ['maximo' => $terminales, 'uso' => $terminales]);
        $this->postJson('/api/v1/terminales', $sucursal + ['nombre' => 'Excede cuota'])->assertUnprocessable()
            ->assertJsonPath('error_code', 'limite_plan_excedido')
            ->assertJsonPath('limite', $terminales);
    }

    #[DataProvider('planes')]
    public function test_los_ejemplos_de_p1_coinciden_con_la_sesion_real(string $codigo, int $terminales, int $sucursales): void
    {
        $this->travelTo(CarbonImmutable::parse('2026-11-28T12:00:00Z'));
        $usuario = $this->usuario(['nombre' => 'Ana', 'apellido' => 'Ejemplo', 'correo' => 'ana@example.test']);
        $usuario->sucursal->update(['nombre' => 'Sucursal principal']);
        Sucursal::factory()->count($sucursales - 1)->create(['tenant_id' => $usuario->tenant_id]);
        $uso = match ($codigo) {
            'basico' => 1,
            'avanzado' => 2,
            'pro' => 7,
        };
        $terminal = Terminal::factory()->create([
            'tenant_id' => $usuario->tenant_id, 'sucursal_id' => $usuario->sucursal_id, 'nombre' => 'Mostrador',
        ]);
        Terminal::factory()->count($uso - 1)->create(['tenant_id' => $usuario->tenant_id, 'sucursal_id' => $usuario->sucursal_id]);
        $this->seleccionarTerminalParaPrueba($terminal->id);
        if ($codigo === 'avanzado') {
            $this->instalar($usuario, $codigo, ['tipo' => 'anual', 'fecha_expiracion' => '2026-11-28', 'soporte_hasta' => null], [
                'estado' => 'vencida', 'ultima_validacion' => '2026-11-27 08:00:00',
            ]);
            ConfiguracionTenant::factory()->create(['tenant_id' => $usuario->tenant_id, 'perfil_giro' => 'ropa-calzado']);
        } elseif ($codigo === 'pro') {
            $this->instalar($usuario, $codigo, ['soporte_hasta' => '2027-11-27']);
            ConfiguracionTenant::factory()->create(['tenant_id' => $usuario->tenant_id, 'perfil_giro' => 'abarrotes']);
        }

        $respuesta = $this->getJson('/api/v1/sesion')->assertOk()
            ->assertJsonPath('data.usuario.id', $usuario->id)
            ->assertJsonPath('data.usuario.tenant_id', $usuario->tenant_id)
            ->assertJsonPath('data.usuario.sucursal_id', $usuario->sucursal_id)
            ->assertJsonPath('data.sucursal.id', $usuario->sucursal_id)
            ->assertJsonPath('data.terminal.sucursal_id', $usuario->sucursal_id)
            ->assertJsonPath('data.terminal.id', $terminal->id)
            ->json();
        data_set($respuesta, 'data.usuario.id', 101);
        data_set($respuesta, 'data.usuario.tenant_id', 201);
        foreach (['usuario.sucursal_id', 'sucursal.id', 'terminal.sucursal_id'] as $campo) {
            data_set($respuesta, 'data.'.$campo, 301);
        }
        data_set($respuesta, 'data.terminal.id', 401);
        $ruta = base_path('../frontend/libs/domain/sesion/fixtures/'.$codigo.'.json');
        $json = json_encode($respuesta, JSON_THROW_ON_ERROR | JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)."\n";

        if (getenv('REGENERAR_FIXTURES_SESION') === '1') {
            file_put_contents($ruta, $json);
        }
        $this->assertFileExists($ruta);
        $this->assertJsonStringEqualsJsonString(file_get_contents($ruta), $json);
    }

    /** @return array<string, array{string, int, int}> */
    public static function planes(): array
    {
        return ['Básico' => ['basico', 1, 1], 'Avanzado' => ['avanzado', 3, 1], 'Pro' => ['pro', 10, 2]];
    }

    /** @param array<string, mixed> $atributos */
    private function usuario(array $atributos = []): Usuario
    {
        $this->app->bind(FuenteConcesion::class, FuenteConcesionLicencia::class);
        config(['licencias.permitir_concesion_local' => false]);
        $this->seed(NucleoRolesPermisosSeeder::class);
        $usuario = Usuario::factory()->admin()->create($atributos + ['two_factor_confirmed_at' => now()])->refresh();
        $this->actingAs($usuario);

        return $usuario;
    }

    /**
     * @param  array<string, mixed>  $claims
     * @param  array<string, mixed>  $atributos
     */
    private function instalar(Usuario $usuario, string $codigo, array $claims = [], array $atributos = []): LicenciaLocal
    {
        $this->prepararFirmaLicencia();

        return LicenciaLocal::factory()->create($atributos + [
            'tenant_id' => $usuario->tenant_id,
            'tipo' => $claims['tipo'] ?? 'pago_unico',
            'codigo_activacion' => 'CODIGO-PRIVADO-SESION',
            'token_firmado' => $this->tokenDelPlan($codigo, $claims),
        ]);
    }

    /** @param array<string, mixed> $claims */
    private function tokenDelPlan(string $codigo, array $claims = []): string
    {
        $plan = app(Planes::class)->catalogo($codigo, paquetes: 1);

        return $this->tokenPos($claims + [
            'plan_codigo' => $codigo,
            'features' => $plan->features,
            'cuotas' => ['terminales' => $plan->terminales, 'sucursales' => $plan->sucursales],
        ]);
    }

    private function comprobarAcceso(string $ruta, bool $concedida): void
    {
        $respuesta = $this->getJson($ruta);
        if ($concedida) {
            $respuesta->assertOk();

            return;
        }

        $respuesta->assertForbidden()->assertJsonPath('error_code', 'feature_no_concedida');
    }
}
