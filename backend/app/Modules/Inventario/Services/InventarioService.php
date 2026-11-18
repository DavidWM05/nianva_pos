<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Services;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Inventario\Exceptions\StockInsuficienteException;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\CompraDetalle;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Support\ImpuestoDeProducto;
use App\Modules\Inventario\Support\UnidadDeVariante;
use App\Modules\Nucleo\Exceptions\FotoIncompletaException;
use App\Modules\Nucleo\Exceptions\ProyeccionNoActualizadaException;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Nucleo\Support\Cantidad;
use App\Modules\Nucleo\Support\Dinero;
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
        int|float $cantidad,
        string $motivo,
        int $usuarioId,
        ?string $referenciaTabla = null,
        ?int $referenciaId = null,
        string|int|float|null $costoUnitario = null,
    ): Kardex {
        $this->exigirTransaccion();
        $this->validarMovimiento($tipo, $cantidad, $motivo);
        $varianteId = (int) $stock->getAttribute('variante_id');
        $sucursalId = (int) $stock->getAttribute('sucursal_id');
        $this->verificarMismoTenant($varianteId, $sucursalId);

        $stockActual = Cantidad::numero($stock->getAttribute('stock_actual'));
        if ($tipo === 'salida' && $stockActual < $cantidad) {
            throw new StockInsuficienteException($varianteId, $sucursalId, $cantidad, $stockActual);
        }

        $stockResultante = $tipo === 'entrada'
            ? Cantidad::sumar($stockActual, $cantidad)
            : Cantidad::restar($stockActual, $cantidad);

        $actualizacion = ['stock_actual' => $stockResultante];
        if ($tipo === 'entrada' && $costoUnitario !== null) {
            $costo = Dinero::desde((string) $costoUnitario);
            $actualizacion['costo_promedio'] = Dinero::desde((string) $stock->getAttribute('costo_promedio'))
                ->promediarEntrada(Cantidad::cadena($stockActual), $costo, Cantidad::cadena($cantidad))->aCadena();
            if ($motivo === 'compra') {
                $actualizacion['ultimo_costo'] = $costo->aCadena();
            }
        }
        $this->actualizarProyeccion($stock, $stockActual, $actualizacion);

        return Kardex::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->create([
            'variante_id' => $varianteId,
            'sucursal_id' => $sucursalId,
            'tipo' => $tipo,
            'cantidad' => $cantidad,
            'motivo' => $motivo,
            'referencia_tabla' => $referenciaTabla,
            'referencia_id' => $referenciaId,
            'stock_antes' => $stockActual,
            'stock_despues' => $stockResultante,
            'usuario_id' => $usuarioId,
        ]);
    }

    /**
     * DAT-05: el primer movimiento de una variante en una sucursal. La fila de stock acaba de
     * nacer en cero (asegurarStock con escribirSaldoInicial=false); el saldo inicial la deja en
     * la cantidad dada y, si trae costo, ese costo es el promedio.
     */
    public function registrarSaldoInicial(InventarioStock $stock, int|float $cantidad, string|int|float|null $costoUnitario, ?int $usuarioId): Kardex
    {
        $this->exigirTransaccion();
        if ($cantidad < 0 || Cantidad::numero($cantidad) != $cantidad) {
            throw new InvalidArgumentException('El saldo inicial no puede ser negativo y admite como máximo tres decimales.');
        }

        $stockActual = Cantidad::numero($stock->getAttribute('stock_actual'));
        if ($cantidad > 0) {
            $actualizacion = ['stock_actual' => Cantidad::sumar($stockActual, $cantidad)];
            if ($costoUnitario !== null) {
                $actualizacion['costo_promedio'] = Dinero::desde((string) $costoUnitario)->aCadena();
            }
            $this->actualizarProyeccion($stock, $stockActual, $actualizacion);
        }

        return $this->escribirSaldoInicial((int) $stock->getAttribute('variante_id'), (int) $stock->getAttribute('sucursal_id'), $stockActual, Cantidad::sumar($stockActual, $cantidad), $usuarioId);
    }

    /**
     * @param  array{tenant_id:int, proveedor_id:int, sucursal_id:int, usuario_id:int, numero_comprobante?:?string, comprobante_url?:?string}  $datosCompra
     * @param  list<array{variante_id:int, cantidad:int|float, precio_compra:float|string}>  $items
     * @param  array<int, InventarioStock>  $stocks
     */
    public function registrarCompraConStocks(array $datosCompra, array $items, array $stocks): Compra
    {
        $this->exigirTransaccion();
        if ($items === []) {
            throw new InvalidArgumentException('Una compra necesita al menos una linea.');
        }

        $total = Dinero::desde(0);
        foreach ($items as $item) {
            $total = $total->sumar(Dinero::desdeProducto((string) $item['precio_compra'], Cantidad::cadena($item['cantidad'])));
        }

        $compra = Compra::query()->create([
            'tenant_id' => $datosCompra['tenant_id'],
            'proveedor_id' => $datosCompra['proveedor_id'],
            'sucursal_id' => $datosCompra['sucursal_id'],
            'usuario_id' => $datosCompra['usuario_id'],
            'numero_comprobante' => $datosCompra['numero_comprobante'] ?? null,
            'comprobante_url' => $datosCompra['comprobante_url'] ?? null,
            'total' => $total->aCadena(),
        ]);

        $tasaDefault = ConfiguracionTenant::sinTenant()->where('tenant_id', $datosCompra['tenant_id'])->firstOrFail()->getAttribute('tasa_iva_default');
        foreach ($items as $item) {
            // DAT-03: en una compra el costo de la línea es lo pagado (con IVA, decisión 9) y el
            // precio es ese mismo costo; sin descuento, lista ni regla. El impuesto se desglosa
            // hacia atrás con la tasa del producto (o la del tenant).
            $variante = ProductoVariante::query()->withoutGlobalScopes()->with('producto')->whereKey($item['variante_id'])->firstOrFail();
            $producto = $variante->getRelationValue('producto');
            if (! $producto instanceof Producto) {
                throw new FotoIncompletaException('producto', (int) $variante->getKey());
            }
            [$tasa, $exento] = ImpuestoDeProducto::de($producto, $tasaDefault);
            $subtotal = Dinero::desdeProducto((string) $item['precio_compra'], Cantidad::cadena($item['cantidad']));
            CompraDetalle::create([
                'compra_id' => $compra->id,
                'variante_id' => $item['variante_id'],
                'cantidad' => $item['cantidad'],
                'precio_unitario' => $item['precio_compra'],
                'descuento' => '0.00',
                'lista_precio_id' => null,
                'lista_precio_nombre' => null,
                'regla_precio_id' => null,
                'regla_nombre' => null,
                'costo_unitario' => $item['precio_compra'],
                'tasa_impuesto' => $tasa,
                'exento' => $exento,
                'impuesto' => $exento ? '0.00' : $subtotal->impuestoIncluido($tasa)->aCadena(),
                'unidad_medida_id' => UnidadDeVariante::idPara($variante),
                'factor' => '1.000',
                'subtotal' => $subtotal->aCadena(),
            ]);

            $this->registrarMovimientoConStock(
                stock: $stocks[$item['variante_id']],
                tipo: 'entrada',
                cantidad: $item['cantidad'],
                motivo: 'compra',
                usuarioId: $datosCompra['usuario_id'],
                referenciaTabla: 'compras',
                referenciaId: $compra->id,
                costoUnitario: $item['precio_compra'],
            );
        }

        return $compra->load('detalles');
    }

    /**
     * Preparación compartida; el llamador bloquea la fila antes de leer su saldo. Devuelve si la
     * fila nació aquí. DAT-05: al nacer, su primer movimiento es saldo_inicial en cero, en la misma
     * transacción, salvo que el llamador escriba el suyo con cantidad (registrarSaldoInicial).
     */
    public function asegurarStock(int $varianteId, int $sucursalId, ?int $usuarioId = null, bool $escribirSaldoInicial = true): bool
    {
        $this->exigirTransaccion();
        $this->verificarMismoTenant($varianteId, $sucursalId);
        $fila = [
            'sucursal_id' => $sucursalId,
            'variante_id' => $varianteId,
            'stock_actual' => 0,
            'stock_minimo' => 0,
            'updated_at' => now(),
        ];

        if (DB::connection()->getDriverName() === 'mysql') {
            // Upsert atomico (INSERT ... ON DUPLICATE KEY UPDATE): garantiza que la fila exista sin
            // la carrera de un SELECT-then-INSERT y nunca pisa stock_actual/stock_minimo de una
            // fila existente (el duplicado solo toca updated_at). Toma un lock exclusivo exista o
            // no la fila, asi que el SELECT FOR UPDATE posterior del llamador no tiene que
            // escalarlo. No se usa INSERT IGNORE: sobre una fila existente toma un lock
            // compartido, y dos movimientos que luego piden FOR UPDATE se interbloquean (1213).
            // MySQL reporta 1 fila al insertar y 0 o 2 al actualizar el duplicado (sin
            // CLIENT_FOUND_ROWS), asi que solo el movimiento que la inserto la cuenta como nueva y
            // el saldo inicial se escribe una sola vez.
            $creada = InventarioStock::sinTenant()->upsert([$fila], ['sucursal_id', 'variante_id'], ['updated_at']) === 1;
        } else {
            // SQLite (tests): no hay locks de fila ni concurrencia real, y su upsert cuenta 1 fila
            // tambien al actualizar; INSERT OR IGNORE distingue la fila nueva.
            $creada = InventarioStock::sinTenant()->insertOrIgnore([$fila]) === 1;
        }

        if ($creada && $escribirSaldoInicial) {
            $this->escribirSaldoInicial($varianteId, $sucursalId, 0, 0, $usuarioId);
        }

        return $creada;
    }

    /**
     * DAT-04: la proyección (inventario_stock) se actualiza en la misma transacción que el renglón
     * y solo si su saldo sigue siendo el que se leyó. Cero filas afectadas = la operación falla.
     *
     * @param  array<string, mixed>  $actualizacion
     */
    private function actualizarProyeccion(InventarioStock $stock, int|float $saldoLeido, array $actualizacion): void
    {
        $filas = InventarioStock::query()->withoutGlobalScopes()
            ->whereKey($stock->getKey())
            ->where('stock_actual', Cantidad::cadena($saldoLeido))
            ->update([...$actualizacion, 'updated_at' => now()]);

        if ($filas !== 1) {
            throw new ProyeccionNoActualizadaException('inventario_stock', (int) $stock->getKey());
        }

        $stock->forceFill($actualizacion)->syncOriginal();
    }

    private function escribirSaldoInicial(int $varianteId, int $sucursalId, int|float $saldoAntes, int|float $saldoDespues, ?int $usuarioId): Kardex
    {
        return Kardex::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->create([
            'variante_id' => $varianteId,
            'sucursal_id' => $sucursalId,
            'tipo' => 'entrada',
            'cantidad' => Cantidad::restar($saldoDespues, $saldoAntes),
            'motivo' => 'saldo_inicial',
            'referencia_tabla' => null,
            'referencia_id' => null,
            'stock_antes' => $saldoAntes,
            'stock_despues' => $saldoDespues,
            'usuario_id' => $usuarioId,
        ]);
    }

    private function exigirTransaccion(): void
    {
        if (DB::connection()->transactionLevel() === 0) {
            throw new \LogicException('InventarioService requiere una transacción abierta por una Action.');
        }
    }

    private function validarMovimiento(string $tipo, int|float $cantidad, string $motivo): void
    {
        if (! in_array($tipo, self::TIPOS_VALIDOS, true)) {
            throw new InvalidArgumentException("Tipo de movimiento invalido: {$tipo}");
        }

        if (! in_array($motivo, self::MOTIVOS_VALIDOS, true)) {
            throw new InvalidArgumentException("Motivo de movimiento invalido: {$motivo}");
        }

        if (Cantidad::numero($cantidad) != $cantidad) {
            throw new InvalidArgumentException('La cantidad admite como máximo tres decimales.');
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
