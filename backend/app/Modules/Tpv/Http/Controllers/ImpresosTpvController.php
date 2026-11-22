<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\SucursalOperacion;
use App\Modules\Tpv\Http\Resources\ImpresoCorteResource;
use App\Modules\Tpv\Http\Resources\ImpresoVentaResource;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Http\Request;

final class ImpresosTpvController extends Controller
{
    public function venta(Request $request, Venta $venta): ImpresoVentaResource
    {
        $this->autorizarSucursal($request, (int) $venta->getAttribute('sucursal_id'));

        return new ImpresoVentaResource($venta->load(['sucursal', 'usuario', 'detalles.variante.producto', 'detalles.variante.valoresAtributo.valor.atributo', 'pagos.metodoPago']));
    }

    public function corte(Request $request, CajaSesion $cajaSesion): ImpresoCorteResource
    {
        $this->autorizarSucursal($request, (int) $cajaSesion->getAttribute('sucursal_id'));
        abort_unless($cajaSesion->getAttribute('estado') === 'cerrada', 404);

        return new ImpresoCorteResource($cajaSesion->load(['sucursal', 'usuario', 'usuarioCierre', 'cierreMetodos.metodoPago']));
    }

    private function autorizarSucursal(Request $request, int $sucursalId): void
    {
        $usuario = $request->user();
        abort_unless($usuario instanceof Usuario, 401);
        SucursalOperacion::paraEscritura($usuario, $sucursalId);
    }
}
