<?php

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Tests\TestCase;

class EntradasTipadasTest extends TestCase
{
    /**
     * Ya no quedan controllers pendientes. Cualquier controller que vuelva a
     * validar en linea hace fallar el test.
     *
     * @var array<string, string>
     */
    private const PENDIENTES = [];

    public function test_los_controladores_no_validan_en_linea(): void
    {
        $infracciones = [];

        foreach ($this->archivosControladores() as $archivo) {
            $ruta = $this->rutaRelativa($archivo->getPathname());
            $contenido = file_get_contents($archivo->getPathname());

            if ($contenido === false) {
                continue;
            }

            $validaEnLinea = preg_match('/->validate\\(|Validator::make/', $contenido) === 1;

            if ($validaEnLinea && ! array_key_exists($ruta, self::PENDIENTES)) {
                $infracciones[] = "{$ruta}: valida en linea; debe usar un FormRequest.";
            }

            if (! $validaEnLinea && array_key_exists($ruta, self::PENDIENTES)) {
                $infracciones[] = "{$ruta}: sigue en PENDIENTES pero ya no valida en linea.";
            }
        }

        foreach (array_keys(self::PENDIENTES) as $ruta) {
            if (! is_file(base_path($ruta))) {
                $infracciones[] = "{$ruta}: PENDIENTES apunta a un archivo inexistente.";
            }
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }

    public function test_los_form_requests_extienden_solicitud_negocio(): void
    {
        $infracciones = [];

        foreach (File::allFiles(app_path()) as $archivo) {
            if ($archivo->getExtension() !== 'php') {
                continue;
            }

            $contenido = file_get_contents($archivo->getPathname());

            if ($contenido === false) {
                continue;
            }

            if (preg_match('/class\\s+([A-Za-z_][A-Za-z0-9_]*)\\s+extends\\s+FormRequest/', $contenido, $coincidencia) !== 1) {
                continue;
            }

            if ($coincidencia[1] === 'SolicitudNegocio') {
                continue;
            }

            $infracciones[] = $this->rutaRelativa($archivo->getPathname())
                .": {$coincidencia[1]} extiende FormRequest directamente; debe extender SolicitudNegocio.";
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }

    /**
     * @return list<\SplFileInfo>
     */
    private function archivosControladores(): array
    {
        return collect(File::allFiles(app_path('Modules')))
            ->filter(fn (\SplFileInfo $archivo) => $archivo->getExtension() === 'php'
                && str_contains(str_replace('\\', '/', $archivo->getPathname()), '/Http/Controllers/'))
            ->values()
            ->all();
    }

    private function rutaRelativa(string $ruta): string
    {
        return str_replace('\\', '/', Str::after($ruta, base_path().DIRECTORY_SEPARATOR));
    }
}
