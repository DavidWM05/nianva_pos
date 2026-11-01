<?php

namespace App\Modules\Inventario\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\SucursalOperacion;

/**
 * Solo lectura -- kardex se escribe unicamente desde
 * InventarioService::registrarMovimiento(). Sin paginacion (igual que
 * VentaController::porCliente en Crm): es historial de contexto para la
 * vista de registro, no un reporte.
 */
class KardexController extends Controller
{
    public function porVariante(ProductoVariante $variante)
    {
        $usuario = request()->user();
        $sucursalId = $usuario instanceof Usuario ? SucursalOperacion::paraFiltro($usuario, null) : null;

        $consulta = Kardex::where('variante_id', $variante->id)
            ->with(['sucursal:id,nombre', 'usuario:id,nombre,apellido']);

        if ($sucursalId !== null) {
            $consulta->where('sucursal_id', $sucursalId);
        }

        $movimientos = $consulta
            // Desempate por id: dos movimientos pueden caer en el mismo
            // segundo (la columna fecha no guarda microsegundos), el id
            // sigue reflejando el orden real de insercion.
            ->orderByDesc('fecha')
            ->orderByDesc('id')
            ->limit(100)
            ->get()
            ->map(fn (Kardex $movimiento) => [
                'id' => $movimiento->id,
                'tipo' => $movimiento->tipo,
                'cantidad' => $movimiento->cantidad,
                'motivo' => $movimiento->motivo,
                'sucursal_nombre' => $movimiento->sucursal?->nombre,
                'usuario_nombre' => $movimiento->usuario?->nombre,
                'stock_resultante' => $movimiento->stock_resultante,
                'fecha' => $movimiento->fecha,
            ]);

        return response()->json(['data' => $movimientos]);
    }
}
