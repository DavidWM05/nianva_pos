<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Controllers;

use App\Aplicacion\Caja\ConsolidarCajas;
use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Tpv\Http\Requests\FechaConsolidadoCajaRequest;
use App\Modules\Tpv\Http\Resources\ConsolidadoCajaResource;
use Illuminate\Http\JsonResponse;

final class ConsolidadoCajaController extends Controller
{
    public function show(FechaConsolidadoCajaRequest $request, ConsolidarCajas $consolidar): JsonResponse
    {
        return $this->responder($request, $consolidar, 200);
    }

    public function store(FechaConsolidadoCajaRequest $request, ConsolidarCajas $consolidar): JsonResponse
    {
        return $this->responder($request, $consolidar, 201);
    }

    private function responder(FechaConsolidadoCajaRequest $request, ConsolidarCajas $consolidar, int $status): JsonResponse
    {
        $usuario = $request->user();
        abort_unless($usuario instanceof Usuario, 401);
        $fecha = $request->toDto()->fecha;
        if ($status === 201) {
            $consolidar->ejecutar($usuario, $fecha);
        }

        $resumen = $consolidar->consultar($usuario, $fecha);

        return (new ConsolidadoCajaResource(['fecha_operativa' => $fecha, ...$resumen]))->response()->setStatusCode($status);
    }
}
