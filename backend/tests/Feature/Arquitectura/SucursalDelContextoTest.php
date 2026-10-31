<?php

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Tests\TestCase;

class SucursalDelContextoTest extends TestCase
{
    /**
     * Atributos de una entidad, no la sucursal de una operacion (SEG-02).
     * La clave incluye el metodo para no eximir al resto del archivo.
     *
     * @var array<string, string>
     */
    private const ATRIBUTOS = [
        'app/Modules/Nucleo/Http/Requests/GuardarUsuarioRequest.php::rules' => 'Asigna la sucursal de un usuario; es atributo del usuario, no la sucursal de la operacion.',
        'app/Modules/Payroll/Http/Requests/CrearEmpleadoRequest.php::rules' => 'Asigna la sucursal de un empleado; es atributo del empleado, no la sucursal de la operacion.',
    ];

    public function test_las_reglas_de_sucursal_id_usan_el_resolvedor_del_contexto(): void
    {
        $infracciones = [];

        foreach ($this->archivosConControladoresYAcciones() as $archivo) {
            $contenido = file_get_contents($archivo->getPathname());

            if ($contenido === false) {
                continue;
            }

            if (preg_match_all("/'sucursal_id'\\s*=>\\s*(?:\\[|'[^']*(?:required|nullable|integer|exists)[^']*')/", $contenido, $coincidencias, PREG_OFFSET_CAPTURE) === 0) {
                continue;
            }

            $ruta = str_replace('\\', '/', Str::after($archivo->getPathname(), base_path().DIRECTORY_SEPARATOR));

            foreach ($coincidencias[0] as [$texto, $offset]) {
                $metodo = $this->metodoEn($contenido, $offset);
                $clave = $ruta.'::'.$metodo;

                if (array_key_exists($clave, self::ATRIBUTOS)) {
                    continue;
                }

                if (! str_contains($contenido, 'SucursalOperacion::')) {
                    $infracciones[] = "{$clave}: declara una regla de sucursal_id sin SucursalOperacion.";
                }
            }
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }

    /**
     * @return list<\SplFileInfo>
     */
    private function archivosConControladoresYAcciones(): array
    {
        $controladores = collect(File::allFiles(app_path('Modules')))
            ->filter(fn (\SplFileInfo $archivo) => $archivo->getExtension() === 'php'
                && str_contains(str_replace('\\', '/', $archivo->getPathname()), '/Http/Controllers/'));

        $requests = collect(File::allFiles(app_path('Modules')))
            ->filter(fn (\SplFileInfo $archivo) => $archivo->getExtension() === 'php'
                && str_contains(str_replace('\\', '/', $archivo->getPathname()), '/Http/Requests/'));

        $acciones = collect(File::allFiles(app_path('Aplicacion')))
            ->filter(fn (\SplFileInfo $archivo) => $archivo->getExtension() === 'php');

        return $controladores->merge($requests)->merge($acciones)->values()->all();
    }

    private function metodoEn(string $contenido, int $offset): string
    {
        $antes = substr($contenido, 0, $offset);

        if (preg_match_all('/function\\s+([A-Za-z_][A-Za-z0-9_]*)\\s*\\(/', $antes, $metodos) === 0) {
            return 'desconocido';
        }

        return (string) end($metodos[1]);
    }
}
