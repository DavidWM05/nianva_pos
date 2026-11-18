<?php

namespace App\Modules\Inventario\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Nucleo\Support\SucursalOperacion;

/**
 * Solo lectura -- kardex se escribe unicamente desde
 * InventarioService (movimientos y saldo inicial). Sin paginacion (igual que
 * VentaController::porCliente en Crm): es historial de contexto para la
 * vista de registro, no un reporte.
 */
class KardexController extends Controller
{
    public function porVariante(ProductoVariante $variante)
    {
        $usuario = request()->user();
        $sucursalId = $usuario instanceof Usuario ? SucursalOperacion::paraFiltro($usuario, null) : null;

        // DAT-05: el listado no muestra el saldo inicial en cero, que solo marca el arranque del
        // libro; la base los guarda todos y conciliar:libros los exige. Un saldo inicial con
        // cantidad (carga inicial) sí se lista. El filtro va solo aquí, no en el modelo.
        $consulta = Kardex::where('variante_id', $variante->id)
            ->where(fn ($q) => $q->where('motivo', '!=', 'saldo_inicial')->orWhere('cantidad', '!=', 0))
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
                'cantidad' => DecimalApi::cantidad($movimiento->cantidad),
                'motivo' => $movimiento->motivo,
                'sucursal_nombre' => $movimiento->sucursal?->nombre,
                'usuario_nombre' => $movimiento->usuario?->nombre,
                'stock_antes' => DecimalApi::cantidad($movimiento->stock_antes),
                'stock_despues' => DecimalApi::cantidad($movimiento->stock_despues),
                'fecha' => $movimiento->fecha,
            ]);

        return response()->json(['data' => $movimientos]);
    }
}
