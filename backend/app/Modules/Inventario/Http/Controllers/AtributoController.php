<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventario\Http\Requests\GuardarAtributoRequest;
use App\Modules\Inventario\Http\Resources\AtributoResource;
use App\Modules\Inventario\Models\Atributo;
use App\Modules\Inventario\Services\AtributoService;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

/**
 * ARQ-07: catalogo de atributos genericos de variante. Permisos: los de inventario.
 */
class AtributoController extends Controller
{
    public function __construct(private readonly AtributoService $atributos) {}

    /** Listado uniforme; con `con_valores=1`, la lista completa con valores para el formulario de variante. */
    public function index(Request $request): AnonymousResourceCollection
    {
        if ($request->boolean('con_valores')) {
            return AtributoResource::collection($this->atributos->conValores());
        }

        $listado = $this->atributos->listado($request, $this->permisosDe($request));

        return AtributoResource::collection($listado['items'])->additional(['meta' => $listado['meta']]);
    }

    public function show(Request $request, Atributo $atributo): AtributoResource
    {
        return (new AtributoResource($atributo->load('valores')))->additional(['meta' => ['permisos' => $this->permisosDe($request)]]);
    }

    public function store(GuardarAtributoRequest $request): JsonResponse
    {
        $atributo = $this->atributos->crear((int) app(TenantContext::class)->id(), $request->toDto()->datosPresentes());

        return (new AtributoResource($atributo))->response()->setStatusCode(201);
    }

    public function update(GuardarAtributoRequest $request, Atributo $atributo): AtributoResource
    {
        return new AtributoResource($this->atributos->actualizar($atributo, $request->toDto()->datosPresentes()));
    }

    public function destroy(Atributo $atributo): Response
    {
        $this->atributos->eliminar($atributo);

        return response()->noContent();
    }

    /**
     * @return array{crear: bool, editar: bool, eliminar: bool}
     */
    private function permisosDe(Request $request): array
    {
        $usuario = $request->user();
        $puede = fn (string $permiso): bool => $usuario !== null && $usuario->tienePermiso($permiso);

        return [
            'crear' => $puede('inventario.crear'),
            'editar' => $puede('inventario.editar'),
            'eliminar' => $puede('inventario.eliminar'),
        ];
    }
}
