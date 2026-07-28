<?php

namespace App\Modules\Tpv\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Crm\Models\Cliente;
use App\Modules\GiftCards\Services\GiftCardService;
use App\Modules\NotasCredito\Services\NotaCreditoService;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Exceptions\CuponInvalidoException;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Precios\Services\PrecioService;
use App\Modules\Precios\Support\ResultadoCupon;
use App\Modules\Tpv\Http\Resources\VentaResource;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

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
 *
 * Instancia #6 de orquestacion documentada: store() orquesta el pago con
 * Gift Card y Nota de Credito ademas de los metodos de pago tradicionales
 * (ver docs/03_ESPECIFICACION_BACKEND.md §7 y §8). La regla se mantiene:
 * Controllers orquestan, Services nunca.
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
     * Instancia #6 de orquestacion: ademas de los pagos tradicionales
     * (efectivo/tarjeta/transferencia), este metodo orquesta el pago con
     * Gift Card (GiftCardService::validarParaPago + descontarSaldo) y
     * Nota de Credito (NotaCreditoService::validarParaPago + usarEnVenta).
     * Los metodos de pago 'digital' como Gift Card y Nota de Credito se
     * registran en venta_pagos igual que cualquier otro -- el frontend
     * distingue por metodo_pago_id.
     */
    public function store(Request $request, VentaService $ventaService, GiftCardService $giftCardService, NotaCreditoService $notaCreditoService, PrecioService $precioService)
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
            'gift_card_codigo' => ['nullable', 'string', 'max:50'],
            'nota_credito_id' => ['nullable', 'integer', 'exists:notas_credito,id'],
        ]);

        $usuario = $request->user();
        $tenantId = app(TenantContext::class)->id();

        // Resolver cupon (mismo PrecioService que usa VentaService) para
        // calcular $totalEstimado con el descuento real -- evita inflar
        // el monto de Gift Card/Nota de Credito cuando hay cupon.
        $cuponId = null;
        $descuentoCupon = 0.0;

        if (! empty($validated['cupon_codigo'])) {
            $cupon = Cupon::where('codigo', $validated['cupon_codigo'])->first();

            if (! $cupon) {
                throw new CuponInvalidoException($validated['cupon_codigo']);
            }

            $cuponId = $cupon->id;
        }

        // Obtener metodo_pago_id para Gift Card y Nota de Credito (globales,
        // tenant_id = null) para usarlos en los pagos.
        $metodoPagoGiftCard = MetodoPago::sinTenant()->where('nombre', 'Gift Card')->first();
        $metodoPagoNotaCredito = MetodoPago::sinTenant()->where('nombre', 'Nota de Crédito')->first();

        // Calcular subtotal real via cotizarItems para limitar montos GC/NC
        [$lineas, $subtotal] = $ventaService->cotizarItems($tenantId, $validated['items']);

        // Resolver descuento real del cupon para el total estimado
        if ($cuponId && ! empty($validated['cupon_codigo'])) {
            $resultadoCupon = $precioService->aplicarCupon($validated['cupon_codigo'], $subtotal);
            $descuentoCupon = $resultadoCupon->descuento;
        }

        return DB::transaction(function () use ($validated, $ventaService, $giftCardService, $notaCreditoService, $precioService, $usuario, $tenantId, $cuponId, $metodoPagoGiftCard, $metodoPagoNotaCredito, $subtotal, $descuentoCupon) {
            $descuentoManual = round((float) ($validated['descuento_manual'] ?? 0), 2);
            $totalEstimado = round($subtotal - $descuentoManual - $descuentoCupon, 2);

            // Procesar Gift Card antes de crear la venta
            $pagosExtra = [];

            if (! empty($validated['gift_card_codigo']) && $metodoPagoGiftCard) {
                $giftCard = $giftCardService->validarParaPago($validated['gift_card_codigo']);
                $montoGiftCard = min((float) $giftCard->saldo_actual, $totalEstimado);
                $giftCardService->descontarSaldo($giftCard->id, $montoGiftCard);
                $pagosExtra[] = ['metodo_pago_id' => $metodoPagoGiftCard->id, 'monto' => $montoGiftCard];
            }

            if (! empty($validated['nota_credito_id']) && $metodoPagoNotaCredito) {
                $notaCredito = $notaCreditoService->validarParaPago($validated['nota_credito_id']);
                $montoNC = min((float) $notaCredito->saldo_disponible, $totalEstimado);
                $pagosExtra[] = ['metodo_pago_id' => $metodoPagoNotaCredito->id, 'monto' => $montoNC];
            }

            // Pagos combinados: tradicionales + digitales (GC/NC)
            $todosLosPagos = array_merge($validated['pagos'], $pagosExtra);

            $venta = $ventaService->registrarVenta(
                [
                    'tenant_id' => $tenantId,
                    'sucursal_id' => $usuario->sucursal_id,
                    'usuario_id' => $usuario->id,
                    'cliente_id' => $validated['cliente_id'],
                    'cupon_id' => $cuponId,
                    'descuento_manual' => $descuentoManual,
                ],
                $validated['items'],
                $todosLosPagos,
            );

            // Vincular Nota de Credito a la venta (despues de creada para tener el ID)
            if (! empty($validated['nota_credito_id'])) {
                $montoNC = collect($pagosExtra)->where('metodo_pago_id', $metodoPagoNotaCredito?->id)->first()['monto'] ?? 0;
                if ($montoNC > 0) {
                    $notaCreditoService->usarEnVenta($validated['nota_credito_id'], $venta->id, $montoNC);
                }
            }

            $venta->load(['cliente', 'pagos.metodoPago', 'detalles.variante.producto']);

            return (new VentaResource($venta))->response()->setStatusCode(201);
        });
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
