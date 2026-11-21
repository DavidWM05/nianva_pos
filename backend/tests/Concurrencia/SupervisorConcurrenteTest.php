<?php

declare(strict_types=1);

namespace Tests\Concurrencia;

use App\Aplicacion\Supervisor\Supervisor;
use App\Modules\Nucleo\Dtos\OperacionSupervisorDto;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\AccionSupervisor;
use App\Modules\Nucleo\Support\HuellaSupervisor;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\Group;
use Symfony\Component\Process\Process;
use Tests\TestCase;

#[Group('concurrencia')]
class SupervisorConcurrenteTest extends TestCase
{
    public function test_dos_consumos_concurrentes_del_mismo_token_solo_autorizan_un_uso(): void
    {
        $this->assertSame('mysql', DB::connection()->getDriverName());
        $sucursal = Sucursal::factory()->create();
        $usuario = Usuario::factory()->create(['tenant_id' => $sucursal->tenant_id, 'sucursal_id' => $sucursal->id]);
        $token = bin2hex(random_bytes(32));
        $huella = HuellaSupervisor::de([]);
        DB::table('autorizaciones_supervisor')->insert([
            'tenant_id' => $sucursal->tenant_id, 'sucursal_id' => $sucursal->id,
            'solicitante_id' => $usuario->id, 'supervisor_id' => $usuario->id,
            'token_hash' => hash('sha256', $token), 'accion' => AccionSupervisor::DescuentoVenta->value,
            'huella' => $huella, 'vence_en' => now()->addMinutes(2),
        ]);

        $canal = tempnam(sys_get_temp_dir(), 'nianva-seg05-');
        $this->assertNotFalse($canal);
        $conexion = config('database.connections.'.DB::getDefaultConnection());
        $hijo = new Process([PHP_BINARY, __DIR__.'/operacionSupervisor.php', (string) $usuario->id, $token, $canal], base_path(), [
            'APP_ENV' => 'testing', 'DB_CONNECTION' => 'mysql', 'DB_URL' => '',
            'DB_HOST' => $conexion['host'], 'DB_PORT' => (string) $conexion['port'],
            'DB_DATABASE' => $conexion['database'], 'DB_USERNAME' => $conexion['username'],
            'DB_PASSWORD' => $conexion['password'],
        ], null, 30);

        try {
            DB::transaction(function () use ($usuario, $token, $huella, $hijo, $canal): void {
                Supervisor::consumir(new OperacionSupervisorDto($usuario, $token, $huella, null), AccionSupervisor::DescuentoVenta);
                $hijo->start();
                $this->esperarBloqueo($hijo, $canal);
            });

            $this->assertSame(0, $hijo->wait(), $hijo->getErrorOutput());
            $this->assertSame('rechazada', $hijo->getOutput());
        } finally {
            $hijo->stop();
            unlink($canal);
        }
    }

    private function esperarBloqueo(Process $hijo, string $canal): void
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

        $this->fail('El segundo consumo no esperó el bloqueo: '.$hijo->getErrorOutput());
    }
}
