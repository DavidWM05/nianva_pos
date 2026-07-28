<?php

namespace App\Modules\CrmAvanzado\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\CrmAvanzado\Http\Resources\CrmCampanaResource;
use App\Modules\CrmAvanzado\Http\Resources\CrmInteraccionResource;
use App\Modules\CrmAvanzado\Models\LoyaltyTransaccion;
use App\Modules\CrmAvanzado\Services\CrmAvanzadoService;
use App\Modules\Crm\Models\Cliente;
use Illuminate\Http\Request;

class CrmAvanzadoController extends Controller
{
    private const CAMPOS_ORDENABLES = [];

    public function __construct(
        private readonly CrmAvanzadoService $crmAvanzadoService,
    ) {}

    public function interacciones(Cliente $cliente, Request $request)
    {
        $this->authorizeCliente($cliente, $request);

        $interacciones = $this->crmAvanzadoService->obtenerInteracciones(
            $cliente->id,
            $request->only(['tipo']),
        );

        return response()->json([
            'data' => CrmInteraccionResource::collection($interacciones),
            'meta' => [
                'permisos' => $this->permisosDe($request, 'crm_interacciones', ['crear', 'editar', 'eliminar']),
            ],
        ]);
    }

    public function crearInteraccion(Cliente $cliente, Request $request)
    {
        $this->authorizeCliente($cliente, $request);

        $validated = $request->validate([
            'tipo' => ['required', 'string', 'in:llamada,email,whatsapp,nota,visita'],
            'observacion' => ['required', 'string', 'max:5000'],
        ]);

        $interaccion = $this->crmAvanzadoService->registrarInteraccion(
            $cliente->id,
            [
                'usuario_id' => $request->user()->id,
                'tipo' => $validated['tipo'],
                'observacion' => $validated['observacion'],
            ],
        );

        return (new CrmInteraccionResource($interaccion))->response()->setStatusCode(201);
    }

    public function loyalty(Cliente $cliente)
    {
        $historial = LoyaltyTransaccion::where('cliente_id', $cliente->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json([
            'data' => [
                'cliente' => ['id' => $cliente->id, 'nombre' => $cliente->nombre],
                'puntos_loyalty' => $cliente->puntos_loyalty,
                'puntos_acumulados' => $cliente->puntos_acumulados,
                'historial' => $historial,
            ],
        ]);
    }

    public function ajustarPuntos(Cliente $cliente, Request $request)
    {
        $validated = $request->validate([
            'puntos' => ['required', 'integer', 'min:-999999', 'max:999999'],
            'motivo' => ['required', 'string', 'max:500'],
        ]);

        $transaccion = $this->crmAvanzadoService->ajustarPuntos(
            $cliente->id,
            $validated['puntos'],
            $validated['motivo'],
        );

        return response()->json([
            'message' => 'Puntos ajustados correctamente.',
            'data' => $transaccion,
        ]);
    }

    public function enviarCampana(Request $request)
    {
        $validated = $request->validate([
            'segmento' => ['nullable', 'string', 'in:todos,nuevo,frecuente,vip,inactivo'],
            'cliente_ids' => ['nullable', 'array'],
            'cliente_ids.*' => ['integer', 'exists:clientes,id'],
            'asunto' => ['required', 'string', 'max:200'],
            'mensaje' => ['required', 'string', 'max:5000'],
        ]);

        $campana = $this->crmAvanzadoService->enviarCampana(
            $validated,
            $request->user()->tenant_id,
            $request->user()->id,
        );

        return (new CrmCampanaResource($campana))->response()->setStatusCode(201);
    }

    private function authorizeCliente(Cliente $cliente, Request $request): void
    {
        if ($cliente->tenant_id !== $request->user()->tenant_id) {
            abort(404);
        }
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
