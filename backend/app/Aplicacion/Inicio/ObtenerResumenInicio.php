<?php

namespace App\Aplicacion\Inicio;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Tpv\Models\Venta;

/**
 * Caso de uso de resumen de inicio que cruza Nucleo con Tpv y Apartados
 * (ARQ-03). Solo lectura: no abre transaccion.
 */
class ObtenerResumenInicio
{
    private const DIAS_ALERTA_VENCIMIENTO = 7;

    /**
     * @return array{ventas_hoy: array{cantidad: int, total: float}, apartados_por_vencer: mixed}
     */
    public function ejecutar(?int $sucursalId): array
    {
        $ventasHoy = Venta::whereDate('fecha', today())
            ->where('es_venta_sombra', false)
            ->where('estado', '!=', 'anulada')
            ->when($sucursalId, fn ($query) => $query->where('sucursal_id', $sucursalId));

        $apartadosPorVencer = Apartado::where('estado', 'activo')
            ->whereNotNull('fecha_vencimiento')
            ->where('fecha_vencimiento', '<=', today()->addDays(self::DIAS_ALERTA_VENCIMIENTO))
            ->when($sucursalId, fn ($query) => $query->where('sucursal_id', $sucursalId))
            ->with('cliente:id,nombre')
            ->orderBy('fecha_vencimiento')
            ->limit(10)
            ->get();

        return [
            'ventas_hoy' => [
                'cantidad' => (clone $ventasHoy)->count(),
                'total' => round((float) (clone $ventasHoy)->sum('total'), 2),
            ],
            'apartados_por_vencer' => $apartadosPorVencer->map(fn (Apartado $apartado) => [
                'id' => $apartado->id,
                'cliente_nombre' => $apartado->cliente?->nombre,
                'fecha_vencimiento' => $apartado->fecha_vencimiento,
                'total' => $apartado->total,
                'total_abonado' => $apartado->total_abonado,
            ]),
        ];
    }
}
