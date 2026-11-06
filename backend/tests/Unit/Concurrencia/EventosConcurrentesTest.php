<?php

declare(strict_types=1);

namespace Tests\Unit\Concurrencia;

use PHPUnit\Framework\TestCase;
use ReflectionProperty;
use Symfony\Component\Process\Process;
use Tests\Concurrencia\ProcesosConcurrentes;

class EventosConcurrentesTest extends TestCase
{
    public function test_la_lectura_espera_a_que_el_escritor_complete_el_evento(): void
    {
        $archivo = tempnam(sys_get_temp_dir(), 'nianva-evento-');
        $this->assertNotFalse($archivo);
        $marca = $archivo.'.escribiendo';
        $backend = dirname(__DIR__, 3);
        $hijo = new Process([PHP_BINARY, $backend.'/tests/Fixtures/escribir-eventos-bloqueados.php', $archivo, $marca], $backend);
        // Registrar solo el canal del fixture, sin levantar Laravel ni una base de datos.
        $propiedad = new ReflectionProperty(ProcesosConcurrentes::class, 'archivos');
        $canales = $propiedad->getValue();
        $canales[spl_object_id($hijo)] = $archivo;
        $propiedad->setValue(null, $canales);
        try {
            $hijo->start();
            $limite = microtime(true) + 5;
            do {
                clearstatcache(true, $marca);
                if (is_file($marca)) {
                    break;
                }
                usleep(10000);
            } while ($hijo->isRunning() && microtime(true) < $limite);
            $this->assertFileExists($marca, $hijo->getErrorOutput());
            $this->assertSame([['evento' => 1]], ProcesosConcurrentes::eventos($hijo));
            $hijo->wait();
            $this->assertSame(0, $hijo->getExitCode(), $hijo->getErrorOutput());
        } finally {
            ProcesosConcurrentes::cerrar($hijo);
            if (is_file($marca)) {
                unlink($marca);
            }
        }
    }
}
