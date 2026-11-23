<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use App\Modules\CrmAvanzado\Http\Controllers\CrmAvanzadoController;
use App\Modules\CuentasCobrar\Http\Controllers\CuentaCobrarController;
use App\Modules\CuentasPagar\Http\Controllers\CuentaPagarController;
use App\Modules\Nucleo\Http\Controllers\InicioController;
use App\Modules\Tpv\Http\Controllers\VentaController;
use ReflectionMethod;
use Tests\TestCase;

final class ConsultasDeReportesTest extends TestCase
{
    public function test_los_controladores_delegan_las_consultas_y_los_agregados_de_reportes(): void
    {
        foreach ([
            [VentaController::class, 'reporte'],
            [CuentaCobrarController::class, 'reporte'],
            [CuentaPagarController::class, 'reporte'],
            [CrmAvanzadoController::class, 'reporte'],
            [InicioController::class, 'resumen'],
        ] as [$clase, $nombre]) {
            $metodo = new ReflectionMethod($clase, $nombre);
            $archivo = $metodo->getFileName();
            self::assertNotFalse($archivo);
            $lineas = file($archivo);
            self::assertNotFalse($lineas);

            $inicio = $metodo->getStartLine();
            $fin = $metodo->getEndLine();
            $cuerpo = implode('', array_slice($lineas, $inicio - 1, $fin - $inicio + 1));
            self::assertMatchesRegularExpression('/->ejecutar\(/', $cuerpo, "{$clase}::{$nombre}");
            self::assertDoesNotMatchRegularExpression('/::(?:query|where|table)\(|->(?:sum|count|avg|selectRaw|groupBy)\(/', $cuerpo, "{$clase}::{$nombre}");
        }
    }
}
