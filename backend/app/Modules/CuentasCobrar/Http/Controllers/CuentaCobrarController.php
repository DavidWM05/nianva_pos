<?php

namespace App\Modules\CuentasCobrar\Http\Controllers;

use App\Aplicacion\CuentasCobrar\AnularCuenta;
use App\Aplicacion\CuentasCobrar\RegistrarAbono;
use App\Aplicacion\Reportes\ExportarReporteCsv;
use App\Aplicacion\Reportes\ObtenerReporteCuentasCobrar;
use App\Aplicacion\Sesion\TerminalDeSesion;
use App\Http\Controllers\Controller;
use App\Modules\CuentasCobrar\Http\Requests\RegistrarAbonoRequest;
use App\Modules\CuentasCobrar\Http\Resources\AbonoCuentaResource;
use App\Modules\CuentasCobrar\Http\Resources\CuentaCobrarResource;
use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\Nucleo\Dtos\ConsultarReporteTenantDto;
use App\Modules\Nucleo\Http\Requests\ConsultarReporteTenantRequest;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\Planes;
use App\Modules\Nucleo\Support\DecimalApi;
use Dedoc\Scramble\Attributes\Response;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * CRUD de cuentas por cobrar.
 *
 * store() NO existe aqui -- las CxC se crean orquestadas desde el flujo
 * de venta cuando tipo_pago = 'credito'.
 */
class CuentaCobrarController extends Controller
{
    private const CAMPOS_ORDENABLES = ['id', 'monto_total', 'saldo_pendiente', 'fecha_vencimiento', 'created_at'];

    public function index(Request $request)
    {
        $query = CuentaCobrar::query()->with(['cliente:id,ulid,nombre', 'venta:id,ulid,folio']);

        if ($estado = $request->query('filtro_estado')) {
            $query->where('estado', $estado);
        }

        if ($clienteId = $request->query('filtro_cliente_id')) {
            // DAT-08: el filtro recibe el ulid publicado del cliente.
            $query->whereHas('cliente', fn ($q) => $q->where('ulid', strtolower((string) $clienteId)));
        }

        if ($request->boolean('vencidas')) {
            $query->where('estado', 'pendiente')
                ->where('fecha_vencimiento', '<', now()->toDateString());
        }

        if ($cliente = $request->query('filtro_cliente')) {
            $query->whereHas('cliente', fn ($c) => $c->where('nombre', 'like', "%{$cliente}%"));
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
            'data' => CuentaCobrarResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request, 'cuentas_cobrar', ['ver', 'crear', 'registrar_abono', 'anular']),
            ],
        ]);
    }

    public function show(CuentaCobrar $cuentaCobrar)
    {
        $cuentaCobrar->load(['cliente', 'venta', 'abonos.metodoPago']);

        return new CuentaCobrarResource($cuentaCobrar);
    }

    /**
     * DAT-08: la ruta resuelve la cuenta por ulid (binding); la Action sigue recibiendo el id
     * interno y bloqueando por él.
     */
    public function registrarAbono(RegistrarAbonoRequest $request, CuentaCobrar $cuentaCobrar, RegistrarAbono $action, TerminalDeSesion $terminalDeSesion)
    {
        $id = (int) $cuentaCobrar->getKey();
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $dto = $request->toDto();

        $abono = $action->ejecutar($dto, $id, $usuario, $terminalDeSesion->actual($usuario, $request->hasSession() ? $request->session() : null));

        $cuenta = CuentaCobrar::with('cliente')->findOrFail($id);

        return response()->json([
            'data' => [
                // DAT-08: el abono sale por su Resource (ulid), no como modelo crudo con ids internos.
                'abono' => new AbonoCuentaResource($abono),
                'cuenta' => [
                    'id' => (string) $cuenta->getAttribute('ulid'),
                    'saldo_pendiente' => DecimalApi::dinero($cuenta->saldo_pendiente),
                    /** @var 'pendiente'|'pagada'|'anulada' */
                    'estado' => $cuenta->estado,
                ],
            ],
            'message' => 'Abono registrado correctamente',
        ]);
    }

    public function anular(CuentaCobrar $cuentaCobrar, AnularCuenta $action)
    {
        $action->ejecutar((int) $cuentaCobrar->getKey());

        return response()->json(['message' => 'Cuenta por cobrar anulada correctamente.']);
    }

    public function reporte(ConsultarReporteTenantRequest $request, ObtenerReporteCuentasCobrar $reporte): JsonResponse
    {
        $resultado = $reporte->ejecutar($request->toDto());
        $usuario = $request->user();
        $resultado['meta']['permisos']['exportar'] = $usuario instanceof Usuario && $usuario->tienePermiso('reportes.exportar')
            && app(Planes::class)->deTenant((int) $usuario->getAttribute('tenant_id'))->incluye('reportes_csv');

        return response()->json($resultado);
    }

    #[Response(description: 'Archivo CSV del reporte', mediaType: 'text/csv; charset=UTF-8', format: 'binary')]
    #[Response(status: 403, description: 'Falta el permiso de lectura o reportes.exportar', type: 'array{message: string, error_code: string}')]
    #[Response(status: 422, description: 'Filtros inválidos o más de 10 000 filas', type: "array{message: string, error_code: 'reporte_exportacion_limite', limite: int}|array{message: string, errors: array<string, list<string>>}")]
    public function exportar(ConsultarReporteTenantRequest $request, ObtenerReporteCuentasCobrar $reporte, ExportarReporteCsv $exportar): BinaryFileResponse
    {
        $consulta = $request->toDto();
        $resultado = $reporte->ejecutar(new ConsultarReporteTenantDto(1, ExportarReporteCsv::LIMITE, $consulta->limite));

        return $exportar->ejecutar('cuentas-cobrar', $resultado, ['id', 'cliente_nombre', 'fecha_vencimiento', 'saldo_pendiente'], ['id', 'saldo_pendiente'], ['total_pendiente', 'total_vencido', 'por_antiguedad']);
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
