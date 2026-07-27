<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Apartados\Models\Apartado;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Http\Request;

/**
 * Fase C, punto 4: resumen basico de la pantalla de Inicio (antes
 * placeholder). Cruza Tpv (ventas) y Apartados desde un controlador de
 * Nucleo -- tercera instancia del mismo patron ya documentado en
 * CajaController (Tpv->Gastos) y ProductoVarianteController
 * (Inventario->Configuracion): "los Controllers pueden orquestar entre
 * modulos para presentacion/calculo, los Services nunca". El estado de
 * caja NO se duplica aqui -- el frontend ya llama GET /caja/actual por
 * separado (misma logica de CajaService, no vale la pena reimplementarla).
 *
 * Permiso: reportes.ver, ya sembrado mas sin usar en ningun controlador
 * hasta ahora -- encaja mejor que crear uno nuevo tipo "inicio.ver" para
 * una sola pantalla de resumen.
 */
class InicioController extends Controller
{
    private const DIAS_ALERTA_VENCIMIENTO = 7;

    public function resumen(Request $request)
    {
        $sucursalId = $request->user()->sucursal_id;

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

        return response()->json([
            'data' => [
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
            ],
        ]);
    }
}
