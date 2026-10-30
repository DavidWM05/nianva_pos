<?php

namespace App\Modules\CrmAvanzado\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Crm\Models\Cliente;
use App\Modules\CrmAvanzado\Http\Resources\CrmCampanaResource;
use App\Modules\CrmAvanzado\Http\Resources\CrmInteraccionResource;
use App\Modules\CrmAvanzado\Models\CrmCampana;
use App\Modules\CrmAvanzado\Models\CrmInteraccion;
use App\Modules\CrmAvanzado\Models\LoyaltyTransaccion;
use App\Modules\CrmAvanzado\Services\CrmAvanzadoService;
use App\Modules\Nucleo\Support\ReglasTenant;
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
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'segmento' => ['nullable', 'string', 'in:todos,nuevo,frecuente,vip,inactivo'],
            'cliente_ids' => ['nullable', 'array'],
            'cliente_ids.*' => ['integer', ReglasTenant::existe('clientes', $tenantId)],
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

    public function reporte(Request $request)
    {
        $tenantId = $request->user()->tenant_id;

        // 1. Segmentos — calcular al vuelo
        $clientes = Cliente::where('tenant_id', $tenantId)->get(['id']);
        $segmentos = ['nuevo' => 0, 'frecuente' => 0, 'vip' => 0, 'inactivo' => 0];

        foreach ($clientes as $cliente) {
            $segmentos[$this->crmAvanzadoService->calcularSegmento($cliente->id)]++;
        }

        // 2. Interacciones — agrupadas por tipo
        $interacciones = CrmInteraccion::where('tenant_id', $tenantId)
            ->selectRaw('tipo, count(*) as total')
            ->groupBy('tipo')
            ->pluck('total', 'tipo');

        // 3. Loyalty
        $puntosGanados = (int) LoyaltyTransaccion::where('tenant_id', $tenantId)
            ->where('tipo', 'ganados')->sum('puntos');
        $puntosCanjeados = abs((int) LoyaltyTransaccion::where('tenant_id', $tenantId)
            ->where('tipo', 'canjeados')->sum('puntos'));
        $puntosVencidos = abs((int) LoyaltyTransaccion::where('tenant_id', $tenantId)
            ->where('tipo', 'vencidos')->sum('puntos'));
        $saldoActual = (int) Cliente::where('tenant_id', $tenantId)->sum('puntos_loyalty');

        // 4. Campañas recientes
        $campanas = CrmCampana::where('tenant_id', $tenantId)
            ->whereNotNull('enviado_en')
            ->orderByDesc('enviado_en')
            ->limit(10)
            ->get(['id', 'asunto', 'segmento', 'destinatarios', 'enviado_en']);

        return response()->json(['data' => [
            'clientes_por_segmento' => $segmentos,
            'interacciones_por_tipo' => $interacciones,
            'loyalty' => [
                'puntos_ganados_total' => $puntosGanados,
                'puntos_canjeados_total' => $puntosCanjeados,
                'puntos_vencidos_total' => $puntosVencidos,
                'saldo_actual_total' => $saldoActual,
            ],
            'campanas_recientes' => $campanas,
        ]]);
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
