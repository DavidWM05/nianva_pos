<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventario\Http\Requests\GuardarAtributoValorRequest;
use App\Modules\Inventario\Http\Resources\AtributoResource;
use App\Modules\Inventario\Models\Atributo;
use App\Modules\Inventario\Models\AtributoValor;
use App\Modules\Inventario\Services\AtributoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * ARQ-07: valores de un atributo, sub-recurso sin lista propia. Cada escritura responde con el
 * atributo completo (con sus valores) para que el detalle se repinte con una sola respuesta.
 */
class AtributoValorController extends Controller
{
    public function __construct(private readonly AtributoService $atributos) {}

    public function store(GuardarAtributoValorRequest $request, Atributo $atributo): JsonResponse
    {
        $atributo = $this->atributos->crearValor($atributo, $request->toDto()->datosPresentes());

        return (new AtributoResource($atributo))->response()->setStatusCode(201);
    }

    public function update(GuardarAtributoValorRequest $request, AtributoValor $valor): AtributoResource
    {
        return new AtributoResource($this->atributos->actualizarValor($valor, $request->toDto()->datosPresentes()));
    }

    public function destroy(AtributoValor $valor): Response
    {
        $this->atributos->eliminarValor($valor);

        return response()->noContent();
    }
}
