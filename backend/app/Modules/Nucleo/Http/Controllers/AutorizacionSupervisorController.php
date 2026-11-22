<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Controllers;

use App\Aplicacion\Supervisor\Supervisor;
use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Http\Requests\AutorizarSupervisorRequest;
use App\Modules\Nucleo\Http\Requests\ListarSupervisoresRequest;
use App\Modules\Nucleo\Http\Resources\AutorizacionSupervisorResource;
use App\Modules\Nucleo\Http\Resources\SupervisorDisponibleResource;
use App\Modules\Nucleo\Http\Support\OperacionSupervisorHttp;
use App\Modules\Nucleo\Models\Usuario;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

final class AutorizacionSupervisorController extends Controller
{
    public function disponibles(ListarSupervisoresRequest $request, Supervisor $supervisor): AnonymousResourceCollection
    {
        $usuario = $request->user();
        abort_unless($usuario instanceof Usuario, 401);

        return SupervisorDisponibleResource::collection($supervisor->disponibles($usuario, $request->toDto()));
    }

    public function store(AutorizarSupervisorRequest $request, Supervisor $supervisor): JsonResponse
    {
        $usuario = $request->user();
        abort_unless($usuario instanceof Usuario, 401);

        $autorizacion = $supervisor->emitir($usuario, $request->toDto(), OperacionSupervisorHttp::sesion($request));

        return (new AutorizacionSupervisorResource($autorizacion))->response()->setStatusCode(201);
    }
}
