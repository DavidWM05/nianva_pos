<?php

declare(strict_types=1);

namespace App\Modules\Produccion\Services;

use App\Modules\Inventario\Exceptions\StockInsuficienteException;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Produccion\Exceptions\OrdenProduccionNoCompletableException;
use App\Modules\Produccion\Exceptions\StockInsumosInsuficienteException;
use App\Modules\Produccion\Models\Insumo;
use App\Modules\Produccion\Models\InsumoStock;
use App\Modules\Produccion\Models\OrdenProduccion;
use App\Modules\Produccion\Models\Receta;
use App\Modules\Produccion\Models\RecetaIngrediente;
use App\Modules\Produccion\Models\TransformacionProducto;
use Illuminate\Support\Facades\DB;

class ProduccionService
{
    public function __construct(private readonly InventarioService $inventarioService) {}

    public function crearReceta(array $data): Receta
    {
        $this->exigirTransaccion();

        $receta = Receta::create([
            'tenant_id' => $data['tenant_id'],
            'variante_id' => $data['variante_id'],
            'nombre' => $data['nombre'],
            'descripcion' => $data['descripcion'] ?? null,
            'instrucciones' => $data['instrucciones'] ?? null,
            'rendimiento' => $data['rendimiento'] ?? 1,
        ]);

        foreach ($data['ingredientes'] as $ing) {
            RecetaIngrediente::create([
                'receta_id' => $receta->id,
                'insumo_id' => $ing['insumo_id'],
                'cantidad' => $ing['cantidad'],
                'unidad_medida_id' => $ing['unidad_medida_id'],
            ]);
        }

        return $receta->load('ingredientes');

    }

