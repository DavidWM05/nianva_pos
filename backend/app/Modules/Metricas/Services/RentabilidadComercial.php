<?php

declare(strict_types=1);

namespace App\Modules\Metricas\Services;

use App\Modules\Devoluciones\Models\DevolucionItem;
use App\Modules\Metricas\Valores\ContextoMetricas;
use App\Modules\Nucleo\Support\Cantidad;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Tpv\Models\VentaDetalle;

final readonly class RentabilidadComercial
{
    public function __construct(private VentasComerciales $ventas) {}

    /** @return array{ingreso_sin_iva: string, costo_neto_ventas: string, utilidad_bruta: string, margen_porcentaje: ?string, merma: string, resultado_despues_merma: string, lineas_sin_costo: int} */
    public function totales(ContextoMetricas $contexto, Dinero $netoComercial): array
    {
        $iva = $costo = $merma = Dinero::desde(0);
        $sinCosto = 0;

        $ventas = $this->ventas->ventas($contexto)->select('id');
        foreach (VentaDetalle::query()->whereIn('venta_id', $ventas)->lazyById() as $linea) {
            $iva = $iva->sumar(Dinero::desde($linea->impuesto));
            $costo = $costo->sumar($this->costo($linea));
            $sinCosto += DecimalApi::costoUnitario($linea->costo_unitario) === '0.0000' ? 1 : 0;
        }

        $devoluciones = $this->ventas->devoluciones($contexto)->select('id');
        foreach (DevolucionItem::query()->whereIn('devolucion_id', $devoluciones)->lazyById() as $linea) {
            $ivaLinea = Dinero::desde($linea->impuesto);
            $costoLinea = $this->costo($linea);
            $sinCosto += DecimalApi::costoUnitario($linea->costo_unitario) === '0.0000' ? 1 : 0;
            if ($linea->tipo === 'nuevo') {
                $iva = $iva->sumar($ivaLinea);
                $costo = $costo->sumar($costoLinea);

                continue;
            }

            $iva = $iva->restar($ivaLinea);
            $costo = $costo->restar($costoLinea);
            if ($linea->va_a_merma) {
                $merma = $merma->sumar($costoLinea);
            }
        }

        $ingreso = $netoComercial->restar($iva);
        $utilidad = $ingreso->restar($costo);

        return [
            'ingreso_sin_iva' => $ingreso->aCadena(),
            'costo_neto_ventas' => $costo->aCadena(),
            'utilidad_bruta' => $utilidad->aCadena(),
            'margen_porcentaje' => $ingreso->centavos > 0 ? $utilidad->proporcion(10000, $ingreso->centavos)->aCadena() : null,
            'merma' => $merma->aCadena(),
            'resultado_despues_merma' => $utilidad->restar($merma)->aCadena(),
            'lineas_sin_costo' => $sinCosto,
        ];
    }

    private function costo(VentaDetalle|DevolucionItem $linea): Dinero
    {
        $cantidadBase = Cantidad::multiplicar($linea->cantidad, $linea->factor);

        return Dinero::desdeProducto($linea->costo_unitario, Cantidad::cadena($cantidadBase));
    }
}
