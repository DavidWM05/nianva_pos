<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Http\Requests\GuardarTerminalRequest;
use App\Modules\Nucleo\Http\Resources\TerminalResource;
use App\Modules\Nucleo\Models\Terminal;
use App\Modules\Nucleo\Services\CatalogoTerminales;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Nucleo\Support\Listado;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\Response;

final class TerminalController extends Controller
{
    public function index(Request $request, CatalogoTerminales $catalogo): AnonymousResourceCollection
    {
        $listado = Listado::aplicar(
            $request,
            $catalogo->consulta(),
            ['campos_ordenables' => ['nombre'], 'orden_por_defecto' => 'nombre', 'busqueda' => ['nombre']],
            ['administrar' => true],
        );

        return TerminalResource::collection($listado['items'])->additional(['meta' => $listado['meta']]);
    }

    public function show(Terminal $terminal): TerminalResource
    {
        return new TerminalResource($terminal);
    }

    public function store(GuardarTerminalRequest $request, TenantContext $tenant, CatalogoTerminales $catalogo): TerminalResource
    {
        $datos = $request->toDto();
        $terminal = $catalogo->crear($tenant->id() ?? abort(403), $datos);

        return new TerminalResource($terminal);
    }

    public function update(GuardarTerminalRequest $request, Terminal $terminal): TerminalResource
    {
        $datos = $request->toDto();
        $terminal->update(['sucursal_id' => $datos->sucursalId, 'nombre' => $datos->nombre]);

        return new TerminalResource($terminal);
    }

    public function destroy(Terminal $terminal): Response
    {
        $terminal->delete();

        return response()->noContent();
    }
}
