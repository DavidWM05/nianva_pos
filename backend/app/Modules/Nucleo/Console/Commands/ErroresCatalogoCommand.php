<?php

namespace App\Modules\Nucleo\Console\Commands;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use ReflectionClass;

/**
 * Genera docs/estandares/catalogo_error_code.md y el catalogo TypeScript del
 * frontend a partir de las excepciones de negocio (API-03, API-04).
 * errorCode() y status() se leen sin llamar al constructor; las claves de
 * contexto se extraen del codigo de contexto() porque sus valores dependen
 * del estado de la instancia.
 */
class ErroresCatalogoCommand extends Command
{
    protected $signature = 'errores:catalogo
        {--check : Verifica que el catalogo Markdown y el TypeScript esten al dia sin escribir en disco}';

    protected $description = 'Genera el catalogo de error_code desde las excepciones de negocio.';

    public function handle(): int
    {
        $filas = $this->filas();
        $markdown = $this->contenidoMarkdown($filas);
        $typescript = $this->contenidoTypescriptDesdeFilas($filas);

        $destinos = [
            $this->rutaMarkdown() => $markdown,
            $this->rutaTypescript() => $typescript,
        ];

        if ($this->option('check')) {
            $desactualizados = [];

            foreach ($destinos as $ruta => $contenido) {
                if (! File::exists($ruta) || ! self::contenidoEquivalente(File::get($ruta), $contenido)) {
                    $desactualizados[] = $this->rutaRelativa($ruta);
                }
            }

            if ($desactualizados !== []) {
                $this->error('Catalogo desactualizado: '.implode(', ', $desactualizados).'. Ejecuta php artisan errores:catalogo.');

                return self::FAILURE;
            }

            $this->info('Catalogo Markdown y TypeScript al dia.');

            return self::SUCCESS;
        }

        foreach ($destinos as $ruta => $contenido) {
            File::ensureDirectoryExists(dirname($ruta));
            File::put($ruta, $contenido);
        }

        $this->info('Catalogo generado con '.count($filas).' filas en docs/estandares/catalogo_error_code.md y frontend/libs/ui-shared/src/lib/errores/codigos-error.ts');

        return self::SUCCESS;
    }

    /**
     * Compara ignorando el fin de linea: con core.autocrlf=true, Git en
     * Windows deja los archivos generados con CRLF y el contenido es el mismo.
     */
    public static function contenidoEquivalente(string $enDisco, string $esperado): bool
    {
        return str_replace("\r\n", "\n", $enDisco) === str_replace("\r\n", "\n", $esperado);
    }

    public function contenidoTypescript(): string
    {
        return $this->contenidoTypescriptDesdeFilas($this->filas());
    }

    /**
     * @return list<array{error_code: string, status: int, clase: string, modulo: string, contexto: string}>
     */
    private function filas(): array
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

        return $filas;
    }

    /**
     * @param  list<array{error_code: string, status: int, clase: string, modulo: string, contexto: string}>  $filas
     */
    private function contenidoMarkdown(array $filas): string
    {
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

        return implode("\n", $lineas)."\n";
    }

    /**
     * @param  list<array{error_code: string, status: int, clase: string, modulo: string, contexto: string}>  $filas
     */
    private function contenidoTypescriptDesdeFilas(array $filas): string
    {
        $lineas = [
            '// Generado por `php artisan errores:catalogo`; no editar a mano.',
            '',
            'export const CODIGOS_ERROR = [',
        ];

        foreach ($filas as $fila) {
            $lineas[] = "  '{$fila['error_code']}',";
        }

        $lineas[] = '] as const;';
        $lineas[] = '';
        $lineas[] = 'export type CodigoError = (typeof CODIGOS_ERROR)[number];';

        return implode("\n", $lineas)."\n";
    }

    private function rutaMarkdown(): string
    {
        return dirname(base_path()).DIRECTORY_SEPARATOR.'docs'.DIRECTORY_SEPARATOR.'estandares'.DIRECTORY_SEPARATOR.'catalogo_error_code.md';
    }

    private function rutaTypescript(): string
    {
        return dirname(base_path()).DIRECTORY_SEPARATOR.'frontend'.DIRECTORY_SEPARATOR.'libs'.DIRECTORY_SEPARATOR.'ui-shared'.DIRECTORY_SEPARATOR.'src'.DIRECTORY_SEPARATOR.'lib'.DIRECTORY_SEPARATOR.'errores'.DIRECTORY_SEPARATOR.'codigos-error.ts';
    }

    private function rutaRelativa(string $ruta): string
    {
        return str_replace('\\', '/', Str::after($ruta, dirname(base_path()).DIRECTORY_SEPARATOR));
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
