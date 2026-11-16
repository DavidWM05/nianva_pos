<?php

declare(strict_types=1);

namespace App\Modules\Precios\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Precios\Http\Requests\AsignarListaPrecioClienteRequest;
use App\Modules\Precios\Http\Requests\GuardarListaPrecioItemRequest;
use App\Modules\Precios\Http\Requests\GuardarListaPrecioRequest;
use App\Modules\Precios\Http\Requests\ListarListasPrecioRequest;
use App\Modules\Precios\Http\Resources\ListaPrecioClienteResource;
use App\Modules\Precios\Http\Resources\ListaPrecioItemResource;
use App\Modules\Precios\Http\Resources\ListaPrecioResource;
use App\Modules\Precios\Models\ListaPrecio;
use App\Modules\Precios\Models\ListaPrecioCliente;
use App\Modules\Precios\Models\ListaPrecioItem;
use App\Modules\Precios\Services\ListaPrecioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class ListaPrecioController extends Controller
{
    public function __construct(private readonly ListaPrecioService $servicio) {}

    public function index(ListarListasPrecioRequest $request): AnonymousResourceCollection
    {
        $dto = $request->toDto();
        $pagina = $this->servicio->listar($dto);

        return ListaPrecioResource::collection($pagina->items())->additional(['meta' => ['total' => $pagina->total(), 'page' => $pagina->currentPage(), 'rows' => $pagina->perPage(), 'filtros_aplicados' => ['q' => $dto->q], 'permisos' => $this->permisosDe($request)]]);
    }

    public function disponibles(): AnonymousResourceCollection
    {
        return ListaPrecioResource::collection($this->servicio->disponibles());
    }

    public function show(Request $request, ListaPrecio $lista): ListaPrecioResource
    {
        return (new ListaPrecioResource($lista->load(['items', 'clientes'])))->additional(['meta' => ['permisos' => $this->permisosDe($request)]]);
    }

    public function store(GuardarListaPrecioRequest $request): JsonResponse
    {
        return (new ListaPrecioResource($this->servicio->crear($request->toDto())))->response()->setStatusCode(201);
    }

    public function update(GuardarListaPrecioRequest $request, ListaPrecio $lista): ListaPrecioResource
    {
        return new ListaPrecioResource($this->servicio->actualizar($lista, $request->toDto()));
    }

    public function desactivar(ListaPrecio $lista): ListaPrecioResource
    {
        return new ListaPrecioResource($this->servicio->desactivar($lista));
    }

    public function guardarItem(GuardarListaPrecioItemRequest $request, ListaPrecio $lista): JsonResponse
    {
        return (new ListaPrecioItemResource($this->servicio->guardarItem($lista, $request->toDto())))->response()->setStatusCode(201);
    }

    public function actualizarItem(GuardarListaPrecioItemRequest $request, ListaPrecio $lista, ListaPrecioItem $item): ListaPrecioItemResource
    {
        return new ListaPrecioItemResource($this->servicio->actualizarItem($lista, $item, $request->toDto()));
    }

    public function quitarItem(ListaPrecio $lista, ListaPrecioItem $item): Response
    {
        $this->servicio->quitarItem($lista, $item);

        return response()->noContent();
    }

    public function asignarCliente(AsignarListaPrecioClienteRequest $request, ListaPrecio $lista): JsonResponse
    {
        return (new ListaPrecioClienteResource($this->servicio->asignarCliente($lista, $request->toDto())))->response()->setStatusCode(201);
    }

    public function quitarCliente(ListaPrecio $lista, ListaPrecioCliente $asignacion): Response
    {
        $this->servicio->quitarCliente($lista, $asignacion);

        return response()->noContent();
    }

    /** @return array{crear: bool, editar: bool, eliminar: bool} */
    private function permisosDe(Request $request): array
    {
        return ['crear' => $request->user()?->tienePermiso('listas_precio.crear') ?? false, 'editar' => $request->user()?->tienePermiso('listas_precio.editar') ?? false, 'eliminar' => $request->user()?->tienePermiso('listas_precio.eliminar') ?? false];
    }
}
