<?php

namespace App\Modules\Tpv\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Exceptions\CuponInvalidoException;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Tpv\Http\Resources\VentaResource;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Http\Request;

/**
 * Vive en Tpv (no en Crm) a proposito: Tpv ya depende de Crm (Venta
 * pertenece a Cliente), invertir esa dependencia haria que ambos modulos
 * se importaran entre si. La ruta HTTP igual queda anidada bajo
 * /api/clientes/{cliente}/ventas (ver routes/api.php) -- el URL no tiene
 * que reflejar en que modulo vive el controlador.
 *
 * store()/anular()/cotizar() nunca calculan un precio ni atrapan las
 * excepciones de negocio (CajaSesionNoAbiertaException,
 * StockInsuficienteException, PagoNoCuadraException, CuponInvalidoException)
 * -- todo eso vive en VentaService/PrecioService y se mapea a JSON 422 en
 * bootstrap/app.php, para que cualquier futuro punto de entrada (ej. una
 * API publica) obtenga el mismo contrato de error sin duplicar el catch.
 */
class VentaController extends Controller
{
    private const CAMPOS_ORDENABLES = ['fecha', 'total'];

    /**
     * Historial de ventas de un cliente para dar contexto en su vista de
     * registro -- sin paginacion, solo las mas recientes (no es un
     * reporte).
     */
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

    public function store(Request $request, VentaService $ventaService)
    {
        $validated = $request->validate([
            'cliente_id' => ['required', 'integer', 'exists:clientes,id'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.variante_id' => ['required', 'integer', 'exists:producto_variantes,id'],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
            'pagos' => ['required', 'array', 'min:1'],
            'pagos.*.metodo_pago_id' => ['required', 'integer', 'exists:metodos_pago,id'],
            'pagos.*.monto' => ['required', 'numeric', 'min:0.01'],
            'cupon_codigo' => ['nullable', 'string'],
            'descuento_manual' => ['nullable', 'numeric', 'min:0'],
        ]);

        $usuario = $request->user();
        $tenantId = app(TenantContext::class)->id();

        $cuponId = null;
        if (! empty($validated['cupon_codigo'])) {
            // Solo se resuelve el id aqui -- vigencia (activo + fechas) se
            // vuelve a validar dentro de VentaService->registrarVenta() via
            // PrecioService::aplicarCupon(), que es la unica autoridad de
            // "es un cupon aplicable ahora mismo".
            $cupon = Cupon::where('codigo', $validated['cupon_codigo'])->first();

            if (! $cupon) {
                throw new CuponInvalidoException($validated['cupon_codigo']);
            }

            $cuponId = $cupon->id;
        }

        $venta = $ventaService->registrarVenta(
            [
                'tenant_id' => $tenantId,
                'sucursal_id' => $usuario->sucursal_id,
                'usuario_id' => $usuario->id,
                'cliente_id' => $validated['cliente_id'],
                'cupon_id' => $cuponId,
                'descuento_manual' => $validated['descuento_manual'] ?? 0,
            ],
            $validated['items'],
            $validated['pagos'],
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

    /**
     * Cotiza lineas (precio + descuento resuelto por PrecioService) sin
     * registrar nada -- lo que la pantalla de venta llama cada vez que se
     * agrega/edita una linea, para nunca calcular un precio en el
     * frontend. Ver VentaService::cotizarItems().
     */
    public function cotizar(Request $request, VentaService $ventaService)
    {
        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1'],
            'items.*.variante_id' => ['required', 'integer', 'exists:producto_variantes,id'],
            'items.*.cantidad' => ['required', 'integer', 'min:1'],
        ]);

        $tenantId = app(TenantContext::class)->id();
        [$lineas, $subtotal] = $ventaService->cotizarItems($tenantId, $validated['items']);

        return response()->json(['data' => ['items' => $lineas, 'subtotal' => $subtotal]]);
    }
}
