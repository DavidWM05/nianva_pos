<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Aplicacion\Planes\CuotasPlan;
use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Services\TenantContext;

/**
 * Catalogo de apoyo simple a proposito (ver CategoriaController antes de
 * su CRUD, Fase C): lo unico que necesita el selector de sucursal del
 * formulario de Usuario. CRUD completo de Sucursal queda fuera de
 * alcance de esta fase -- Tenant/Sucursal son administracion de MAS alto
 * nivel (multi-tenant), no parte de lo pedido (Usuarios/Roles/Metodos de
 * pago/Categorias/Departamentos/Inicio/Auditoria).
 */
class SucursalController extends Controller
{
    public function index(TenantContext $tenant, CuotasPlan $cuotas)
    {
        $tenantId = $tenant->id();

        return response()->json([
            'data' => Sucursal::where('activo', true)->orderBy('nombre')->get(['id', 'nombre']),
            'meta' => ['limite' => $tenantId === null ? null : $cuotas->estado($tenantId)['sucursales']],
        ]);
    }
}
