<?php

namespace App\Modules\Cotizaciones\Services;

use App\Modules\Cotizaciones\Exceptions\CotizacionNoEditableException;
use App\Modules\Cotizaciones\Exceptions\CotizacionVencidaException;
use App\Modules\Cotizaciones\Exceptions\CotizacionYaConvertidaException;
use App\Modules\Cotizaciones\Exceptions\SinClienteException;
use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Cotizaciones\Models\CotizacionDetalle;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Precios\Services\PrecioService;
use App\Modules\Tpv\Services\VentaService;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Unico punto de entrada para gestionar cotizaciones/presupuestos.
 * Las cotizaciones NO modifican stock ni registran pagos: son solo
 * presupuestos. Al convertir a venta, se delega en VentaService
 * (que si descuenta stock y registra pagos).
 *
 * Dependencias permitidas (modulos posteriores en el grafo):
 * - PrecioService (modulo Precios, anterior a TPV)
 * - VentaService (modulo TPV, posterior a Precios)
 *
 * @see \App\Modules\Tpv\Services\VentaService
 * @see \App\Modules\Precios\Services\PrecioService
 */
class CotizacionService
{
    public function __construct(
        private readonly PrecioService $precioService,
        private readonly VentaService $ventaService,
    ) {
    }

    /**
     * Crea cotizacion con sus items. No modifica stock.
     *
     * @param  array{tenant_id:int, sucursal_id:int, usuario_id:int, cliente_id:?int, validez_dias:int, descuento:float, observaciones:?string, uso_cfdi:?string}  $data
     * @param  list<array{variante_id:int, cantidad:int, precio_unitario:float, descuento:float}>  $items
     *
     * @throws InvalidArgumentException si cantidad <= 0 o variante no existe
     */
    public function crear(array $data, array $items): Cotizacion
    {
        if ($items === []) {
            throw new InvalidArgumentException('Una cotizacion necesita al menos un item.');
        }

        return DB::transaction(function () use ($data, $items) {
            $tenantId = $data['tenant_id'];
            $validezDias = max(1, (int) ($data['validez_dias'] ?? 15));

            $numeroCotizacion = $this->generarNumeroCotizacion($tenantId);
            $fechaVencimiento = now()->addDays($validezDias)->toDateString();

            // Resolver precios via PrecioService para cada item
            $lineas = [];
            $total = 0.0;
            $descuentoGlobal = round((float) ($data['descuento'] ?? 0), 2);

            foreach ($items as $item) {
                if ($item['cantidad'] <= 0) {
                    throw new InvalidArgumentException('La cantidad de cada item debe ser mayor a cero.');
                }

                $variante = ProductoVariante::sinTenant()->with('producto')->findOrFail($item['variante_id']);

                if ($variante->producto->tenant_id !== $tenantId) {
                    throw new InvalidArgumentException("La variante {$item['variante_id']} no pertenece al tenant {$tenantId}.");
                }

                $precioUnitario = round((float) ($item['precio_unitario'] ?? 0), 2);
                $descuentoLinea = round((float) ($item['descuento'] ?? 0), 2);
                $subtotal = round($precioUnitario * $item['cantidad'] - $descuentoLinea, 2);

                $lineas[] = [
                    'variante_id' => $variante->id,
                    'cantidad' => $item['cantidad'],
                    'precio_unitario' => $precioUnitario,
                    'descuento' => $descuentoLinea,
                    'subtotal' => $subtotal,
                ];

                $total += $subtotal;
            }

            $total = round($total - $descuentoGlobal, 2);

            if ($total < 0) {
                throw new InvalidArgumentException('El total de la cotizacion no puede quedar negativo.');
            }

            $cotizacion = Cotizacion::create([
                'tenant_id' => $tenantId,
                'sucursal_id' => $data['sucursal_id'],
                'cliente_id' => $data['cliente_id'] ?? null,
                'usuario_id' => $data['usuario_id'],
                'numero_cotizacion' => $numeroCotizacion,
                'total' => $total,
                'descuento' => $descuentoGlobal,
                'validez_dias' => $validezDias,
                'estado' => 'pendiente',
                'observaciones' => $data['observaciones'] ?? null,
                'fecha_vencimiento' => $fechaVencimiento,
                'uso_cfdi' => $data['uso_cfdi'] ?? null,
            ]);

            foreach ($lineas as $linea) {
                CotizacionDetalle::create([
                    'cotizacion_id' => $cotizacion->id,
                    'variante_id' => $linea['variante_id'],
                    'cantidad' => $linea['cantidad'],
                    'precio_unitario' => $linea['precio_unitario'],
                    'descuento' => $linea['descuento'],
                    'subtotal' => $linea['subtotal'],
                ]);
            }

            return $cotizacion->load('detalles');
        });
    }

