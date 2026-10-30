<?php

namespace App\Modules\Tpv\Http\Controllers;

use App\Aplicacion\Ventas\RegistrarVenta;
use App\Http\Controllers\Controller;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Inventario\Support\ReglasVariante;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Tpv\Http\Resources\VentaResource;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaDetalle;
use App\Modules\Tpv\Models\VentaPago;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Http\Request;

/**
 * Vive en Tpv (no en Crm) a proposito: Tpv ya depende de Crm (Venta
 * pertenece a Cliente), invertir esa dependencia haria que ambos modulos
 * se importaran entre si. La ruta HTTP igual queda anidada bajo
 * /api/clientes/{cliente}/ventas (ver routes/api.php) -- el URL no tiene
 * que reflejar en que modulo vive el controlador.
 *
 * store() delega la orquestacion entre modulos en
 * App\Aplicacion\Ventas\RegistrarVenta. anular()/cotizar() siguen llamando
 * a VentaService; los errores de negocio se mapean a JSON 422 en
 * bootstrap/app.php.
 */
class VentaController extends Controller
{
    private const CAMPOS_ORDENABLES = ['fecha', 'total'];

    public function porCliente(Cliente $cliente)
    {
        $ventas = Venta::where('cliente_id', $cliente->id)
            ->orderByDesc('fecha')
            ->limit(50)
            ->get(['id', 'fecha', 'total', 'estado', 'es_venta_sombra']);

        return response()->json(['data' => $ventas]);
    }

