<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Http\Controllers;

use App\Aplicacion\Inventario\RegistrarCompra;
use App\Http\Controllers\Controller;
use App\Modules\Inventario\Http\Requests\RegistrarCompraRequest;

/**
 * Unica puerta HTTP para registrar compras, mediante RegistrarCompra. Antes de
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
    public function store(RegistrarCompraRequest $request, RegistrarCompra $registrarCompra)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $compra = $registrarCompra->ejecutar($request->toDto(), $usuario);

        return response()->json(['data' => ['id' => $compra->id, 'total' => $compra->total]], 201);
    }
}
