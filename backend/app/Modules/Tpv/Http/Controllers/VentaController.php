<?php

namespace App\Modules\Tpv\Http\Controllers;

use App\Aplicacion\Ventas\RegistrarVenta;
use App\Http\Controllers\Controller;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Nucleo\Support\SucursalOperacion;
use App\Modules\Tpv\Dtos\LineaVentaDto;
use App\Modules\Tpv\Http\Requests\AnularVentaRequest;
use App\Modules\Tpv\Http\Requests\CotizarVentaRequest;
use App\Modules\Tpv\Http\Requests\CrearVentaRequest;
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
    public function store(CrearVentaRequest $request, RegistrarVenta $registrarVenta)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $venta = $registrarVenta->ejecutar($request->toDto(), $usuario);

        $venta->load(['cliente', 'pagos.metodoPago', 'detalles.variante.producto']);

        return (new VentaResource($venta))->response()->setStatusCode(201);
    }

    public function anular(AnularVentaRequest $request, Venta $venta, VentaService $ventaService)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $venta = $ventaService->anularVenta($venta, $request->toDto()->motivo, $usuario);
        $venta->load(['cliente', 'pagos.metodoPago', 'detalles.variante.producto']);

        return new VentaResource($venta);
    }

    public function cotizar(CotizarVentaRequest $request, VentaService $ventaService)
    {
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $items = array_map(
            fn (LineaVentaDto $item) => [
                'variante_id' => $item->varianteId,
                'cantidad' => $item->cantidad,
            ],
            $request->toDto()->items,
        );

        $tenantId = app(TenantContext::class)->id();

        if ($tenantId === null) {
            abort(500);
        }

        [$lineas, $subtotal] = $ventaService->cotizarItems($tenantId, $items);

        return response()->json(['data' => ['items' => $lineas, 'subtotal' => $subtotal]]);
    }

    public function reporte(Request $request)
    {
        $tenantId = app(TenantContext::class)->id();

        $fechaDesde = $request->query('fecha_desde', now()->startOfMonth()->toDateString());
        $fechaHasta = $request->query('fecha_hasta', now()->toDateString());
        $usuario = $request->user();

        if ($usuario === null) {
            abort(401);
        }

        $sucursalSolicitada = $request->query('sucursal_id');
        $sucursalId = SucursalOperacion::paraFiltro(
            $usuario,
            $sucursalSolicitada !== null ? (int) $sucursalSolicitada : null,
        );

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
