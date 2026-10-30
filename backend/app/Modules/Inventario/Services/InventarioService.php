<?php

namespace App\Modules\Inventario\Services;

use App\Modules\Inventario\Exceptions\StockInsuficienteException;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\CompraDetalle;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Sucursal;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Unico punto de entrada para modificar inventario_stock. Ningun otro lugar
 * del modulo debe escribir esa tabla directamente -- ni siquiera
 * registrarCompra() lo hace: internamente llama a registrarMovimiento()
 * como todo lo demas.
 *
 * Cada llamada actualiza inventario_stock y escribe en kardex dentro de la
 * MISMA transaccion (DB::transaction). Esto es exactamente lo que Angara
 * Dental y POS Ropa no garantizaban -- dos escrituras separadas que podian
 * desincronizarse si la segunda fallaba.
 */
class InventarioService
{
    private const TIPOS_VALIDOS = ['entrada', 'salida'];

    private const MOTIVOS_VALIDOS = ['venta', 'compra', 'devolucion', 'merma', 'ajuste', 'apartado'];

    /**
     * @param  'entrada'|'salida'  $tipo
     * @param  'venta'|'compra'|'devolucion'|'merma'|'ajuste'|'apartado'  $motivo
     *
     * @throws StockInsuficienteException si es una salida y no hay stock suficiente.
     */
    public function registrarMovimiento(
        int $varianteId,
        int $sucursalId,
        string $tipo,
        int $cantidad,
        string $motivo,
        int $usuarioId,
        ?string $referenciaTabla = null,
        ?int $referenciaId = null,
    ): Kardex {
        if (! in_array($tipo, self::TIPOS_VALIDOS, true)) {
            throw new InvalidArgumentException("Tipo de movimiento invalido: {$tipo}");
        }

        if (! in_array($motivo, self::MOTIVOS_VALIDOS, true)) {
            throw new InvalidArgumentException("Motivo de movimiento invalido: {$motivo}");
        }

        if ($cantidad <= 0) {
            throw new InvalidArgumentException('La cantidad debe ser mayor a cero.');
        }

        $this->verificarMismoTenant($varianteId, $sucursalId);

        return DB::transaction(function () use ($varianteId, $sucursalId, $tipo, $cantidad, $motivo, $usuarioId, $referenciaTabla, $referenciaId) {
            // Upsert atomico (INSERT ... ON DUPLICATE KEY UPDATE): garantiza
            // que la fila exista sin la carrera de un SELECT-then-INSERT. Si
            // ya existe, el UPDATE del duplicado solo toca updated_at -- nunca
            // pisa stock_actual/stock_minimo de una fila existente. Si dos
            // movimientos concurrentes llegan aqui para la misma variante+
            // sucursal sin fila previa, MySQL serializa el segundo INSERT
            // detras del primero (misma unique key) en vez de que ambos
            // intenten insertar y uno truene por duplicado.
            InventarioStock::sinTenant()->upsert(
                [[
                    'sucursal_id' => $sucursalId,
                    'variante_id' => $varianteId,
                    'stock_actual' => 0,
                    'stock_minimo' => 0,
                    'updated_at' => now(),
                ]],
                ['sucursal_id', 'variante_id'],
                ['updated_at'],
            );

            // sinTenant(): esta capa ya recibe ids explicitos y validados
            // (verificarMismoTenant arriba); consultar con el scope normal
            // aqui podria hacer que una fila EXISTENTE mal filtrada parezca
            // "no encontrada". La fila ya existe (recien creada arriba o de
            // antes) asi que lockForUpdate ahora si bloquea sobre una fila
            // real y serializa cualquier otro movimiento concurrente sobre
            // la misma variante+sucursal hasta que esta transaccion termine.
            $stock = InventarioStock::sinTenant()
                ->where('sucursal_id', $sucursalId)
                ->where('variante_id', $varianteId)
                ->lockForUpdate()
                ->first();

            if ($tipo === 'salida' && $stock->stock_actual < $cantidad) {
                throw new StockInsuficienteException($varianteId, $sucursalId, $cantidad, $stock->stock_actual);
            }

            $stockResultante = $tipo === 'entrada'
                ? $stock->stock_actual + $cantidad
                : $stock->stock_actual - $cantidad;

            $stock->update(['stock_actual' => $stockResultante]);

            return Kardex::sinTenant()->create([
                'variante_id' => $varianteId,
                'sucursal_id' => $sucursalId,
                'tipo' => $tipo,
                'cantidad' => $cantidad,
                'motivo' => $motivo,
                'referencia_tabla' => $referenciaTabla,
                'referencia_id' => $referenciaId,
                'stock_resultante' => $stockResultante,
                'usuario_id' => $usuarioId,
            ]);
        });
    }

