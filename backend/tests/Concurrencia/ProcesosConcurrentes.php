<?php

declare(strict_types=1);

namespace Tests\Concurrencia;

use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Assert;
use Symfony\Component\Process\Process;

/** Procesos independientes, datos confirmados y observación del bloqueo real en InnoDB. */
final class ProcesosConcurrentes
{
    /** @var array<int, string> Canal JSONL independiente del buffering de stdout en Windows. */
    private static array $archivos = [];

    /** @param array<string, int> $datos */
    public static function iniciar(string $operacion, array $datos): Process
    {
        $conexion = config('database.connections.'.DB::getDefaultConnection());
        $archivo = tempnam(sys_get_temp_dir(), 'nianva-concurrencia-');
        Assert::assertNotFalse($archivo, 'No se pudo crear el canal de eventos del hijo.');
        $proceso = new Process([PHP_BINARY, base_path('tests/Concurrencia/operacion.php'), $operacion], base_path(), [
            'NIANVA_CONCURRENCIA_EVENTOS' => $archivo,
            'APP_ENV' => 'testing',
            'APP_KEY' => config('app.key'),
            'DB_CONNECTION' => 'mysql',
            'DB_URL' => '',
            'DB_HOST' => $conexion['host'],
            'DB_PORT' => (string) $conexion['port'],
            'DB_DATABASE' => $conexion['database'],
            'DB_USERNAME' => $conexion['username'],
            'DB_PASSWORD' => $conexion['password'],
            'DB_SOCKET' => $conexion['unix_socket'] ?? '',
            'CACHE_STORE' => 'array',
            'SESSION_DRIVER' => 'array',
        ], json_encode($datos, JSON_THROW_ON_ERROR), 30);
        self::$archivos[spl_object_id($proceso)] = $archivo;
        $proceso->start();

        return $proceso;
    }

    public static function esperarBloqueo(Process $proceso): void
    {
        $limite = microtime(true) + 15;
        $id = null;
        $espera = null;
        do {
            $eventos = self::eventos($proceso);
            $id = $eventos[0]['conexion'] ?? null;
            if ($id !== null) {
                $espera = DB::selectOne(
                    'SELECT COUNT(*) AS total FROM performance_schema.data_lock_waits AS espera JOIN performance_schema.threads AS hilo ON hilo.THREAD_ID = espera.REQUESTING_THREAD_ID WHERE hilo.PROCESSLIST_ID = ?',
                    [$id],
                );
                if ((int) $espera->total > 0) {
                    Assert::assertTrue($proceso->isRunning(), 'El hijo debe seguir esperando el saldo bloqueado.');

                    return;
                }
            }
            if (! $proceso->isRunning()) {
                break;
            }
            usleep(50000);
        } while (microtime(true) < $limite);

        Assert::fail('El hijo no llegó a LOCK WAIT en MySQL. '.json_encode(['id' => $id, 'espera' => $espera]).' '.$proceso->getOutput().' '.$proceso->getErrorOutput());
    }

    /** @return list<array<string, mixed>> */
    public static function eventos(Process $proceso): array
    {
        $contenido = file_get_contents(self::$archivos[spl_object_id($proceso)]);
        $lineas = array_map(trim(...), explode("\n", trim($contenido === false ? '' : $contenido)));

        return array_values(array_map(
            static fn (string $linea): array => json_decode($linea, true, 512, JSON_THROW_ON_ERROR),
            array_filter($lineas, static fn (string $linea): bool => str_ends_with($linea, '}')),
        ));
    }

    public static function cerrar(Process $proceso): void
    {
        if ($proceso->isRunning()) {
            $proceso->stop();
        }
        $id = spl_object_id($proceso);
        unlink(self::$archivos[$id]);
        unset(self::$archivos[$id]);
    }
}