    /**
     * Actualiza cotizacion y sus items (borra y reinserta).
     * Solo si estado = 'pendiente'.
     */
    public function actualizar(int $id, array $data, array $items): Cotizacion
    {
        $cotizacion = Cotizacion::findOrFail($id);

        if ($cotizacion->estado !== 'pendiente') {
            throw new CotizacionNoEditableException($id, $cotizacion->estado);
        }

        return DB::transaction(function () use ($cotizacion, $data, $items) {
            $validezDias = max(1, (int) ($data['validez_dias'] ?? $cotizacion->validez_dias));
            $fechaVencimiento = $cotizacion->created_at->addDays($validezDias)->toDateString();

            // Recalcular total con nuevos items
            $lineas = [];
            $total = 0.0;
            $descuentoGlobal = round((float) ($data['descuento'] ?? $cotizacion->descuento), 2);

            foreach ($items as $item) {
                if ($item['cantidad'] <= 0) {
                    throw new InvalidArgumentException('La cantidad de cada item debe ser mayor a cero.');
                }

                $variante = ProductoVariante::sinTenant()->with('producto')->findOrFail($item['variante_id']);

                if ($variante->producto->tenant_id !== $cotizacion->tenant_id) {
                    throw new InvalidArgumentException("La variante {$item['variante_id']} no pertenece al tenant.");
                }

                $precioUnitario = round((float) ($item['precio_unitario'] ?? 0), 2);
                $descuentoLinea = round((float) ($item['descuento'] ?? 0), 2);
                $subtotal = round($precioUnitario * $item['cantidad'] - $descuentoLinea, 2);

                $lineas[] = [
                    'variante_id' => $variante->id,
                    'cantidad' => $item['cantidad'],
                    'precio_unitario' => $precioUnitario,
                    'descuento' => $descuentoLinea,
                    'subtotal' => $subtotal,
                ];

                $total += $subtotal;
            }

            $total = round($total - $descuentoGlobal, 2);

            if ($total < 0) {
                throw new InvalidArgumentException('El total de la cotizacion no puede quedar negativo.');
            }

            $cotizacion->update([
                'cliente_id' => $data['cliente_id'] ?? $cotizacion->cliente_id,
                'total' => $total,
                'descuento' => $descuentoGlobal,
                'validez_dias' => $validezDias,
                'observaciones' => $data['observaciones'] ?? $cotizacion->observaciones,
                'fecha_vencimiento' => $fechaVencimiento,
                'uso_cfdi' => $data['uso_cfdi'] ?? $cotizacion->uso_cfdi,
            ]);

            // Borrar detalles anteriores y reinsertar
            $cotizacion->detalles()->delete();

            foreach ($lineas as $linea) {
                CotizacionDetalle::create([
                    'cotizacion_id' => $cotizacion->id,
                    'variante_id' => $linea['variante_id'],
                    'cantidad' => $linea['cantidad'],
                    'precio_unitario' => $linea['precio_unitario'],
                    'descuento' => $linea['descuento'],
                    'subtotal' => $linea['subtotal'],
                ]);
            }

            return $cotizacion->fresh()->load('detalles');
        });
    }

    /**
     * Marca como anulada. Solo si estado = 'pendiente'.
     */
    public function anular(int $id): void
    {
        $cotizacion = Cotizacion::findOrFail($id);

        if (! in_array($cotizacion->estado, ['pendiente', 'vencida'], true)) {
            throw new CotizacionNoEditableException($id, $cotizacion->estado);
        }

        DB::transaction(function () use ($cotizacion) {
            $cotizacion->update(['estado' => 'anulada']);
        });
    }

    /**
     * Convierte cotizacion en venta. Crea la venta con VentaService,
     * descuenta stock, registra pagos.
     *
     * @param  array{forma_pago:string, metodo_pago_id:int, monto_recibido:float, caja_sesion_id:?int}  $dataVenta
     *
     * @throws CotizacionVencidaException
     * @throws CotizacionYaConvertidaException
     * @throws SinClienteException
     * @throws \App\Modules\Inventario\Exceptions\StockInsuficienteException
     */
    public function convertirAVenta(int $id, array $dataVenta): \App\Modules\Tpv\Models\Venta
    {
        $cotizacion = Cotizacion::with('detalles')->findOrFail($id);

        if ($cotizacion->estado === 'convertida') {
            throw new CotizacionYaConvertidaException($id);
        }

        if ($cotizacion->fecha_vencimiento && $cotizacion->fecha_vencimiento < now()->toDateString()) {
            throw new CotizacionVencidaException($id);
        }

        if (! $cotizacion->cliente_id) {
            throw new SinClienteException;
        }

        return DB::transaction(function () use ($cotizacion, $dataVenta) {
            // Preparar items para VentaService
            $items = [];
            foreach ($cotizacion->detalles as $detalle) {
                $items[] = [
                    'variante_id' => $detalle->variante_id,
                    'cantidad' => $detalle->cantidad,
                ];
            }

            $pagos = [[
                'metodo_pago_id' => $dataVenta['metodo_pago_id'],
                'monto' => $cotizacion->total,
            ]];

            $venta = $this->ventaService->registrarVenta(
                [
                    'tenant_id' => $cotizacion->tenant_id,
                    'sucursal_id' => $cotizacion->sucursal_id,
                    'usuario_id' => $dataVenta['usuario_id'],
                    'cliente_id' => $cotizacion->cliente_id,
                ],
                $items,
                $pagos,
            );

            $cotizacion->update([
                'estado' => 'convertida',
                'venta_id' => $venta->id,
            ]);

            return $venta;
        });
    }

    /**
     * Genera numero de cotizacion correlativo por tenant: COT-{correlativo}.
     */
    private function generarNumeroCotizacion(int $tenantId): string
    {
        $ultimo = Cotizacion::sinTenant()
            ->where('tenant_id', $tenantId)
            ->where('numero_cotizacion', 'like', 'COT-%')
            ->orderByDesc('id')
            ->lockForUpdate()
            ->first();

        $correlativo = 1;
        if ($ultimo) {
            $partes = explode('-', $ultimo->numero_cotizacion);
            $correlativo = ((int) end($partes)) + 1;
        }

        return 'COT-' . str_pad((string) $correlativo, 6, '0', STR_PAD_LEFT);
    }
}