    /**
     * Crea una compra con sus detalles y registra la entrada de stock de
     * cada linea -- todo en una sola transaccion. No escribe
     * inventario_stock/kardex directamente: delega cada linea a
     * registrarMovimiento().
     *
     * @param  array{tenant_id:int, proveedor_id:int, sucursal_id:int, usuario_id:int, numero_comprobante?:?string, comprobante_url?:?string}  $datosCompra
     * @param  list<array{variante_id:int, cantidad:int, precio_compra:float|string}>  $items
     */
    public function registrarCompra(array $datosCompra, array $items): Compra
    {
        if ($items === []) {
            throw new InvalidArgumentException('Una compra necesita al menos una linea.');
        }

        return DB::transaction(function () use ($datosCompra, $items) {
            $total = array_sum(array_map(
                fn (array $item) => $item['cantidad'] * $item['precio_compra'],
                $items,
            ));

            $compra = Compra::create([
                'tenant_id' => $datosCompra['tenant_id'],
                'proveedor_id' => $datosCompra['proveedor_id'],
                'sucursal_id' => $datosCompra['sucursal_id'],
                'usuario_id' => $datosCompra['usuario_id'],
                'numero_comprobante' => $datosCompra['numero_comprobante'] ?? null,
                'comprobante_url' => $datosCompra['comprobante_url'] ?? null,
                'total' => $total,
            ]);

            foreach ($items as $item) {
                CompraDetalle::create([
                    'compra_id' => $compra->id,
                    'variante_id' => $item['variante_id'],
                    'cantidad' => $item['cantidad'],
                    'precio_compra' => $item['precio_compra'],
                    'subtotal' => $item['cantidad'] * $item['precio_compra'],
                ]);

                $this->registrarMovimiento(
                    varianteId: $item['variante_id'],
                    sucursalId: $datosCompra['sucursal_id'],
                    tipo: 'entrada',
                    cantidad: $item['cantidad'],
                    motivo: 'compra',
                    usuarioId: $datosCompra['usuario_id'],
                    referenciaTabla: 'compras',
                    referenciaId: $compra->id,
                );
            }

            return $compra->load('detalles');
        });
    }

    /**
     * La variante y la sucursal deben pertenecer al mismo tenant. Defensa
     * adicional independiente de TenantScope: aqui se trabaja con ids
     * crudos, y esta es la unica ruta de escritura de stock del sistema --
     * vale la pena que se cuide sola en vez de confiar en que el llamador
     * ya lo valido.
     */
    private function verificarMismoTenant(int $varianteId, int $sucursalId): void
    {
        $variante = ProductoVariante::sinTenant()->with('producto')->findOrFail($varianteId);
        $sucursal = Sucursal::sinTenant()->findOrFail($sucursalId);

        if ($variante->producto->tenant_id !== $sucursal->tenant_id) {
            throw new InvalidArgumentException(
                "La variante {$varianteId} y la sucursal {$sucursalId} pertenecen a tenants distintos."
            );
        }
    }
}
