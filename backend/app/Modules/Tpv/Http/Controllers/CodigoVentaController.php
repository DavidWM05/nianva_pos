<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Tpv\Http\Requests\BuscarCodigoRequest;
use App\Modules\Tpv\Http\Resources\CodigoVentaResource;
use App\Modules\Tpv\Services\ResolverCodigoVenta;

class CodigoVentaController extends Controller
{
    public function __invoke(BuscarCodigoRequest $request, ResolverCodigoVenta $servicio): CodigoVentaResource
    {
        return new CodigoVentaResource($servicio->resolver($request->toDto()));
    }
}
