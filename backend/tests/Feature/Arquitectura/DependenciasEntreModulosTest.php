<?php

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use Tests\TestCase;

class DependenciasEntreModulosTest extends TestCase
{
    /**
     * Grafo permitido entre los modulos base (backend/README.md, "Direcciones de
     * dependencia").
     *
     * @var array<string, list<string>>
     */
    private const GRAFO = [
        'Nucleo' => [],
        'Inventario' => [],
        'Crm' => [],
        'Precios' => ['Inventario'],
        'Tpv' => ['Crm', 'Inventario', 'Precios'],
        'Apartados' => ['Crm', 'Inventario', 'Precios', 'Tpv'],
        'Devoluciones' => ['Inventario', 'Tpv'],
        'Gastos' => ['Tpv'],
    ];

    /**
     * Modulos de extension: pueden depender de cualquier modulo base (GRAFO), nunca
     * entre si, y ningun modulo base depende de ellos (decision del responsable,
     * 2026-10-30).
     *
     * @var list<string>
     */
    private const EXTENSIONES = [
        'Cotizaciones', 'Delivery', 'CuentasCobrar', 'CuentasPagar', 'CrmAvanzado',
        'GiftCards', 'NotasCredito', 'Produccion', 'Payroll', 'Prestamos', 'UnidadesMedida',
    ];

    /** @var list<string> */
    private const TRANSVERSALES = ['Nucleo', 'Configuracion', 'Auditoria'];

    /**
     * Violaciones reales que este test revisa y que se dejan como deuda, cada una con
     * su motivo. No se agregan entradas nuevas: se corrigen.
     *
     * @var array<string, string>
     */
    private const PENDIENTES = [
        'app/Modules/Crm/Http/Controllers/PlanPagoController.php|Tpv|Models\Venta' => 'Crm lee Venta de Tpv, en sentido contrario al grafo (Tpv -> Crm): ciclo.',
        'app/Modules/Tpv/Http/Controllers/CajaController.php|Gastos|Services\GastoService' => 'CajaController::actual usa GastoService (Tpv -> Gastos); solo cerrar() paso a Action en C11.',
    ];

    public function test_las_dependencias_entre_modulos_respetan_el_grafo(): void
    {
        $infracciones = [];

        foreach (File::allFiles(app_path('Modules')) as $archivo) {
            if ($archivo->getExtension() !== 'php') {
                continue;
            }

            $ruta = str_replace('\\', '/', Str::after($archivo->getPathname(), base_path().DIRECTORY_SEPARATOR));
            $rutaModulo = explode('/', $ruta)[2] ?? null;

            if ($rutaModulo === null) {
                continue;
            }

            $esControlador = str_contains($ruta, '/Http/Controllers/');
            $esArchivoServicio = str_contains($ruta, '/Services/');
            $lineas = file($archivo->getPathname());

            foreach ($lineas as $linea) {
                if (preg_match('/^use App\\\\Modules\\\\([^\\\\]+)\\\\([^;]+);/', $linea, $m)) {
                    $destino = $m[1];
                    $simbolo = $m[2];

                    if ($destino === $rutaModulo) {
                        continue;
                    }

                    $esTransversal = in_array($destino, self::TRANSVERSALES, true)
                        || str_starts_with($simbolo, 'Support\\Reglas');
                    $esServicio = str_starts_with($simbolo, 'Services\\');
                    $esModelo = str_starts_with($simbolo, 'Models\\');
                    $permitido = in_array($destino, self::GRAFO[$rutaModulo] ?? [], true)
                        || (in_array($rutaModulo, self::EXTENSIONES, true) && array_key_exists($destino, self::GRAFO));

                    if ($rutaModulo === 'Gastos' && $destino === 'Tpv' && $esServicio) {
                        $permitido = false;
                    }

                    $clave = $ruta.'|'.$destino.'|'.$simbolo;
                    $pendiente = isset(self::PENDIENTES[$clave]);

                    if ($esServicio && $esArchivoServicio && ! $esTransversal && ! $permitido && ! $pendiente) {
                        $infracciones[] = "{$ruta}: servicio importa {$destino}\\{$simbolo} fuera del grafo.";
                    }

                    if ($esControlador && ($esServicio || $esModelo) && ! $esTransversal && ! $permitido && ! $pendiente) {
                        $infracciones[] = "{$ruta}: controlador importa {$destino}\\{$simbolo} fuera del grafo.";
                    }
                }

                if (preg_match('/^use App\\\\Aplicacion\\\\/', $linea) && ! $esControlador) {
                    $infracciones[] = "{$ruta}: solo los controladores pueden importar App\\Aplicacion.";
                }
            }
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }
}
