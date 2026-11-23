<?php

namespace App\Modules\CuentasPagar\Http\Controllers;

use App\Aplicacion\CuentasPagar\AnularCuenta;
use App\Aplicacion\CuentasPagar\RegistrarPago;
use App\Aplicacion\Reportes\ObtenerReporteCuentasPagar;
use App\Http\Controllers\Controller;
use App\Modules\CuentasPagar\Http\Requests\RegistrarPagoRequest;
use App\Modules\CuentasPagar\Http\Resources\AbonoPagarResource;
use App\Modules\CuentasPagar\Http\Resources\CuentaPagarResource;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Nucleo\Http\Requests\ConsultarReporteTenantRequest;
use App\Modules\Nucleo\Support\DecimalApi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CuentaPagarController extends Controller
{
    private const CAMPOS_ORDENABLES = ['id', 'monto_total', 'saldo_pendiente', 'fecha_vencimiento', 'created_at'];

    public function index(Request $request)
    {
        $query = CuentaPagar::query()->with(['proveedor:id,razon_social', 'compra:id,ulid,folio']);

        if ($estado = $request->query('filtro_estado')) {
            $query->where('estado', $estado);
        }

        if ($proveedorId = $request->query('filtro_proveedor_id')) {
            $query->where('proveedor_id', $proveedorId);
        }

        if ($proveedor = $request->query('filtro_proveedor')) {
            $query->whereHas('proveedor', fn ($p) => $p->where('razon_social', 'like', "%{$proveedor}%"));
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
            'data' => CuentaPagarResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request, 'cuentas_pagar', ['ver', 'registrar_pago']),
            ],
        ]);
    }

    public function show(CuentaPagar $cuentaPagar)
    {
        $cuentaPagar->load(['proveedor', 'compra', 'abonos.metodoPago']);

        return new CuentaPagarResource($cuentaPagar);
    }

    /**
     * DAT-08: la ruta resuelve la cuenta por ulid (binding); la Action sigue recibiendo el id
     * interno y bloqueando por él.
     */
    public function registrarPago(RegistrarPagoRequest $request, CuentaPagar $cuentaPagar, RegistrarPago $action)
    {
        $id = (int) $cuentaPagar->getKey();
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $dto = $request->toDto();

        $abono = $action->ejecutar($dto, $id, $usuario);

        $cuenta = CuentaPagar::with('proveedor')->findOrFail($id);

        return response()->json([
            'data' => [
                // DAT-08: el pago sale por su Resource (ulid), no como modelo crudo con ids internos.
                'abono' => new AbonoPagarResource($abono),
                'cuenta' => [
                    'id' => (string) $cuenta->getAttribute('ulid'),
                    'saldo_pendiente' => DecimalApi::dinero($cuenta->saldo_pendiente),
                    /** @var 'pendiente'|'pagada'|'anulada' */
                    'estado' => $cuenta->estado,
                ],
            ],
            'message' => 'Pago registrado correctamente',
        ]);
    }

    public function anular(CuentaPagar $cuentaPagar, AnularCuenta $action)
    {
        $action->ejecutar((int) $cuentaPagar->getKey());

        return response()->json(['message' => 'Cuenta por pagar anulada correctamente.']);
    }

    public function reporte(ConsultarReporteTenantRequest $request, ObtenerReporteCuentasPagar $reporte): JsonResponse
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
