<?php

namespace Tests\Feature\Arquitectura;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;
use App\Modules\Nucleo\Models\Rol;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use RuntimeException;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class ErroresSinDetallesInternosTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    private const MENSAJE_ERROR_INTERNO = 'Error interno del servidor.';

    protected function setUp(): void
    {
        parent::setUp();

        $this->prepararNegocio(['clientes.ver']);
        $this->registrarRutasDePrueba();
    }

    protected function tearDown(): void
    {
        config(['app.debug' => true]);

        parent::tearDown();
    }

    public function test_500_en_produccion_no_filtra_detalles_internos_y_registra_la_correlacion(): void
    {
        config(['app.debug' => false]);

        $rutaLog = storage_path('logs/correlacion-'.Str::ulid().'.log');
        config([
            'logging.default' => 'prueba_correlacion',
            'logging.channels.prueba_correlacion' => [
                'driver' => 'single',
                'path' => $rutaLog,
                'level' => 'debug',
            ],
        ]);

        try {
            $respuesta = $this->getJson('/test-error-500');

            $respuesta->assertStatus(500);

            $correlacion = $respuesta->headers->get('X-Correlation-Id');
            $this->assertIsString($correlacion);
            $this->assertTrue(Str::isUlid($correlacion));

            $respuesta->assertExactJson([
                'message' => self::MENSAJE_ERROR_INTERNO,
                'error_code' => 'error_interno',
                'correlation_id' => $correlacion,
            ]);

            $cuerpo = $respuesta->getContent();

            foreach (['SQLSTATE', '/var/www', '.php', 'trace', 'file', 'line', 'exception'] as $dato) {
                $this->assertStringNotContainsString($dato, $cuerpo, "La respuesta 500 filtro '{$dato}'.");
            }

            $this->assertFileExists($rutaLog);
            $log = File::get($rutaLog);
            $this->assertStringContainsString($correlacion, $log);
            $this->assertStringContainsString('RuntimeException', $log);
        } finally {
            File::delete($rutaLog);
        }
    }

    public function test_500_de_query_exception_tambien_usa_el_sobre_generico(): void
    {
        config(['app.debug' => false]);

        $respuesta = $this->getJson('/test-error-query');

        $respuesta->assertStatus(500);

        $correlacion = $respuesta->headers->get('X-Correlation-Id');
        $this->assertIsString($correlacion);
        $this->assertTrue(Str::isUlid($correlacion));

        $respuesta->assertExactJson([
            'message' => self::MENSAJE_ERROR_INTERNO,
            'error_code' => 'error_interno',
            'correlation_id' => $correlacion,
        ]);

        $this->assertStringNotContainsString('tabla_que_no_existe', $respuesta->getContent());
        $this->assertStringNotContainsString('SQLSTATE', $respuesta->getContent());
    }

    public function test_los_status_genericos_traen_su_error_code_y_conservan_el_message(): void
    {
        $this->assertErrorCode(
            $this->getJson('/api/v1/user'),
            401,
            'no_autenticado',
            'Unauthenticated.',
        );

        $this->actingAs($this->usuario);

        $this->assertErrorCode(
            $this->getJson('/api/v1/usuarios'),
            403,
            'sin_permiso',
            'No tienes el permiso requerido: usuarios.ver',
        );

        $this->assertErrorCode(
            $this->getJson('/api/v1/ruta-que-no-existe'),
            404,
            'no_encontrado',
        );

        $modeloInexistente = $this->getJson('/api/v1/clientes/999999');

        $this->assertErrorCode(
            $modeloInexistente,
            404,
            'no_encontrado',
        );
        $this->assertStringNotContainsString('App\\Modules', $modeloInexistente->getContent());

        $this->assertErrorCode(
            $this->postJson('/api/v1/user'),
            405,
            'metodo_no_permitido',
        );

        $this->assertErrorCode(
            $this->getJson('/test-error-419'),
            419,
            'sesion_expirada',
            'CSRF token mismatch.',
        );

        $rolAdmin = Rol::create(['tenant_id' => null, 'nombre' => 'admin', 'es_sistema' => true]);
        $this->usuario->roles()->attach($rolAdmin->id);
        $this->usuario->refresh();

        $this->assertErrorCode(
            $this->getJson('/test-error-423'),
            423,
            'dos_pasos_requeridos',
            'Debes configurar la autenticacion en dos pasos antes de continuar.',
        );
    }

    public function test_429_de_throttle_usa_el_sobre_generico(): void
    {
        for ($intento = 1; $intento <= 5; $intento++) {
            $this->postJson('/login', [
                'correo' => 'nadie@test.com',
                'password' => 'incorrecta',
            ])->assertStatus(422);
        }

        $this->assertErrorCode(
            $this->postJson('/login', [
                'correo' => 'nadie@test.com',
                'password' => 'incorrecta',
            ]),
            429,
            'demasiadas_solicitudes',
        );
    }

    public function test_la_validacion_422_conserva_el_formato_nativo(): void
    {
        $this->postJson('/login', [])
            ->assertStatus(422)
            ->assertJsonStructure(['message', 'errors'])
            ->assertJsonMissingPath('error_code');
    }

    public function test_una_excepcion_de_negocio_sigue_ganando(): void
    {
        $respuesta = $this->getJson('/test-error-negocio');

        $respuesta->assertStatus(422)->assertExactJson([
            'clave' => 'valor',
            'message' => 'Mensaje de negocio.',
            'error_code' => 'error_de_prueba',
        ]);
    }

    public function test_toda_respuesta_trae_un_ulid_y_ignora_el_que_manda_el_cliente(): void
    {
        $respuesta = $this->actingAs($this->usuario)
            ->withHeader('X-Correlation-Id', 'correlacion-del-cliente')
            ->getJson('/test-ok');

        $respuesta->assertOk();

        $correlacion = $respuesta->headers->get('X-Correlation-Id');

        $this->assertIsString($correlacion);
        $this->assertTrue(Str::isUlid($correlacion));
        $this->assertNotSame('correlacion-del-cliente', $correlacion);
    }

    private function assertErrorCode(TestResponse $respuesta, int $status, string $codigo, ?string $mensaje = null): void
    {
        $respuesta->assertStatus($status)
            ->assertJsonPath('error_code', $codigo)
            ->assertJsonMissingPath('trace')
            ->assertJsonMissingPath('exception')
            ->assertJsonMissingPath('file')
            ->assertJsonMissingPath('line');

        if ($mensaje !== null) {
            $respuesta->assertJsonPath('message', $mensaje);
        } else {
            $this->assertNotSame('', (string) $respuesta->json('message'));
        }

        $correlacion = $respuesta->headers->get('X-Correlation-Id');
        $this->assertIsString($correlacion);
        $this->assertTrue(Str::isUlid($correlacion));
    }

    private function registrarRutasDePrueba(): void
    {
        Route::middleware('web')->get('/test-ok', fn () => response()->json(['ok' => true]));

        Route::middleware('web')->get('/test-error-500', function (): void {
            throw new RuntimeException('SQLSTATE[42S02]: tabla secreta /var/www/app.php');
        });

        Route::middleware('web')->get('/test-error-query', function (): void {
            DB::select('select * from tabla_que_no_existe');
        });

        Route::middleware('web')->get('/test-error-419', fn () => abort(419, 'CSRF token mismatch.'));

        Route::middleware('web')->get('/test-error-negocio', function (): void {
            throw new class extends ExcepcionNegocio
            {
                public function __construct()
                {
                    parent::__construct('Mensaje de negocio.');
                }

                public function errorCode(): string
                {
                    return 'error_de_prueba';
                }

                public function contexto(): array
                {
                    return ['clave' => 'valor'];
                }
            };
        });

        Route::middleware(['web', 'auth', 'two-factor.confirmed'])
            ->get('/test-error-423', fn () => response()->json(['ok' => true]));
    }
}
