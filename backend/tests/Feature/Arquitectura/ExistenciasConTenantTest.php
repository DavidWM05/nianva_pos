<?php

namespace Tests\Feature\Arquitectura;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ExistenciasConTenantTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Tablas sin tenant_id propio: el scope se aplica por su relacion.
     *
     * @var list<string>
     */
    private const TABLAS_RELACION = [
        'producto_variantes',
        'planes_pago_cliente_cuotas',
        'caja_sesiones',
    ];

    /**
     * Tablas globales del sistema: no pertenecen a ningun tenant.
     *
     * @var array<string, string>
     */
    private const TABLAS_GLOBALES = [
        'permisos' => 'Catalogo global de permisos del sistema, compartido por todos los tenants.',
    ];

    public function test_las_reglas_exists_de_los_controladores_filtran_por_tenant(): void
    {
        $infracciones = [];

        foreach ($this->archivosHttp() as $archivo) {
            $contenido = File::get($archivo);
            $ruta = str_replace(base_path().DIRECTORY_SEPARATOR, '', $archivo);

            preg_match_all('/exists:([a-z_]+)/', $contenido, $coincidencias);

            foreach ($coincidencias[1] as $tabla) {
                if (isset(self::TABLAS_GLOBALES[$tabla])) {
                    continue;
                }

                if (in_array($tabla, self::TABLAS_RELACION, true) || Schema::hasColumn($tabla, 'tenant_id')) {
                    $infracciones[] = "{$ruta}: regla exists:{$tabla} sin filtro de tenant.";
                } else {
                    $infracciones[] = "{$ruta}: tabla '{$tabla}' sin clasificar; agregarla a TABLAS_RELACION o TABLAS_GLOBALES.";
                }
            }

            preg_match_all('/Rule::exists\(\s*[\'"]([a-z_]+)[\'"]/', $contenido, $reglas, PREG_OFFSET_CAPTURE);

            foreach ($reglas[1] as $indice => $tabla) {
                $offset = $reglas[0][$indice][1];
                $expresion = substr($contenido, $offset, 500);
                $expresion = substr($expresion, 0, strcspn($expresion, '];'));

                if (str_contains($expresion, '->where')) {
                    continue;
                }

                $nombre = $tabla[0];

                if (in_array($nombre, self::TABLAS_RELACION, true) || Schema::hasColumn($nombre, 'tenant_id')) {
                    $infracciones[] = "{$ruta}: Rule::exists('{$nombre}') sin ->where de tenant.";
                }
            }
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }

    /**
     * @return list<string>
     */
    private function archivosHttp(): array
    {
        $archivos = [];

        foreach (File::allFiles(app_path('Modules')) as $archivo) {
            if ($archivo->getExtension() !== 'php') {
                continue;
            }

            if (! str_contains($archivo->getPathname(), DIRECTORY_SEPARATOR.'Http'.DIRECTORY_SEPARATOR)) {
                continue;
            }

            $archivos[] = $archivo->getPathname();
        }

        return $archivos;
    }
}
