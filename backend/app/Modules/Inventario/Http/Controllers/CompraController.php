<?php

namespace App\Modules\Inventario\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventario\Dtos\LineaCompraDto;
use App\Modules\Inventario\Http\Requests\RegistrarCompraRequest;
use App\Modules\Inventario\Services\InventarioService;

/**
 * Unica puerta HTTP hacia InventarioService::registrarCompra(). Antes de
 * este controller, el metodo existia y se llamaba desde varios tests de
 * OTROS modulos (Apartados/Devoluciones/Tpv) solo para sembrar stock de
 * prueba -- nunca desde una ruta HTTP real. No habia forma de ingresar
 * stock a ningun producto/variante desde la app.
 *
 * sucursal_id/usuario_id/tenant_id SIEMPRE salen de $request->user(),
 * nunca del payload -- mismo criterio que CajaController::abrir().
 */
class CompraController extends Controller
{
    public function store(RegistrarCompraRequest $request, InventarioService $inventarioService)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $dto = $request->toDto();
        $items = array_map(
            fn (LineaCompraDto $item) => [
                'variante_id' => $item->varianteId,
                'cantidad' => $item->cantidad,
                'precio_compra' => $item->precioCompra,
            ],
            $dto->items,
        );

        $compra = $inventarioService->registrarCompra(
            [
                'tenant_id' => (int) $usuario->getAttribute('tenant_id'),
                'proveedor_id' => $dto->proveedorId,
                'sucursal_id' => (int) $usuario->getAttribute('sucursal_id'),
                'usuario_id' => $usuario->id,
                'numero_comprobante' => $dto->numeroComprobante,
            ],
            $items,
        );

        return response()->json(['data' => ['id' => $compra->id, 'total' => $compra->total]], 201);
    }
}
