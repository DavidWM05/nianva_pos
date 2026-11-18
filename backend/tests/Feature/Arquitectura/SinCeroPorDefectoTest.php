<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use Illuminate\Support\Facades\File;
use Tests\TestCase;

/**
 * DAT-03: la foto de una línea nunca se completa con `?? 0` ni `?: 0`; si falta el dato, la
 * operación falla. Busca esos patrones (sin comentarios) en app/Aplicacion y en los Services de
 * dominio. PENDIENTES lista, por archivo, los usos que no son foto con su razón y su cantidad
 * exacta: solo baja, y cuando un archivo baja su cantidad hay que bajarla aquí.
 */
class SinCeroPorDefectoTest extends TestCase
{
    private const PATRON = '/\?\?\s*0(\.0+)?\b|\?:\s*0(\.0+)?\b/';

    /** @var array<string, array{0: int, 1: string}> */
    private const PENDIENTES = [
        'app/Aplicacion/Produccion/CambiarEstadoOrden.php' => [1, 'cantidad producida opcional de la orden; no es foto de línea.'],
        'app/Aplicacion/Ventas/RegistrarVenta.php' => [2, 'descuento de cupón del encabezado y monto de nota de crédito entre los pagos; no son foto de línea.'],
        'app/Modules/Cotizaciones/Services/CotizacionService.php' => [1, 'descuento global opcional del encabezado; no es foto de línea.'],
        'app/Modules/Delivery/Services/PedidoService.php' => [2, 'congelado, cambio mínimo.'],
        'app/Modules/GiftCards/Services/GiftCardService.php' => [1, 'validación del monto de una recarga; no es foto de línea.'],
        'app/Modules/Payroll/Services/NominaService.php' => [1, 'congelado, cambio mínimo.'],
        'app/Modules/Precios/Services/PricingService.php' => [7, 'cantidades de compra y paga de la regla, nullables según su tipo (nxm, bundle); no son foto.'],
        'app/Modules/Prestamos/Services/PrestamoService.php' => [2, 'congelado, cambio mínimo.'],
        'app/Modules/Produccion/Services/ProduccionService.php' => [1, 'acumulador de necesidades de insumos; no es foto de línea.'],
        'app/Modules/Tpv/Services/ResolverCodigoVenta.php' => [1, 'stock mostrado al escanear un código (sin fila = 0 en existencia); no es foto de línea.'],
        'app/Modules/Tpv/Services/VentaService.php' => [3, 'abono previo, descuento manual y descuento de cupón del encabezado; no son foto de línea.'],
        'app/Modules/VentasPlazos/Services/VentasPlazosService.php' => [2, 'número de cuotas y tasa opcionales del plan; no son foto de línea.'],
    ];

    public function test_no_hay_cero_por_defecto_fuera_de_pendientes(): void
    {
        $infracciones = [];
        $encontrados = [];

        foreach ($this->archivos() as $ruta) {
            $cantidad = $this->usos(File::get(base_path($ruta)));
            if ($cantidad === 0) {
                continue;
            }

            $encontrados[$ruta] = $cantidad;
            $permitido = self::PENDIENTES[$ruta][0] ?? 0;
            if ($cantidad > $permitido) {
                $infracciones[] = "{$ruta}: {$cantidad} usos de `?? 0`/`?: 0`, permitidos {$permitido}. Si falta el dato de una foto, la operación falla con una ExcepcionNegocio.";
            }
        }

        foreach (self::PENDIENTES as $ruta => [$permitido]) {
            $cantidad = $encontrados[$ruta] ?? 0;
            if ($cantidad < $permitido) {
                $infracciones[] = "{$ruta}: bajó a {$cantidad} usos; baja PENDIENTES a {$cantidad} (o quita el archivo).";
            }
        }

        $this->assertSame([], $infracciones, implode("\n", $infracciones));
    }

    public function test_cada_pendiente_tiene_razon(): void
    {
        foreach (self::PENDIENTES as $ruta => [$cantidad, $razon]) {
            $this->assertGreaterThan(0, $cantidad, $ruta);
            $this->assertNotSame('', trim($razon), $ruta);
            $this->assertFileExists(base_path($ruta));
        }
    }

    /** @return list<string> */
    private function archivos(): array
    {
        $rutas = [];
        $directorios = [base_path('app/Aplicacion'), ...glob(base_path('app/Modules/*/Services'), GLOB_ONLYDIR) ?: []];

        foreach ($directorios as $directorio) {
            foreach (File::allFiles($directorio) as $archivo) {
                if ($archivo->getExtension() === 'php') {
                    $rutas[] = str_replace('\\', '/', substr($archivo->getPathname(), strlen(base_path()) + 1));
                }
            }
        }

        sort($rutas);

        return $rutas;
    }

    /** Cuenta los usos en el código, sin comentarios. */
    private function usos(string $codigo): int
    {
        $sinComentarios = '';
        foreach (token_get_all($codigo) as $token) {
            if (is_array($token) && in_array($token[0], [T_COMMENT, T_DOC_COMMENT], true)) {
                continue;
            }
            $sinComentarios .= is_array($token) ? $token[1] : $token;
        }

        return preg_match_all(self::PATRON, $sinComentarios);
    }
}
