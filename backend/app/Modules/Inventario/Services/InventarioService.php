<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Services;

use App\Modules\Inventario\Exceptions\StockInsuficienteException;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\CompraDetalle;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Unico punto de entrada para modificar inventario_stock. Ningun otro lugar
 * del modulo debe escribir esa tabla directamente -- ni siquiera
 * registrarCompraConStocks() lo hace: internamente llama a registrarMovimientoConStock()
 * como todo lo demas.
 *
 * Cada llamada actualiza inventario_stock y escribe en kardex dentro de la
 * MISMA transaccion de la Action. Esto es exactamente lo que Angara
 * Dental y POS Ropa no garantizaban -- dos escrituras separadas que podian
 * desincronizarse si la segunda fallaba.
 */
class InventarioService
{
    private const TIPOS_VALIDOS = ['entrada', 'salida'];

    private const MOTIVOS_VALIDOS = ['venta', 'compra', 'devolucion', 'merma', 'ajuste', 'apartado'];

    public function registrarMovimientoConStock(
        InventarioStock $stock,
        string $tipo,
        int $cantidad,
        string $motivo,
        int $usuarioId,
        ?string $referenciaTabla = null,
        ?int $referenciaId = null,
    ): Kardex {
        $this->exigirTransaccion();
        $this->validarMovimiento($tipo, $cantidad, $motivo);
        $varianteId = (int) $stock->getAttribute('variante_id');
        $sucursalId = (int) $stock->getAttribute('sucursal_id');
        $this->verificarMismoTenant($varianteId, $sucursalId);

        $stockActual = (int) $stock->getAttribute('stock_actual');
        if ($tipo === 'salida' && $stockActual < $cantidad) {
            throw new StockInsuficienteException($varianteId, $sucursalId, $cantidad, $stockActual);
        }

        $stockResultante = $tipo === 'entrada'
            ? $stockActual + $cantidad
            : $stockActual - $cantidad;

        $stock->update(['stock_actual' => $stockResultante]);

        return Kardex::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->create([
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
    }

    /**
     * @param  array{tenant_id:int, proveedor_id:int, sucursal_id:int, usuario_id:int, numero_comprobante?:?string, comprobante_url?:?string}  $datosCompra
     * @param  list<array{variante_id:int, cantidad:int, precio_compra:float|string}>  $items
     * @param  array<int, InventarioStock>  $stocks
     */
    public function registrarCompraConStocks(array $datosCompra, array $items, array $stocks): Compra
    {
        $this->exigirTransaccion();
        if ($items === []) {
            throw new InvalidArgumentException('Una compra necesita al menos una linea.');
        }

        $total = array_sum(array_map(
            fn (array $item) => $item['cantidad'] * $item['precio_compra'],
            $items,
        ));

        $compra = Compra::query()->create([
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

            $this->registrarMovimientoConStock(
                stock: $stocks[$item['variante_id']],
                tipo: 'entrada',
                cantidad: $item['cantidad'],
                motivo: 'compra',
                usuarioId: $datosCompra['usuario_id'],
                referenciaTabla: 'compras',
                referenciaId: $compra->id,
            );
        }

        return $compra->load('detalles');
    }

    /** Preparación compartida; el llamador bloquea la fila antes de leer su saldo. */
    public function asegurarStock(int $varianteId, int $sucursalId): void
    {
        $this->exigirTransaccion();
        $this->verificarMismoTenant($varianteId, $sucursalId);
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
    }

    private function exigirTransaccion(): void
    {
        if (DB::connection()->transactionLevel() === 0) {
            throw new \LogicException('InventarioService requiere una transacción abierta por una Action.');
        }
    }

    private function validarMovimiento(string $tipo, int $cantidad, string $motivo): void
    {
        if (! in_array($tipo, self::TIPOS_VALIDOS, true)) {
            throw new InvalidArgumentException("Tipo de movimiento invalido: {$tipo}");
        }

        if (! in_array($motivo, self::MOTIVOS_VALIDOS, true)) {
            throw new InvalidArgumentException("Motivo de movimiento invalido: {$motivo}");
        }

        if ($cantidad <= 0) {
            throw new InvalidArgumentException('La cantidad debe ser mayor a cero.');
        }

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
