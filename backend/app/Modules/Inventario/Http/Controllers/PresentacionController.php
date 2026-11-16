<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventario\Http\Requests\GuardarPresentacionRequest;
use App\Modules\Inventario\Http\Resources\PresentacionResource;
use App\Modules\Inventario\Models\Presentacion;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Services\PresentacionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class PresentacionController extends Controller
{
    public function __construct(private readonly PresentacionService $servicio) {}

    public function listar(ProductoVariante $variante): AnonymousResourceCollection
    {
        return PresentacionResource::collection($this->servicio->listar($variante));
    }

    public function store(GuardarPresentacionRequest $request, ProductoVariante $variante): JsonResponse
    {
        return (new PresentacionResource($this->servicio->crear($variante, $request->toDto())))->response()->setStatusCode(201);
    }

    public function update(GuardarPresentacionRequest $request, ProductoVariante $variante, Presentacion $presentacion): PresentacionResource
    {
        return new PresentacionResource($this->servicio->actualizar($variante, $presentacion, $request->toDto()));
    }

    public function destroy(ProductoVariante $variante, Presentacion $presentacion): Response
    {
        $this->servicio->eliminar($variante, $presentacion);

        return response()->noContent();
    }
}
