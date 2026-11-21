<?php

declare(strict_types=1);

namespace Tests\Concurrencia;

use App\Aplicacion\Idempotencia\Idempotencia;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use PHPUnit\Framework\Attributes\Group;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Process\Process;
use Tests\TestCase;

#[Group('concurrencia')]
class IdempotenciaConcurrenteTest extends TestCase
{
    public function test_el_reintento_espera_el_commit_y_recibe_la_respuesta_original(): void
    {
        $this->assertSame('mysql', DB::connection()->getDriverName());
        $usuario = Usuario::factory()->create();
        $llave = (string) Str::ulid();
        $canal = tempnam(sys_get_temp_dir(), 'nianva-api07-');
        $this->assertNotFalse($canal);

        $conexion = config('database.connections.'.DB::getDefaultConnection());
        $hijo = new Process([PHP_BINARY, __DIR__.'/operacionIdempotencia.php', (string) $usuario->id, $llave, $canal], base_path(), [
            'APP_ENV' => 'testing', 'DB_CONNECTION' => 'mysql', 'DB_URL' => '',
            'DB_HOST' => $conexion['host'], 'DB_PORT' => (string) $conexion['port'],
            'DB_DATABASE' => $conexion['database'], 'DB_USERNAME' => $conexion['username'],
            'DB_PASSWORD' => $conexion['password'],
        ], null, 30);

        try {
            $solicitud = Request::create('/api/v1/ventas', 'POST', ['total' => 100]);
            $solicitud->setUserResolver(static fn (): Usuario => $usuario);
            $solicitud->headers->set('Idempotency-Key', $llave);

            $original = app(Idempotencia::class)->handle($solicitud, function () use ($hijo, $canal): JsonResponse {
                $hijo->start();
                $this->esperarBloqueoDeLaReserva($hijo, $canal);

                return new JsonResponse(['ejecucion' => 'padre'], 201);
            });

            $this->assertSame(0, $hijo->wait(), $hijo->getErrorOutput());
            $this->assertSame($original->getContent(), $hijo->getOutput());
            $this->assertSame(1, DB::table('solicitudes_idempotentes')->where('tenant_id', $usuario->tenant_id)->count());
        } finally {
            $hijo->stop();
            unlink($canal);
        }
    }

    private function esperarBloqueoDeLaReserva(Process $hijo, string $canal): void
    {
        $limite = microtime(true) + 15;
        do {
            $id = (int) file_get_contents($canal);
            if ($id > 0) {
                $fila = DB::selectOne(
                    'SELECT COUNT(*) AS total FROM performance_schema.data_lock_waits AS espera JOIN performance_schema.threads AS hilo ON hilo.THREAD_ID = espera.REQUESTING_THREAD_ID WHERE hilo.PROCESSLIST_ID = ?',
                    [$id],
                );
                if ((int) $fila->total > 0) {
                    return;
                }
            }
            usleep(50000);
        } while ($hijo->isRunning() && microtime(true) < $limite);

        $this->fail('El reintento no llegó al bloqueo de la reserva: '.$hijo->getErrorOutput());
    }
}