    public function index(Request $request)
    {
        $query = Venta::query()->with(['cliente:id,nombre', 'pagos.metodoPago:id,nombre']);

        if ($clienteNombre = $request->query('filtro_cliente')) {
            $query->whereHas('cliente', fn ($q) => $q->where('nombre', 'like', "%{$clienteNombre}%"));
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
            'data' => VentaResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => [
                    'anular' => $usuario->tienePermiso('ventas.anular'),
                ],
            ],
        ]);
    }

    public function show(Venta $venta)
    {
        return new VentaResource($venta->load(['cliente', 'pagos.metodoPago', 'detalles.variante.producto']));
    }

    /**
     * Orquestacion: App\Aplicacion\Ventas\RegistrarVenta.
     */
    public function store(Request $request, RegistrarVenta $registrarVenta)
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'cliente_id' => ['required', 'integer', ReglasTenant::existe('clientes', $tenantId)],
            'items' => ['required', 'array', 'min:1'],
            'items.*.variante_id' => ['required', 'integer', ReglasVariante::delTenant($tenantId)],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
            'pagos' => ['required', 'array', 'min:1'],
            'pagos.*.metodo_pago_id' => ['required', 'integer', ReglasTenant::existeGlobalODelTenant('metodos_pago', $tenantId)],
            'pagos.*.monto' => ['required', 'numeric', 'min:0.01'],
            'cupon_codigo' => ['nullable', 'string'],
            'descuento_manual' => ['nullable', 'numeric', 'min:0'],
            'gift_card_codigo' => ['nullable', 'string', 'max:50'],
            'nota_credito_id' => ['nullable', 'integer', ReglasTenant::existe('notas_credito', $tenantId)],
        ]);

        $venta = $registrarVenta->ejecutar(
            clienteId: $validated['cliente_id'],
            items: $validated['items'],
            pagos: $validated['pagos'],
            cuponCodigo: $validated['cupon_codigo'] ?? null,
            descuentoManual: round((float) ($validated['descuento_manual'] ?? 0), 2),
            giftCardCodigo: $validated['gift_card_codigo'] ?? null,
            notaCreditoId: $validated['nota_credito_id'] ?? null,
            usuario: $request->user(),
        );

        $venta->load(['cliente', 'pagos.metodoPago', 'detalles.variante.producto']);

        return (new VentaResource($venta))->response()->setStatusCode(201);
    }

    public function anular(Request $request, Venta $venta, VentaService $ventaService)
    {
        $validated = $request->validate([
            'motivo' => ['required', 'string', 'max:255'],
        ]);

        $venta = $ventaService->anularVenta($venta, $validated['motivo'], $request->user());
        $venta->load(['cliente', 'pagos.metodoPago', 'detalles.variante.producto']);

        return new VentaResource($venta);
    }

    public function cotizar(Request $request, VentaService $ventaService)
    {
        $tenantId = $request->user()->tenant_id;

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.variante_id' => ['required', 'integer', ReglasVariante::delTenant($tenantId)],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
        ]);

        [$lineas, $subtotal] = $ventaService->cotizarItems($tenantId, $validated['items']);

        return response()->json(['data' => ['items' => $lineas, 'subtotal' => $subtotal]]);
    }

    public function reporte(Request $request)
    {
        $tenantId = app(TenantContext::class)->id();

        $fechaDesde = $request->query('fecha_desde', now()->startOfMonth()->toDateString());
        $fechaHasta = $request->query('fecha_hasta', now()->toDateString());
        $sucursalId = $request->query('sucursal_id');

        $base = Venta::where('tenant_id', $tenantId)
            ->where('estado', 'completada')
            ->where('es_venta_sombra', false)
            ->whereDate('fecha', '>=', $fechaDesde)
            ->whereDate('fecha', '<=', $fechaHasta);

        if ($sucursalId) {
            $base->where('sucursal_id', $sucursalId);
        }

        $totalVentas = round((float) (clone $base)->sum('total'), 2);
        $numeroVentas = (clone $base)->count();
        $ticketPromedio = $numeroVentas > 0 ? round($totalVentas / $numeroVentas, 2) : 0.0;

        // Por sucursal
        $sucursales = Sucursal::sinTenant()->where('tenant_id', $tenantId)->pluck('nombre', 'id');

        $porSucursal = (clone $base)
            ->selectRaw('sucursal_id, sum(total) as total, count(*) as numero_ventas')
            ->groupBy('sucursal_id')
            ->get()
            ->map(function ($r) use ($sucursales) {
                return [
                    'sucursal_id' => $r->sucursal_id,
                    'sucursal_nombre' => $sucursales[$r->sucursal_id] ?? null,
                    'total' => round((float) $r->total, 2),
                    'numero_ventas' => (int) $r->numero_ventas,
                ];
            });

        // IDs de las ventas del período para cruzar contra pagos/detalles
        $ventaIds = (clone $base)->pluck('id');

        // Por método de pago
        $porMetodoPago = VentaPago::whereIn('venta_id', $ventaIds)
            ->selectRaw('metodo_pago_id, sum(monto) as total')
            ->groupBy('metodo_pago_id')
            ->get()
            ->map(fn ($r) => [
                'metodo_pago_id' => $r->metodo_pago_id,
                'metodo_pago_nombre' => $r->metodoPago?->nombre,
                'total' => round((float) $r->total, 2),
            ]);

        // Top 10 productos por cantidad vendida
        $topProductos = VentaDetalle::whereIn('venta_id', $ventaIds)
            ->selectRaw('variante_id, sum(cantidad) as cantidad_vendida, sum(subtotal) as total_vendido')
            ->groupBy('variante_id')
            ->orderByDesc('cantidad_vendida')
            ->limit(10)
            ->get()
            ->map(fn ($r) => [
                'variante_id' => $r->variante_id,
                'producto_nombre' => $r->variante?->producto?->nombre,
                'talla' => $r->variante?->talla,
                'color' => $r->variante?->color,
                'cantidad_vendida' => (int) $r->cantidad_vendida,
                'total_vendido' => round((float) $r->total_vendido, 2),
            ]);

        return response()->json(['data' => [
            'total_ventas' => $totalVentas,
            'numero_ventas' => $numeroVentas,
            'ticket_promedio' => $ticketPromedio,
            'por_sucursal' => $porSucursal,
            'por_metodo_pago' => $porMetodoPago,
            'top_productos' => $topProductos,
        ]]);
    }
}