    public function calcularCostoUnitario(Receta $receta): float
    {
        $total = 0.0;
        foreach ($receta->ingredientes as $ing) {
            $total += (float) $ing->cantidad * (float) $ing->insumo->costo;
        }
        $rendimiento = (float) $receta->rendimiento;

        return $rendimiento > 0 ? round($total / $rendimiento, 4) : 0;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<int, list<InsumoStock>>  $lotes
     */
    public function crearOrdenConReceta(array $data, Receta $receta, array $lotes): OrdenProduccion
    {
        $this->exigirTransaccion();
        $this->verificarInsumos($this->necesidades($receta, (float) $data['cantidad_programada']), $lotes);

        return OrdenProduccion::query()->create([
            'tenant_id' => $data['tenant_id'], 'sucursal_id' => $data['sucursal_id'], 'receta_id' => $receta->getKey(),
            'usuario_id' => $data['usuario_id'], 'cantidad_programada' => $data['cantidad_programada'],
            'estado' => 'pendiente', 'notas' => $data['notas'] ?? null, 'fecha_programada' => $data['fecha_programada'] ?? null,
        ]);
    }

    /** @param array<int, list<InsumoStock>> $lotes */
    public function completarOrdenConBloqueos(OrdenProduccion $orden, Receta $receta, array $lotes, InventarioStock $terminado, int $cantidadProducida): OrdenProduccion
    {
        $this->exigirTransaccion();
        if (! in_array($orden->getAttribute('estado'), ['pendiente', 'en_proceso'], true)) {
            throw new OrdenProduccionNoCompletableException((int) $orden->getKey(), (string) $orden->getAttribute('estado'));
        }
        $necesidades = $this->necesidades($receta, $cantidadProducida / (float) $receta->getAttribute('rendimiento'));
        $this->verificarInsumos($necesidades, $lotes);
        // Deducir insumos FIFO usando exclusivamente los lotes ya bloqueados por la Action.
        foreach ($necesidades as $insumoId => $necesario) {
            $porDeducir = $necesario;
            foreach ($lotes[$insumoId] ?? [] as $lote) {
                if ($porDeducir <= 0) {
                    break;
                }
                $aDeducir = min($porDeducir, (float) $lote->getAttribute('cantidad'));
                $lote->decrement('cantidad', $aDeducir);
                $porDeducir -= $aDeducir;
            }
        }
        // El producto terminado entra por el mismo núcleo de inventario que las demás entradas.
        $this->inventarioService->registrarMovimientoConStock($terminado, 'entrada', $cantidadProducida, 'ajuste', (int) $orden->getAttribute('usuario_id'), 'ordenes_produccion', (int) $orden->getKey());
        $orden->update(['estado' => 'completada', 'cantidad_producida' => $cantidadProducida, 'fecha_completada' => now()]);

        return $orden->refresh();
    }

    /** @param array<string, mixed> $data */
    public function registrarTransformacionConStocks(array $data, InventarioStock $origen, InventarioStock $destino): TransformacionProducto
    {
        $this->exigirTransaccion();
        if ((float) $origen->getAttribute('stock_actual') < (float) $data['cantidad_origen']) {
            throw new StockInsuficienteException($data['variante_origen_id'], $data['sucursal_id'], (int) $data['cantidad_origen'], (int) $origen->getAttribute('stock_actual'));
        }
        $this->inventarioService->registrarMovimientoConStock($origen, 'salida', (int) $data['cantidad_origen'], 'merma', $data['usuario_id'], 'transformaciones');
        $this->inventarioService->registrarMovimientoConStock($destino, 'entrada', (int) $data['cantidad_destino'], 'ajuste', $data['usuario_id'], 'transformaciones');

        return TransformacionProducto::query()->create([
            'tenant_id' => $data['tenant_id'], 'sucursal_id' => $data['sucursal_id'],
            'variante_origen_id' => $data['variante_origen_id'], 'variante_destino_id' => $data['variante_destino_id'],
            'cantidad_origen' => $data['cantidad_origen'], 'cantidad_destino' => $data['cantidad_destino'],
            'usuario_id' => $data['usuario_id'], 'notas' => $data['notas'] ?? null,
        ]);
    }

    public function registrarEntradaInsumo(Insumo $insumo, ?InsumoStock $stock, int $sucursalId, float $cantidad, ?string $lote, ?string $fechaVencimiento): InsumoStock
    {
        $this->exigirTransaccion();
        if ($stock !== null) {
            $stock->increment('cantidad', $cantidad);
        } else {
            $stock = InsumoStock::query()->create(['insumo_id' => $insumo->getKey(), 'sucursal_id' => $sucursalId, 'cantidad' => $cantidad, 'lote' => $lote, 'fecha_vencimiento' => $fechaVencimiento]);
        }

        return $stock->refresh();
    }

    public function cambiarEstadoConOrden(OrdenProduccion $orden, string $estado): OrdenProduccion
    {
        $this->exigirTransaccion();
        $orden->update(['estado' => $estado]);

        return $orden;
    }

    /** @return array<int, float> */
    private function necesidades(Receta $receta, float $factor): array
    {
        $necesidades = [];
        foreach ($receta->ingredientes as $ingrediente) {
            $id = (int) $ingrediente->getAttribute('insumo_id');
            $necesidades[$id] = ($necesidades[$id] ?? 0.0) + (float) $ingrediente->getAttribute('cantidad') * $factor;
        }

        return $necesidades;
    }

    /**
     * @param  array<int, float>  $necesidades
     * @param  array<int, list<InsumoStock>>  $lotes
     */
    private function verificarInsumos(array $necesidades, array $lotes): void
    {
        foreach ($necesidades as $id => $cantidad) {
            $disponible = array_sum(array_map(static fn (InsumoStock $lote): float => (float) $lote->getAttribute('cantidad'), $lotes[$id] ?? []));
            if ($disponible < $cantidad) {
                throw new StockInsumosInsuficienteException((string) Insumo::query()->findOrFail($id)->getAttribute('nombre'));
            }
        }
    }

    private function exigirTransaccion(): void
    {
        if (DB::connection()->transactionLevel() === 0) {
            throw new \LogicException('ProduccionService requiere una transacción abierta por una Action.');
        }
    }
}
