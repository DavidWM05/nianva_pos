<?php

namespace App\Modules\Nucleo\Console\Commands;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use ReflectionClass;

/**
 * Genera docs/estandares/catalogo_error_code.md a partir de las excepciones
 * de negocio (API-03, API-04). errorCode() y status() se leen sin llamar al
 * constructor; las claves de contexto se extraen del codigo de contexto()
 * porque sus valores dependen del estado de la instancia.
 */
class ErroresCatalogoCommand extends Command
{
    protected $signature = 'errores:catalogo';

    protected $description = 'Genera el catalogo de error_code desde las excepciones de negocio.';

    public function handle(): int
    {
        $filas = [];

        foreach (File::allFiles(app_path('Modules')) as $archivo) {
            if ($archivo->getExtension() !== 'php') {
                continue;
            }

            if (! str_contains($archivo->getPathname(), DIRECTORY_SEPARATOR.'Exceptions'.DIRECTORY_SEPARATOR)) {
                continue;
            }

            $relativo = Str::after($archivo->getPathname(), app_path().DIRECTORY_SEPARATOR);
            $clase = 'App\\'.str_replace(['/', '\\'], '\\', Str::beforeLast($relativo, '.php'));

            if (! class_exists($clase)) {
                continue;
            }

            $reflejo = new ReflectionClass($clase);

            if ($reflejo->isAbstract() || ! $reflejo->isSubclassOf(ExcepcionNegocio::class)) {
                continue;
            }

            $excepcion = $reflejo->newInstanceWithoutConstructor();

            $filas[] = [
                'error_code' => $excepcion->errorCode(),
                'status' => $excepcion->status(),
                'clase' => $clase,
                'modulo' => explode('\\', $clase)[2],
                'contexto' => $this->clavesDeContexto($reflejo),
            ];
        }

        usort($filas, fn (array $a, array $b) => strcmp($a['error_code'], $b['error_code']));

        $lineas = [
            '# Catalogo de error_code',
            '',
            'Generado con `php artisan errores:catalogo` desde las excepciones de negocio.',
            '',
            '| error_code | HTTP | Clase | Modulo | Claves de contexto |',
            '|---|---|---|---|---|',
        ];

        foreach ($filas as $fila) {
            $lineas[] = sprintf(
                '| `%s` | %d | `%s` | %s | %s |',
                $fila['error_code'],
                $fila['status'],
                $fila['clase'],
                $fila['modulo'],
                $fila['contexto'],
            );
        }

        $destino = dirname(base_path()).DIRECTORY_SEPARATOR.'docs'.DIRECTORY_SEPARATOR.'estandares'.DIRECTORY_SEPARATOR.'catalogo_error_code.md';
        File::ensureDirectoryExists(dirname($destino));
        File::put($destino, implode("\n", $lineas)."\n");

        $this->info('Catalogo generado con '.count($filas).' filas en docs/estandares/catalogo_error_code.md');

        return self::SUCCESS;
    }

    private function clavesDeContexto(ReflectionClass $reflejo): string
    {
        $metodo = $reflejo->getMethod('contexto');

        if ($metodo->getDeclaringClass()->getName() === ExcepcionNegocio::class) {
            return '—';
        }

        $archivo = $metodo->getFileName();

        if ($archivo === false) {
            return 'ver clase';
        }

        $lineas = array_slice(
            file($archivo),
            $metodo->getStartLine() - 1,
            $metodo->getEndLine() - $metodo->getStartLine() + 1,
        );

        preg_match_all("/'([a-z][a-z0-9_]*)'\s*=>/", implode('', $lineas), $coincidencias);

        if ($coincidencias[1] === []) {
            return 'ver clase';
        }

        return implode(', ', $coincidencias[1]);
    }
}
