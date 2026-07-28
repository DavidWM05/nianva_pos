<?php

namespace App\Modules\Devoluciones\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Devoluciones\Http\Resources\DevolucionResource;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Devoluciones\Services\DevolucionService;
use App\Modules\NotasCredito\Services\NotaCreditoService;
use App\Modules\Tpv\Models\Venta;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Como VentaController/ApartadoController: nunca calcula un precio ni
 * atrapa las excepciones de negocio (DevolucionSobreVentaSombraException,
 * DevolucionPagoNoCuadraException, y las que hereda de Tpv al crear la
 * venta sombra de un cambio, ej. CajaSesionNoAbiertaException) -- todo
 * eso vive en DevolucionService y se mapea a JSON 422 en bootstrap/app.php.
 *
 * Instancia #7 de orquestacion: store() orquesta la creacion de una
 * Nota de Credito cuando tipo_reembolso = 'nota_credito' (ver
 * docs/03_ESPECIFICACION_BACKEND.md §8).
 */
class DevolucionController extends Controller
{
    private const CAMPOS_ORDENABLES = ['fecha', 'diferencia'];

    public function index(Request $request)
    {
        $query = Devolucion::query()->with(['venta:id,cliente_id', 'venta.cliente:id,nombre']);

        if ($ventaId = $request->query('filtro_venta_id')) {
            $query->where('venta_id', (int) $ventaId);
        }

        $sortField = $request->query('sort_field');
        if (is_string($sortField) && in_array($sortField, self::CAMPOS_ORDENABLES, true)) {
            $query->orderBy($sortField, $request->query('sort_order') === 'desc' ? 'desc' : 'asc');
        } else {
            $query->orderByDesc('fecha');
        }

        $rows = max(1, min(100, (int) $request->query('rows', 25)));
        $page = max(1, (int) $request->query('page', 1));
        $paginador = $query->paginate($rows, ['*'], 'page', $page);

        $usuario = $request->user();

        return response()->json([
            'data' => DevolucionResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => [
                    'crear' => $usuario->tienePermiso('devoluciones.crear'),
                ],
            ],
        ]);
    }

    public function show(Devolucion $devolucion)
    {
        return new DevolucionResource(
            $devolucion->load(['venta.cliente', 'ventaSombra', 'items.variante.producto', 'pagos.metodoPago']),
        );
    }

    /**
     * Instancia #7 de orquestacion: cuando tipo_reembolso = 'nota_credito',
     * crea una Nota de Credito vinculada a la devolucion (ver
     * docs/03_ESPECIFICACION_BACKEND.md §8). La regla se mantiene:
     * Controllers orquestan, Services nunca.
     */
    public function store(Request $request, DevolucionService $devolucionService, NotaCreditoService $notaCreditoService)
    {
        $validated = $request->validate([
            'venta_id' => ['required', 'integer', 'exists:ventas,id'],
            'tipo' => ['required', Rule::in(['devolucion', 'cambio'])],
            'items_devueltos' => ['required', 'array', 'min:1'],
            'items_devueltos.*.variante_id' => ['required', 'integer', 'exists:producto_variantes,id'],
            'items_devueltos.*.cantidad' => ['required', 'integer', 'min:1'],
            'items_devueltos.*.va_a_merma' => ['nullable', 'boolean'],
            'items_nuevos' => ['nullable', 'array'],
            'items_nuevos.*.variante_id' => ['required_with:items_nuevos', 'integer', 'exists:producto_variantes,id'],
            'items_nuevos.*.cantidad' => ['required_with:items_nuevos', 'integer', 'min:1'],
            'pagos' => ['nullable', 'array'],
            'pagos.*.metodo_pago_id' => ['required_with:pagos', 'integer', 'exists:metodos_pago,id'],
            'pagos.*.monto' => ['required_with:pagos', 'numeric', 'min:0.01'],
            'motivo' => ['nullable', 'string', 'max:255'],
            'tipo_reembolso' => ['nullable', Rule::in(['efectivo', 'nota_credito'])],
        ]);

        $usuario = $request->user();
        $ventaOrigen = Venta::findOrFail($validated['venta_id']);
        $tipoReembolso = $validated['tipo_reembolso'] ?? 'efectivo';

        return DB::transaction(function () use ($devolucionService, $notaCreditoService, $ventaOrigen, $validated, $usuario, $tipoReembolso) {
            $devolucion = $devolucionService->registrarDevolucion(
                ventaOrigen: $ventaOrigen,
                tipo: $validated['tipo'],
                itemsDevueltos: $validated['items_devueltos'],
                itemsNuevos: $validated['items_nuevos'] ?? [],
                sucursalId: $usuario->sucursal_id,
                usuarioId: $usuario->id,
                pagos: $validated['pagos'] ?? [],
                motivo: $validated['motivo'] ?? null,
                tipoReembolso: $tipoReembolso,
            );

            $nota = null;
            if ($tipoReembolso === 'nota_credito' && $devolucion->monto_devolucion > 0) {
                $nota = $notaCreditoService->crearDesdeDevolucion($devolucion);
                $devolucion->update(['nota_credito_id' => $nota->id]);
            }

            $devolucion->load(['venta.cliente', 'ventaSombra', 'items.variante.producto', 'pagos.metodoPago']);

            return response()->json([
                'data' => new DevolucionResource($devolucion),
                'nota_credito' => $nota ? ['id' => $nota->id, 'monto_original' => $nota->monto_original] : null,
            ], 201);
        });
    }
}
