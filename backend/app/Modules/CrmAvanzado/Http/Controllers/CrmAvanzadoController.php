<?php

namespace App\Modules\CrmAvanzado\Http\Controllers;

use App\Aplicacion\Reportes\ObtenerReporteCrm;
use App\Http\Controllers\Controller;
use App\Modules\Crm\Models\Cliente;
use App\Modules\CrmAvanzado\Http\Requests\AjustarPuntosRequest;
use App\Modules\CrmAvanzado\Http\Requests\CrearInteraccionRequest;
use App\Modules\CrmAvanzado\Http\Requests\EnviarCampanaRequest;
use App\Modules\CrmAvanzado\Http\Resources\CrmCampanaResource;
use App\Modules\CrmAvanzado\Http\Resources\CrmInteraccionResource;
use App\Modules\CrmAvanzado\Models\LoyaltyTransaccion;
use App\Modules\CrmAvanzado\Services\CrmAvanzadoService;
use App\Modules\CrmAvanzado\Support\GuardasCliente;
use App\Modules\Nucleo\Http\Requests\ConsultarReporteTenantRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CrmAvanzadoController extends Controller
{
    private const CAMPOS_ORDENABLES = [];

    public function __construct(
        private readonly CrmAvanzadoService $crmAvanzadoService,
    ) {}

    public function interacciones(Cliente $cliente, Request $request)
    {
        GuardasCliente::delTenant($cliente, $request->user());

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

    public function crearInteraccion(CrearInteraccionRequest $request, Cliente $cliente)
    {
        $dto = $request->toDto();

        $interaccion = $this->crmAvanzadoService->registrarInteraccion(
            $cliente->id,
            [
                'usuario_id' => $request->user()->id,
                'tipo' => $dto->tipo,
                'observacion' => $dto->observacion,
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

        // Casts explícitos: sin ellos, el OpenAPI generado declaraba estos tres campos como
        // string, aunque son enteros (columnas integer).
        return response()->json([
            'data' => [
                'cliente' => ['id' => (int) $cliente->id, 'nombre' => $cliente->nombre],
                'puntos_loyalty' => (int) $cliente->puntos_loyalty,
                'puntos_acumulados' => (int) $cliente->puntos_acumulados,
                /** @var list<array{id: int, tenant_id: int, cliente_id: int, tipo: 'ganados'|'canjeados'|'vencidos'|'ajuste', puntos: int, referencia_tabla: string|null, referencia_id: int|null, expira_en: string|null, created_at: string}> */
                'historial' => $historial,
            ],
        ]);
    }

    public function ajustarPuntos(AjustarPuntosRequest $request, Cliente $cliente)
    {
        $dto = $request->toDto();

        $transaccion = $this->crmAvanzadoService->ajustarPuntos(
            $cliente->id,
            $dto->puntos,
            $dto->motivo,
        );

        return response()->json([
            'message' => 'Puntos ajustados correctamente.',
            /** @var array{id: int, tenant_id: int, cliente_id: int, tipo: 'ganados'|'canjeados'|'vencidos'|'ajuste', puntos: int, referencia_tabla: string|null, referencia_id: int|null, expira_en: string|null, created_at: string} */
            'data' => $transaccion,
        ]);
    }

    public function enviarCampana(EnviarCampanaRequest $request)
    {
        $dto = $request->toDto();

        $campana = $this->crmAvanzadoService->enviarCampana(
            $dto->datos(),
            $request->user()->tenant_id,
            $request->user()->id,
        );

        return (new CrmCampanaResource($campana))->response()->setStatusCode(201);
    }

    public function reporte(ConsultarReporteTenantRequest $request, ObtenerReporteCrm $reporte): JsonResponse
    {
        return response()->json($reporte->ejecutar($request->toDto()));
    }

    /**
     * Un booleano por acción: el OpenAPI lo documenta como objeto, no como lista.
     *
     * @param  list<string>  $acciones
     * @return array<string, bool>
     */
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
