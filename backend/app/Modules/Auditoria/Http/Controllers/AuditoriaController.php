<?php

namespace App\Modules\Auditoria\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Auditoria\Models\Auditoria;
use Illuminate\Http\Request;

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
    public function global(Request $request)
    {
        $validated = $request->validate([
            'tabla' => ['nullable', 'string'],
            'usuario_id' => ['nullable', 'integer'],
            'fecha_desde' => ['nullable', 'date'],
            'fecha_hasta' => ['nullable', 'date'],
        ]);

        $query = Auditoria::query()->with('usuario:id,nombre,apellido');

        if (! empty($validated['tabla'])) {
            $query->where('tabla_afectada', $validated['tabla']);
        }
        if (! empty($validated['usuario_id'])) {
            $query->where('usuario_id', $validated['usuario_id']);
        }
        if (! empty($validated['fecha_desde'])) {
            $query->whereDate('created_at', '>=', $validated['fecha_desde']);
        }
        if (! empty($validated['fecha_hasta'])) {
            $query->whereDate('created_at', '<=', $validated['fecha_hasta']);
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

    public function index(Request $request)
    {
        $validated = $request->validate([
            'tabla' => ['required', 'string'],
            'registro_id' => ['required', 'integer'],
        ]);

        $entradas = Auditoria::where('tabla_afectada', $validated['tabla'])
            ->where('registro_id', $validated['registro_id'])
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
