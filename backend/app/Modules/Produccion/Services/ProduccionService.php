<?php

namespace App\Modules\Produccion\Services;

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
use InvalidArgumentException;

class ProduccionService
{
    public function __construct(
        private readonly InventarioService $inventarioService,
    ) {}

    public function crearReceta(array $data): Receta
    {
        return DB::transaction(function () use ($data) {
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
        });
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

    public function crearOrdenProduccion(array $data): OrdenProduccion
    {
        return DB::transaction(function () use ($data) {
            $receta = Receta::with('ingredientes.insumo')->findOrFail($data['receta_id']);

            // Validar stock de insumos
            foreach ($receta->ingredientes as $ing) {
                $stockDisponible = InsumoStock::where('insumo_id', $ing->insumo_id)
                    ->where('sucursal_id', $data['sucursal_id'])
                    ->sum('cantidad');

                $necesario = (float) $ing->cantidad * $data['cantidad_programada'];

                if ($stockDisponible < $necesario) {
                    throw new StockInsumosInsuficienteException($ing->insumo->nombre);
                }
            }

            return OrdenProduccion::create([
                'tenant_id' => $data['tenant_id'],
                'sucursal_id' => $data['sucursal_id'],
                'receta_id' => $receta->id,
                'usuario_id' => $data['usuario_id'],
                'cantidad_programada' => $data['cantidad_programada'],
                'estado' => 'pendiente',
                'notas' => $data['notas'] ?? null,
                'fecha_programada' => $data['fecha_programada'] ?? null,
            ]);
        });
    }

    public function completarOrden(int $id, int $cantidadProducida): OrdenProduccion
    {
        return DB::transaction(function () use ($id, $cantidadProducida) {
            $orden = OrdenProduccion::with('receta.ingredientes.insumo')->findOrFail($id);

            if ($orden->estado !== 'pendiente' && $orden->estado !== 'en_proceso') {
                throw new OrdenProduccionNoCompletableException($orden->id, $orden->estado);
            }

            $receta = $orden->receta;
            $rendimiento = (float) $receta->rendimiento;

            // Deducir insumos (FIFO por fecha de vencimiento)
            foreach ($receta->ingredientes as $ing) {
                $necesario = (float) $ing->cantidad * $cantidadProducida / $rendimiento;

                $stocks = InsumoStock::where('insumo_id', $ing->insumo_id)
                    ->where('sucursal_id', $orden->sucursal_id)
                    ->where('cantidad', '>', 0)
                    ->orderBy('fecha_vencimiento')
                    ->orderBy('id')
                    ->get();

                $porDeducir = $necesario;
                foreach ($stocks as $stock) {
                    if ($porDeducir <= 0) {
                        break;
                    }

                    $aDeducir = min($porDeducir, (float) $stock->cantidad);
                    $stock->decrement('cantidad', $aDeducir);
                    $porDeducir -= $aDeducir;
                }
            }

            // Incrementar stock del producto terminado
            $unidadesProducidas = $cantidadProducida;
            $this->inventarioService->ajustarStock(
                varianteId: $receta->variante_id,
                sucursalId: $orden->sucursal_id,
                cantidad: $unidadesProducidas,
                motivo: 'produccion',
            );

            $orden->update([
                'estado' => 'completada',
                'cantidad_producida' => $cantidadProducida,
                'fecha_completada' => now(),
            ]);

            return $orden->fresh();
        });
    }

    public function registrarTransformacion(array $data): TransformacionProducto
    {
        return DB::transaction(function () use ($data) {
            // Validar stock suficiente en origen
            $stockOrigen = InventarioStock::sinTenant()
                ->where('variante_id', $data['variante_origen_id'])
                ->where('sucursal_id', $data['sucursal_id'])
                ->first();

            if (! $stockOrigen || (float) $stockOrigen->stock_actual < (float) $data['cantidad_origen']) {
                throw new \App\Modules\Inventario\Exceptions\StockInsuficienteException(
                    $data['variante_origen_id'], $data['sucursal_id'],
                    (int) $data['cantidad_origen'],
                    $stockOrigen?->stock_actual ?? 0,
                );
            }

            // Deducir origen
            $this->inventarioService->registrarMovimiento(
                varianteId: $data['variante_origen_id'],
                sucursalId: $data['sucursal_id'],
                tipo: 'salida',
                cantidad: (int) $data['cantidad_origen'],
                motivo: 'merma',
                usuarioId: $data['usuario_id'],
                referenciaTabla: 'transformaciones',
                referenciaId: null,
            );

            // Agregar destino
            $this->inventarioService->registrarMovimiento(
                varianteId: $data['variante_destino_id'],
                sucursalId: $data['sucursal_id'],
                tipo: 'entrada',
                cantidad: (int) $data['cantidad_destino'],
                motivo: 'ajuste',
                usuarioId: $data['usuario_id'],
                referenciaTabla: 'transformaciones',
                referenciaId: null,
            );

            return TransformacionProducto::create([
                'tenant_id' => $data['tenant_id'],
                'sucursal_id' => $data['sucursal_id'],
                'variante_origen_id' => $data['variante_origen_id'],
                'variante_destino_id' => $data['variante_destino_id'],
                'cantidad_origen' => $data['cantidad_origen'],
                'cantidad_destino' => $data['cantidad_destino'],
                'usuario_id' => $data['usuario_id'],
                'notas' => $data['notas'] ?? null,
            ]);
        });
    }
}
