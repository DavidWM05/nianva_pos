<?php

namespace App\Modules\NotasCredito\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Crm\Models\Cliente;
use App\Modules\NotasCredito\Http\Resources\NotaCreditoResource;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\NotasCredito\Services\NotaCreditoService;
use Illuminate\Http\Request;

class NotaCreditoController extends Controller
{
    private const CAMPOS_ORDENABLES = ['id', 'monto_original', 'saldo_disponible', 'created_at'];

    public function index(Request $request)
    {
        $query = NotaCredito::query()->with(['cliente:id,nombre']);

        if ($clienteId = $request->query('filtro_cliente_id')) {
            $query->where('cliente_id', $clienteId);
        }

        $sortField = $request->query('sort_field');
        if (is_string($sortField) && in_array($sortField, self::CAMPOS_ORDENABLES, true)) {
            $query->orderBy($sortField, $request->query('sort_order') === 'desc' ? 'desc' : 'asc');
        } else {
            $query->orderByDesc('id');
        }

        $rows = max(1, min(100, (int) $request->query('rows', 25)));
        $page = max(1, (int) $request->query('page', 1));
        $paginador = $query->paginate($rows, ['*'], 'page', $page);

        return response()->json([
            'data' => NotaCreditoResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request, 'notas_credito', ['ver']),
            ],
        ]);
    }

    public function show(NotaCredito $notaCredito)
    {
        $notaCredito->load(['cliente', 'usos.venta']);

        return new NotaCreditoResource($notaCredito);
    }

    public function activasPorCliente(Cliente $cliente, NotaCreditoService $service)
    {
        $notas = $service->obtenerActivasPorCliente($cliente->id);

        return response()->json(['data' => NotaCreditoResource::collection($notas)]);
    }

    private function permisosDe(Request $request, string $modulo, array $acciones): array
    {
        $usuario = $request->user();
        $resultado = [];
        foreach ($acciones as $accion) {
            $resultado[$accion] = $usuario->tienePermiso("{$modulo}.{$accion}");
        }

        return $resultado;
    }
}
