<?php

namespace App\Modules\Devoluciones\Http\Controllers;

use App\Aplicacion\Devoluciones\RegistrarDevolucion;
use App\Http\Controllers\Controller;
use App\Modules\Devoluciones\Http\Resources\DevolucionResource;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Inventario\Support\ReglasVariante;
use App\Modules\Nucleo\Support\ReglasTenant;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Como VentaController/ApartadoController: nunca calcula un precio ni
 * atrapa las excepciones de negocio (DevolucionSobreVentaSombraException,
 * DevolucionPagoNoCuadraException, y las que hereda de Tpv al crear la
 * venta sombra de un cambio, ej. CajaSesionNoAbiertaException) -- todo
 * eso vive en DevolucionService y se mapea a JSON 422 en bootstrap/app.php.
 *
 * Orquestacion: App\Aplicacion\Devoluciones\RegistrarDevolucion
 * (incluye la creacion de la Nota de Credito cuando aplica).
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
     * Orquestacion: App\Aplicacion\Devoluciones\RegistrarDevolucion.
     */
    public function store(Request $request, RegistrarDevolucion $registrarDevolucion)
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'venta_id' => ['required', 'integer', ReglasTenant::existe('ventas', $tenantId)],
            'tipo' => ['required', Rule::in(['devolucion', 'cambio'])],
            'items_devueltos' => ['required', 'array', 'min:1'],
            'items_devueltos.*.variante_id' => ['required', 'integer', ReglasVariante::delTenant($tenantId)],
            'items_devueltos.*.cantidad' => ['required', 'integer', 'min:1'],
            'items_devueltos.*.va_a_merma' => ['nullable', 'boolean'],
            'items_nuevos' => ['nullable', 'array', 'required_if:tipo,cambio', 'prohibited_if:tipo,devolucion', 'min:1'],
            'items_nuevos.*.variante_id' => ['required_with:items_nuevos', 'integer', ReglasVariante::delTenant($tenantId)],
            'items_nuevos.*.cantidad' => ['required_with:items_nuevos', 'integer', 'min:1'],
            'pagos' => ['nullable', 'array'],
            'pagos.*.metodo_pago_id' => ['required_with:pagos', 'integer', ReglasTenant::existeGlobalODelTenant('metodos_pago', $tenantId)],
            'pagos.*.monto' => ['required_with:pagos', 'numeric', 'min:0.01'],
            'motivo' => ['nullable', 'string', 'max:255'],
            'tipo_reembolso' => ['nullable', Rule::in(['efectivo', 'nota_credito'])],
        ]);

        $resultado = $registrarDevolucion->ejecutar(
            ventaId: $validated['venta_id'],
            tipo: $validated['tipo'],
            itemsDevueltos: $validated['items_devueltos'],
            itemsNuevos: $validated['items_nuevos'] ?? [],
            pagos: $validated['pagos'] ?? [],
            motivo: $validated['motivo'] ?? null,
            tipoReembolso: $validated['tipo_reembolso'] ?? 'efectivo',
            usuario: $request->user(),
        );

        $devolucion = $resultado['devolucion'];
        $nota = $resultado['nota_credito'];

        $devolucion->load(['venta.cliente', 'ventaSombra', 'items.variante.producto', 'pagos.metodoPago']);

        return response()->json([
            'data' => new DevolucionResource($devolucion),
            'nota_credito' => $nota ? ['id' => $nota->id, 'monto_original' => $nota->monto_original] : null,
        ], 201);
    }
}
