<?php

namespace App\Modules\CuentasCobrar\Http\Controllers;

use App\Aplicacion\CuentasCobrar\AnularCuenta;
use App\Aplicacion\CuentasCobrar\RegistrarAbono;
use App\Http\Controllers\Controller;
use App\Modules\CuentasCobrar\Http\Requests\RegistrarAbonoRequest;
use App\Modules\CuentasCobrar\Http\Resources\AbonoCuentaResource;
use App\Modules\CuentasCobrar\Http\Resources\CuentaCobrarResource;
use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\Nucleo\Support\DecimalApi;
use Illuminate\Http\Request;

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
    public function registrarAbono(RegistrarAbonoRequest $request, CuentaCobrar $cuentaCobrar, RegistrarAbono $action)
    {
        $id = (int) $cuentaCobrar->getKey();
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $dto = $request->toDto();

        $abono = $action->ejecutar($dto, $id, $usuario);

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

    public function reporte(Request $request)
    {
        $limite = max(1, min(50, (int) $request->query('limite', 10)));
        $hoy = now()->toDateString();

        $base = CuentaCobrar::where('estado', 'pendiente');

        $totalPendiente = round((float) (clone $base)->sum('saldo_pendiente'), 2);
        $totalVencido = round((float) (clone $base)->where('fecha_vencimiento', '<', $hoy)->sum('saldo_pendiente'), 2);

        $porAntiguedad = [
            'al_dia' => '0.00',
            'vencido_1_30' => '0.00',
            'vencido_31_60' => '0.00',
            'vencido_61_90' => '0.00',
            'vencido_90_mas' => '0.00',
        ];

        foreach ((clone $base)->where('saldo_pendiente', '>', 0)->get() as $cuenta) {
            $dias = $cuenta->fecha_vencimiento ? max(0, $cuenta->fecha_vencimiento->diffInDays(now(), false)) : -1;
            $saldo = (float) $cuenta->saldo_pendiente;

            if ($dias <= 0) {
                $porAntiguedad['al_dia'] = DecimalApi::dinero(round((float) $porAntiguedad['al_dia'] + $saldo, 2));
            } elseif ($dias <= 30) {
                $porAntiguedad['vencido_1_30'] = DecimalApi::dinero(round((float) $porAntiguedad['vencido_1_30'] + $saldo, 2));
            } elseif ($dias <= 60) {
                $porAntiguedad['vencido_31_60'] = DecimalApi::dinero(round((float) $porAntiguedad['vencido_31_60'] + $saldo, 2));
            } elseif ($dias <= 90) {
                $porAntiguedad['vencido_61_90'] = DecimalApi::dinero(round((float) $porAntiguedad['vencido_61_90'] + $saldo, 2));
            } else {
                $porAntiguedad['vencido_90_mas'] = DecimalApi::dinero(round((float) $porAntiguedad['vencido_90_mas'] + $saldo, 2));
            }
        }

        // cliente_nombre sin `?->`: con el operador nullsafe Scramble lo documentaba como string (ARQ-12b).
        $porCliente = (clone $base)
            ->selectRaw('cliente_id, sum(saldo_pendiente) as saldo_pendiente, count(*) as cuentas_pendientes')
            ->with('cliente:id,ulid,nombre')
            ->groupBy('cliente_id')
            ->orderByDesc('saldo_pendiente')
            ->limit($limite)
            ->get()
            ->map(fn ($r) => [
                // DAT-08: el cliente se publica por su ulid.
                'cliente_id' => $r->cliente === null ? null : (string) $r->cliente->getAttribute('ulid'),
                'cliente_nombre' => $r->cliente === null ? null : $r->cliente->nombre,
                'saldo_pendiente' => DecimalApi::dinero($r->saldo_pendiente),
                'cuentas_pendientes' => (int) $r->cuentas_pendientes,
            ]);

        return response()->json(['data' => [
            'total_pendiente' => DecimalApi::dinero($totalPendiente),
            'total_vencido' => DecimalApi::dinero($totalVencido),
            'por_antiguedad' => $porAntiguedad,
            'por_cliente' => $porCliente,
        ]]);
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
