<?php

namespace App\Modules\CrmAvanzado\Http\Controllers;

use App\Aplicacion\Reportes\ExportarReporteCsv;
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
use App\Modules\Nucleo\Dtos\ConsultarReporteTenantDto;
use App\Modules\Nucleo\Http\Requests\ConsultarReporteTenantRequest;
use App\Modules\Nucleo\Models\Usuario;
use Dedoc\Scramble\Attributes\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

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
        $resultado = $reporte->ejecutar($request->toDto());
        $usuario = $request->user();
        $resultado['meta']['permisos']['exportar'] = $usuario instanceof Usuario && $usuario->tienePermiso('reportes.exportar');

        return response()->json($resultado);
    }

    #[Response(description: 'Archivo CSV del reporte', mediaType: 'text/csv; charset=UTF-8', format: 'binary')]
    #[Response(status: 403, description: 'Falta el permiso de lectura o reportes.exportar', type: 'array{message: string, error_code: string}')]
    #[Response(status: 422, description: 'Filtros inválidos o más de 10 000 filas', type: "array{message: string, error_code: 'reporte_exportacion_limite', limite: int}|array{message: string, errors: array<string, list<string>>}")]
    public function exportar(ConsultarReporteTenantRequest $request, ObtenerReporteCrm $reporte, ExportarReporteCsv $exportar): BinaryFileResponse
    {
        $consulta = $request->toDto();
        $resultado = $reporte->ejecutar(new ConsultarReporteTenantDto(1, ExportarReporteCsv::LIMITE, $consulta->limite));

        return $exportar->ejecutar('crm', $resultado, ['id', 'asunto', 'segmento', 'destinatarios', 'enviado_en'], ['id', 'destinatarios'], ['clientes_por_segmento', 'interacciones_por_tipo', 'loyalty']);
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
