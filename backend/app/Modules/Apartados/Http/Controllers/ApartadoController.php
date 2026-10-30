<?php

namespace App\Modules\Apartados\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Apartados\Http\Resources\ApartadoResource;
use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Services\ApartadoService;
use App\Modules\Inventario\Support\ReglasVariante;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Como VentaController, nunca calcula un precio ni atrapa las excepciones
 * de negocio (ApartadoSaldoInsuficienteException, AbonoPagoNoCuadraException,
 * ApartadoEstadoInvalidoException, y las que ApartadoService hereda de Tpv/
 * Inventario al liquidar) -- todo eso vive en ApartadoService y se mapea a
 * JSON 422 en bootstrap/app.php.
 */
class ApartadoController extends Controller
{
    private const CAMPOS_ORDENABLES = ['fecha_creacion', 'fecha_vencimiento', 'total'];

    public function index(Request $request)
    {
        $query = Apartado::query()->with('cliente:id,nombre');

        if ($clienteNombre = $request->query('filtro_cliente')) {
            $query->whereHas('cliente', fn ($q) => $q->where('nombre', 'like', "%{$clienteNombre}%"));
        }

        $sortField = $request->query('sort_field');
        if (is_string($sortField) && in_array($sortField, self::CAMPOS_ORDENABLES, true)) {
            $query->orderBy($sortField, $request->query('sort_order') === 'desc' ? 'desc' : 'asc');
        } else {
            $query->orderByDesc('fecha_creacion');
        }

        $rows = max(1, min(100, (int) $request->query('rows', 25)));
        $page = max(1, (int) $request->query('page', 1));
        $paginador = $query->paginate($rows, ['*'], 'page', $page);

        $usuario = $request->user();

        return response()->json([
            'data' => ApartadoResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => [
                    'crear' => $usuario->tienePermiso('apartados.crear'),
                ],
            ],
        ]);
    }

    public function show(Request $request, Apartado $apartado)
    {
        $usuario = $request->user();

        return response()->json([
            'data' => new ApartadoResource($apartado->load(['cliente', 'detalles.variante.producto', 'abonos.pagos.metodoPago'])),
            'meta' => [
                'permisos' => [
                    'abonar' => $usuario->tienePermiso('apartados.abonar'),
                    'cancelar' => $usuario->tienePermiso('apartados.cancelar'),
                ],
            ],
        ]);
    }

    public function store(Request $request, ApartadoService $apartadoService)
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'cliente_id' => ['required', 'integer', Rule::exists('clientes', 'id')->where('tenant_id', $tenantId)],
            'items' => ['required', 'array', 'min:1'],
            'items.*.variante_id' => ['required', 'integer', ReglasVariante::delTenant($tenantId)],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
            'fecha_vencimiento' => ['nullable', 'date'],
            'notas' => ['nullable', 'string'],
        ]);

        $usuario = $request->user();

        $apartado = $apartadoService->crearApartado(
            [
                'tenant_id' => $tenantId,
                'sucursal_id' => $usuario->sucursal_id,
                'cliente_id' => $validated['cliente_id'],
                'usuario_id' => $usuario->id,
                'fecha_vencimiento' => $validated['fecha_vencimiento'] ?? null,
                'notas' => $validated['notas'] ?? null,
            ],
            $validated['items'],
        );

        $apartado->load(['cliente', 'detalles.variante.producto']);

        return (new ApartadoResource($apartado))->response()->setStatusCode(201);
    }

    public function registrarAbono(Request $request, Apartado $apartado, ApartadoService $apartadoService)
    {
        $validated = $request->validate([
            'monto' => ['required', 'numeric', 'min:0.01'],
            'pagos' => ['required', 'array', 'min:1'],
            'pagos.*.metodo_pago_id' => ['required', 'integer', 'exists:metodos_pago,id'],
            'pagos.*.monto' => ['required', 'numeric', 'min:0.01'],
            'notas' => ['nullable', 'string'],
        ]);

        $apartadoService->registrarAbono(
            $apartado,
            $validated['monto'],
            $request->user()->id,
            $validated['pagos'],
            $validated['notas'] ?? null,
        );

        return new ApartadoResource($apartado->fresh(['cliente', 'detalles.variante.producto', 'abonos.pagos.metodoPago']));
    }

    public function liquidar(Request $request, Apartado $apartado, ApartadoService $apartadoService)
    {
        $apartadoService->liquidar($apartado, $request->user()->id);

        return new ApartadoResource($apartado->fresh(['cliente', 'detalles.variante.producto', 'abonos.pagos.metodoPago']));
    }

    public function cancelar(Request $request, Apartado $apartado, ApartadoService $apartadoService)
    {
        $validated = $request->validate([
            'motivo' => ['required', 'string', 'max:255'],
        ]);

        $resultado = $apartadoService->cancelar($apartado, $validated['motivo'], $request->user());

        return response()->json([
            'data' => new ApartadoResource($resultado->apartado->load(['cliente', 'detalles.variante.producto', 'abonos.pagos.metodoPago'])),
            'meta' => [
                'tiene_abonos_pendientes' => $resultado->tieneAbonosPendientes,
                'monto_abonado_pendiente' => $resultado->montoAbonadoPendiente,
            ],
        ]);
    }
}
