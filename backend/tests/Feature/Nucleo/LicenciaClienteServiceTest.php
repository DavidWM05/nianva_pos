<?php

namespace Tests\Feature\Nucleo;

use App\Modules\Nucleo\Exceptions\LicenciaActivacionFallidaException;
use App\Modules\Nucleo\Models\LicenciaLocal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Services\LicenciaClienteService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Contrato verificado contra el codigo real del servidor de licencias
 * (repo Servidor_Licencias, LicenciaValidacionController::validar() +
 * LicenciaValidacionService::respuesta()/LicenciaValidacionTest.php), no
 * contra memoria de "como deberia ser": el campo de request es
 * `token_actual` (no `token_firmado`), el campo de response es `token`
 * (no `token_firmado`), no hay `plan_id` en la response, y saas siempre
 * responde `token: null` (se valida por consulta directa, nunca firma
 * JWT). Ver el docblock de LicenciaClienteService para el detalle completo.
 */
class LicenciaClienteServiceTest extends TestCase
{
    use RefreshDatabase;

    private const SERVIDOR_URL = 'https://licencias.test';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'licencias.producto_slug' => 'nucleo-pos-ropa',
            'licencias.servidor_url' => self::SERVIDOR_URL,
            'licencias.periodo_gracia_dias' => 7,
        ]);
    }

    private function crearTenant(): Tenant
    {
        return Tenant::create(['nombre' => 'Nianva POS Ropa', 'pais' => 'MX', 'activo' => true]);
    }

    public function test_activacion_inicial_exitosa_crea_la_fila_de_licencia_local(): void
    {
        $tenant = $this->crearTenant();

        Http::fake([
            self::SERVIDOR_URL.'/api/validar-licencia' => Http::response([
                'producto_slug' => 'nucleo-pos-ropa',
                'tenant_id_producto' => $tenant->id,
                'tipo' => 'pago_unico',
                'estado' => 'activa',
                'token' => 'jwt-inicial',
                'fecha_expiracion' => null,
            ], 200),
        ]);

        $licencia = app(LicenciaClienteService::class)->activar($tenant);

        $this->assertDatabaseHas('licencia_local', [
            'tenant_id' => $tenant->id,
            'estado' => 'activa',
            'tipo' => 'pago_unico',
            'token_firmado' => 'jwt-inicial',
        ]);
        $this->assertNotNull($licencia->ultima_validacion);

        Http::assertSent(function ($request) use ($tenant) {
            return $request['producto_slug'] === 'nucleo-pos-ropa'
                && $request['tenant_id_producto'] === $tenant->id
                && ! empty($request['identificador_instancia'])
                && $request['token_actual'] === null;
        });
    }

    /**
     * saas se valida por consulta directa en el servidor -- nunca firma un
     * JWT, `token` siempre viene null. Confirma que licencia_local no
     * termina con un token_firmado inventado para este tipo.
     */
    public function test_activacion_de_una_licencia_saas_nunca_recibe_token(): void
    {
        $tenant = $this->crearTenant();

        Http::fake([
            self::SERVIDOR_URL.'/api/validar-licencia' => Http::response([
                'tipo' => 'saas',
                'estado' => 'activa',
                'token' => null,
                'fecha_expiracion' => null,
            ], 200),
        ]);

        $licencia = app(LicenciaClienteService::class)->activar($tenant);

        $this->assertSame('activa', $licencia->estado);
        $this->assertNull($licencia->token_firmado);
    }

    public function test_activacion_sin_contacto_con_el_servidor_falla_duro(): void
    {
        $tenant = $this->crearTenant();

        Http::fake([
            self::SERVIDOR_URL.'/api/validar-licencia' => fn () => throw new ConnectionException('sin conexion'),
        ]);

        $this->expectException(LicenciaActivacionFallidaException::class);

        app(LicenciaClienteService::class)->activar($tenant);
    }

    /**
     * 404 del servidor = "nunca se registro esta licencia ahi", distinto
     * de "no se pudo contactar" -- ver
     * LicenciaValidacionController::validar() y su test
     * test_producto_o_tenant_inexistente_responde_404_distinto_de_revocada.
     */
    public function test_activacion_con_producto_o_tenant_no_registrado_en_el_servidor_falla_con_mensaje_especifico(): void
    {
        $tenant = $this->crearTenant();

        Http::fake([
            self::SERVIDOR_URL.'/api/validar-licencia' => Http::response(['message' => 'Licencia no encontrada.'], 404),
        ]);

        $this->expectException(LicenciaActivacionFallidaException::class);
        $this->expectExceptionMessage('no tiene ninguna licencia registrada');

        app(LicenciaClienteService::class)->activar($tenant);
    }

    public function test_revalidacion_con_token_vigente_no_lo_regenera(): void
    {
        $tenant = $this->crearTenant();
        $licencia = LicenciaLocal::create([
            'tenant_id' => $tenant->id,
            'tipo' => 'pago_unico',
            'fecha_inicio' => now()->subMonth()->toDateString(),
            'estado' => 'activa',
            'token_firmado' => 'jwt-vigente',
            'ultima_validacion' => now()->subDay(),
        ]);

        Http::fake([
            self::SERVIDOR_URL.'/api/validar-licencia' => Http::response(['estado' => 'activa', 'token' => 'jwt-vigente'], 200),
        ]);

        $actualizada = app(LicenciaClienteService::class)->revalidar($licencia);

        $this->assertSame('jwt-vigente', $actualizada->token_firmado);
        $this->assertTrue($actualizada->ultima_validacion->isToday());

        Http::assertSent(fn ($request) => $request['token_actual'] === 'jwt-vigente');
    }

    public function test_servidor_caido_dentro_del_periodo_de_gracia_sigue_funcionando(): void
    {
        $tenant = $this->crearTenant();
        $ultimaValidacion = now()->subDays(3);
        $licencia = LicenciaLocal::create([
            'tenant_id' => $tenant->id,
            'tipo' => 'saas',
            'fecha_inicio' => now()->subMonth()->toDateString(),
            'estado' => 'activa',
            'token_firmado' => null,
            'ultima_validacion' => $ultimaValidacion,
        ]);

        Http::fake([
            self::SERVIDOR_URL.'/api/validar-licencia' => fn () => throw new ConnectionException('sin conexion'),
        ]);

        $actualizada = app(LicenciaClienteService::class)->revalidar($licencia);

        $this->assertSame('activa', $actualizada->estado);
        $this->assertEquals($ultimaValidacion->toDateTimeString(), $actualizada->ultima_validacion->toDateTimeString());
    }

    public function test_servidor_caido_fuera_del_periodo_de_gracia_marca_vencida(): void
    {
        $tenant = $this->crearTenant();
        $ultimaValidacion = now()->subDays(8);
        $licencia = LicenciaLocal::create([
            'tenant_id' => $tenant->id,
            'tipo' => 'anual',
            'fecha_inicio' => now()->subMonth()->toDateString(),
            'estado' => 'activa',
            'token_firmado' => 'jwt-anterior',
            'ultima_validacion' => $ultimaValidacion,
        ]);

        Http::fake([
            self::SERVIDOR_URL.'/api/validar-licencia' => fn () => throw new ConnectionException('sin conexion'),
        ]);

        $actualizada = app(LicenciaClienteService::class)->revalidar($licencia);

        $this->assertSame('vencida', $actualizada->estado);
        // ultima_validacion NO se toca -- sigue midiendo desde el ultimo exito real.
        $this->assertEquals($ultimaValidacion->toDateTimeString(), $actualizada->ultima_validacion->toDateTimeString());
        // token_firmado tampoco se toca durante la gracia.
        $this->assertSame('jwt-anterior', $actualizada->token_firmado);
    }

    public function test_servidor_responde_revocada_se_refleja_de_inmediato_sin_esperar_gracia(): void
    {
        $tenant = $this->crearTenant();
        $licencia = LicenciaLocal::create([
            'tenant_id' => $tenant->id,
            'tipo' => 'demo',
            'fecha_inicio' => now()->subMonth()->toDateString(),
            'estado' => 'activa',
            'token_firmado' => 'jwt-anterior',
            // Recien validada -- muy lejos de agotar el periodo de gracia.
            'ultima_validacion' => now(),
        ]);

        Http::fake([
            self::SERVIDOR_URL.'/api/validar-licencia' => Http::response(['estado' => 'revocada', 'token' => null], 200),
        ]);

        $actualizada = app(LicenciaClienteService::class)->revalidar($licencia);

        $this->assertSame('revocada', $actualizada->estado);
        $this->assertTrue($actualizada->ultima_validacion->isToday());
    }

    /**
     * Servidor responde 200 con estado=vencida explicito (ej. anual con
     * fecha_expiracion pasada, ver LicenciaValidacionService) -- se aplica
     * de inmediato igual que revocada, no como una caida temporal.
     */
    public function test_servidor_responde_vencida_explicito_se_refleja_de_inmediato(): void
    {
        $tenant = $this->crearTenant();
        $licencia = LicenciaLocal::create([
            'tenant_id' => $tenant->id,
            'tipo' => 'anual',
            'fecha_inicio' => now()->subYear()->toDateString(),
            'estado' => 'activa',
            'token_firmado' => 'jwt-anterior',
            'ultima_validacion' => now(),
        ]);

        Http::fake([
            self::SERVIDOR_URL.'/api/validar-licencia' => Http::response(['estado' => 'vencida', 'token' => null], 200),
        ]);

        $actualizada = app(LicenciaClienteService::class)->revalidar($licencia);

        $this->assertSame('vencida', $actualizada->estado);
        $this->assertTrue($actualizada->ultima_validacion->isToday());
    }
}
