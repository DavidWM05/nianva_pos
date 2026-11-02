<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;

/**
 * Limpia la lista de archivos pendientes de strict_types. Solo elimina
 * entradas que ya declaran strict_types o que ya no existen; nunca agrega
 * archivos nuevos (esos deben corregirse, no entrar a la lista).
 */
class StrictTypesPendientesCommand extends Command
{
    protected $signature = 'arquitectura:strict-types-pendientes
        {--check : Verifica si la lista se puede limpiar sin escribir}';

    protected $description = 'Quita de sin-strict-types.txt los archivos que ya cumplen o no existen.';

    public function handle(): int
    {
        $ruta = base_path('tests/Fixtures/sin-strict-types.txt');
        $lineas = File::exists($ruta)
            ? (file($ruta, FILE_IGNORE_NEW_LINES) ?: [])
            : [];

        $original = array_values(array_filter(array_map('trim', $lineas)));
        $restantes = [];

        foreach ($original as $archivo) {
            $rutaArchivo = base_path($archivo);

            if (! is_file($rutaArchivo)) {
                continue;
            }

            $contenido = File::get($rutaArchivo);

            if (preg_match('/^\s*declare\s*\(\s*strict_types\s*=\s*1\s*\)\s*;/m', $contenido) === 1) {
                continue;
            }

            $restantes[] = $archivo;
        }

        $restantes = array_values(array_unique($restantes));
        sort($restantes);
        $removidos = count($original) - count($restantes);

        if ($this->option('check')) {
            if ($removidos > 0) {
                $this->error("La lista tiene {$removidos} entradas que se pueden quitar; ejecuta arquitectura:strict-types-pendientes.");

                return self::FAILURE;
            }

            $this->info('Lista de strict_types al dia.');

            return self::SUCCESS;
        }

        File::ensureDirectoryExists(dirname($ruta));
        File::put($ruta, $restantes === [] ? '' : implode("\n", $restantes)."\n");

        $this->info("Lista actualizada: {$removidos} entradas quitadas; quedan ".count($restantes).'.');

        return self::SUCCESS;
    }
}
