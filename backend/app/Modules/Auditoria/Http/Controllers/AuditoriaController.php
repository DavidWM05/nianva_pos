<?php

namespace App\Modules\Auditoria\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Auditoria\Http\Requests\FiltrarAuditoriaRequest;
use App\Modules\Auditoria\Http\Requests\ListarAuditoriaRegistroRequest;
use App\Modules\Auditoria\Models\Auditoria;

/**
 * Consumido por AuditLogViewerComponent (ui-shared) via AuditoriaService
 * del frontend -- ver ese componente para el contrato exacto de forma.
 * index() y global() exigen `permiso:auditoria.ver`: ver el historial es
 * una capacidad propia, no algo que se herede de haber podido abrir el
 * registro. El aislamiento real lo da BelongsToTenant en Auditoria.
 */
class AuditoriaController extends Controller
{
    private const CAMPOS_ORDENABLES = ['created_at'];

    /**
     * Navegador global de auditoria (Fase C, punto 5) -- a diferencia de
     * index() (embebido por registro, sin permiso propio), esta SI exige
     * un permiso dedicado (auditoria.ver): aqui no hay una vista de
     * registro de la que "heredar" la autorizacion, es una pantalla de
     * administracion que ve TODOS los cambios del tenant de una vez.
     */
    public function global(FiltrarAuditoriaRequest $request)
    {
        $dto = $request->toDto();

        $query = Auditoria::query()->with('usuario:id,nombre,apellido');

        if (! empty($dto->tabla)) {
            $query->where('tabla_afectada', $dto->tabla);
        }
        if (! empty($dto->usuarioId)) {
            $query->where('usuario_id', $dto->usuarioId);
        }
        if (! empty($dto->fechaDesde)) {
            $query->whereDate('created_at', '>=', $dto->fechaDesde);
        }
        if (! empty($dto->fechaHasta)) {
            $query->whereDate('created_at', '<=', $dto->fechaHasta);
        }

        $sortField = $request->query('sort_field');
        if (is_string($sortField) && in_array($sortField, self::CAMPOS_ORDENABLES, true)) {
            $query->orderBy($sortField, $request->query('sort_order') === 'asc' ? 'asc' : 'desc');
        } else {
            $query->orderByDesc('created_at');
        }

        $rows = max(1, min(100, (int) $request->query('rows', 25)));
        $page = max(1, (int) $request->query('page', 1));
        $paginador = $query->paginate($rows, ['*'], 'page', $page);

        return response()->json([
            'data' => collect($paginador->items())->map(fn (Auditoria $entrada) => [
                'id' => $entrada->id,
                'tabla_afectada' => $entrada->tabla_afectada,
                'registro_id' => $entrada->registro_id,
                'accion' => $entrada->accion,
                'usuario_id' => $entrada->usuario_id,
                'usuario_nombre' => $entrada->usuario?->nombre,
                'cambios' => $entrada->cambios,
                'fecha' => $entrada->created_at,
            ]),
            'meta' => [
                'total' => $paginador->total(),
                'tablas' => Auditoria::query()->distinct()->orderBy('tabla_afectada')->pluck('tabla_afectada'),
            ],
        ]);
    }

    public function index(ListarAuditoriaRegistroRequest $request)
    {
        $dto = $request->toDto();

        $entradas = Auditoria::where('tabla_afectada', $dto->tabla)
            ->where('registro_id', $dto->registroId)
            ->with('usuario:id,nombre,apellido')
            ->orderByDesc('created_at')
            ->limit(100)
            ->get()
            ->map(fn (Auditoria $entrada) => [
                'id' => $entrada->id,
                'tabla_afectada' => $entrada->tabla_afectada,
                'registro_id' => $entrada->registro_id,
                'accion' => $entrada->accion,
                'usuario_id' => $entrada->usuario_id,
                'usuario_nombre' => $entrada->usuario?->nombre,
                'cambios' => $entrada->cambios,
                'fecha' => $entrada->created_at,
            ]);

        return response()->json(['data' => $entradas]);
    }
}
