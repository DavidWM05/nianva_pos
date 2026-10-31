<?php

namespace App\Modules\Inventario\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventario\Http\Requests\CrearProveedorRequest;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Nucleo\Services\TenantContext;

/**
 * Catalogo de apoyo simple a proposito, mismo criterio que
 * CategoriaController/DepartamentoController -- pero SI necesita store()
 * (a diferencia de esos dos): proveedor_id es obligatorio para registrar
 * una compra (ver CompraController/InventarioService::registrarCompra())
 * y, antes de este controller, no existia ningun lugar del sistema donde
 * pudiera crearse un proveedor.
 */
class ProveedorController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => Proveedor::where('activo', true)->orderBy('razon_social')->get(['id', 'razon_social']),
        ]);
    }

    public function store(CrearProveedorRequest $request)
    {
        $datos = $request->toDto()->datos();
        $datos['tenant_id'] = app(TenantContext::class)->id();
        $datos['activo'] = true;

        $proveedor = Proveedor::create($datos);

        return response()->json(['data' => $proveedor->only(['id', 'razon_social'])], 201);
    }
}
