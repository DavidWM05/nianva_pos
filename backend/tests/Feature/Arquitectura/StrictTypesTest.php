<?php

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Tests\TestCase;

class StrictTypesTest extends TestCase
{
    public function test_todo_php_nuevo_declara_strict_types_salvo_los_pendientes(): void
    {
        $pendientes = array_values(array_filter(
            array_map('trim', file(base_path('tests/Fixtures/sin-strict-types.txt'), FILE_IGNORE_NEW_LINES) ?: []),
        ));

        $this->assertSame($pendientes, array_values(array_unique($pendientes)), 'La lista de pendientes tiene duplicados.');
        $this->assertSame($pendientes, (function (array $rutas): array {
            sort($rutas);

            return array_values($rutas);
        })($pendientes), 'La lista de pendientes no esta ordenada.');

        $infracciones = [];

        foreach ($this->archivosPhp() as $archivo) {
            $ruta = $this->rutaRelativa($archivo->getPathname());
            $contenido = File::get($archivo->getPathname());
            $declara = preg_match('/^\s*declare\s*\(\s*strict_types\s*=\s*1\s*\)\s*;/m', $contenido) === 1;
            $enLista = in_array($ruta, $pendientes, true);

            if (! $declara && ! $enLista) {
                $infracciones[] = "{$ruta}: no declara strict_types y no esta en la lista de pendientes.";
            }

            if ($declara && $enLista) {
                $infracciones[] = "{$ruta}: ya declara strict_types; quitar de sin-strict-types.txt.";
            }
        }

        foreach ($pendientes as $ruta) {
            if (! is_file(base_path($ruta))) {
                $infracciones[] = "{$ruta}: la lista apunta a un archivo inexistente.";
            }
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }

    /**
     * @return list<\SplFileInfo>
     */
    private function archivosPhp(): array
    {
        $archivos = [];

        foreach (['app', 'database', 'routes'] as $directorio) {
            foreach (File::allFiles(base_path($directorio)) as $archivo) {
                if ($archivo->getExtension() === 'php') {
                    $archivos[] = $archivo;
                }
            }
        }

        return $archivos;
    }

    private function rutaRelativa(string $ruta): string
    {
        return str_replace('\\', '/', Str::after($ruta, base_path().DIRECTORY_SEPARATOR));
    }
}
