<?php

namespace App\Modules\Inventario\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Inventario\Support\ReglasVariante;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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
    public function store(Request $request, InventarioService $inventarioService)
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'proveedor_id' => ['required', 'integer', Rule::exists('proveedores', 'id')->where('tenant_id', $tenantId)],
            'numero_comprobante' => ['nullable', 'string', 'max:60'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.variante_id' => ['required', 'integer', ReglasVariante::delTenant($tenantId)],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
            'items.*.precio_compra' => ['required', 'numeric', 'min:0'],
        ]);

        $usuario = $request->user();

        $compra = $inventarioService->registrarCompra(
            [
                'tenant_id' => $tenantId,
                'proveedor_id' => $validated['proveedor_id'],
                'sucursal_id' => $usuario->sucursal_id,
                'usuario_id' => $usuario->id,
                'numero_comprobante' => $validated['numero_comprobante'] ?? null,
            ],
            $validated['items'],
        );

        return response()->json(['data' => ['id' => $compra->id, 'total' => $compra->total]], 201);
    }
}
