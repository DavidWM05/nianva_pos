<?php

namespace Tests\Feature\Arquitectura;

use App\Modules\Nucleo\Http\Middleware\ModuloActivo;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class RutasDeModulosOpcionalesTest extends TestCase
{
    /** @var array<string, string> */
    private const MODULOS = [
        'Cotizaciones' => 'cotizaciones',
        'CuentasCobrar' => 'cxc',
        'CuentasPagar' => 'cxp',
        'CrmAvanzado' => 'crm_avanzado',
        'Delivery' => 'delivery',
        'GiftCards' => 'gift_cards',
        'NotasCredito' => 'notas_credito',
        'Produccion' => 'produccion',
        'VentasPlazos' => 'ventas_plazos',
        'Payroll' => 'payroll',
        'Prestamos' => 'prestamos',
    ];

    /** @var array<string, string> */
    private const EXENTAS = [
        'UnidadesMedida' => 'No tiene feature gate a proposito: es catalogo base compartido.',
    ];

    /** @var list<string> */
    private const BASE = [
        'Nucleo', 'Configuracion', 'Auditoria', 'Inventario', 'Crm',
        'Precios', 'Tpv', 'Apartados', 'Devoluciones', 'Gastos',
    ];

    public function test_toda_ruta_de_un_modulo_opcional_lleva_su_modulo(): void
    {
        $infracciones = [];

        foreach (Route::getRoutes() as $route) {
            $accion = $route->getActionName();

            if (preg_match('/^App\\\\Modules\\\\([^\\\\]+)\\\\/', $accion, $coincidencia) !== 1) {
                continue;
            }

            $modulo = $coincidencia[1];

            if (isset(self::EXENTAS[$modulo]) || ! isset(self::MODULOS[$modulo])) {
                continue;
            }

            $slug = self::MODULOS[$modulo];

            if (! in_array('modulo:'.$slug, $route->gatherMiddleware(), true)) {
                $infracciones[] = "{$route->methods()[0]} /{$route->uri()}: {$modulo} no lleva modulo:{$slug}.";
            }
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }

    public function test_todos_los_modulos_opcionales_estan_en_el_mapa(): void
    {
        $infracciones = [];

        foreach (self::MODULOS as $modulo => $slug) {
            if (! in_array($slug, ModuloActivo::MODULOS_DEFAULT, true)) {
                $infracciones[] = "{$modulo}: slug {$slug} no existe en ModuloActivo::MODULOS_DEFAULT.";
            }
        }

        foreach (File::directories(app_path('Modules')) as $directorio) {
            $modulo = basename($directorio);

            if (in_array($modulo, self::BASE, true)
                || isset(self::MODULOS[$modulo])
                || isset(self::EXENTAS[$modulo])) {
                continue;
            }

            $infracciones[] = "{$modulo}: modulo opcional sin entrada en MODULOS o EXENTAS.";
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }
}
