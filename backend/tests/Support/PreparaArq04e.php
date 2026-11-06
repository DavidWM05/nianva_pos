<?php

declare(strict_types=1);

namespace Tests\Support;

use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\Cotizaciones\Models\CotizacionDetalle;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Produccion\Models\Insumo;
use App\Modules\Produccion\Models\InsumoStock;
use App\Modules\Produccion\Models\OrdenProduccion;
use App\Modules\Produccion\Models\Receta;
use App\Modules\Produccion\Models\RecetaIngrediente;

trait PreparaArq04e
{
    use PreparaArq04b;

    private function negocio04e(): array
    {
        $d = $this->negocio04b();
        $d['destino'] = ProductoVariante::factory()->create(['producto_id' => $d['producto']->id]);
        $d['stockDestino'] = InventarioStock::factory()->create(['variante_id' => $d['destino']->id, 'sucursal_id' => $d['sucursal']->id, 'stock_actual' => 0]);
        $d['insumo'] = Insumo::factory()->create(['tenant_id' => $d['tenant']->id]);
        $d['lote'] = InsumoStock::factory()->create(['insumo_id' => $d['insumo']->id, 'sucursal_id' => $d['sucursal']->id, 'lote' => 'L-04e', 'cantidad' => 1, 'fecha_vencimiento' => now()->addDay()]);
        $d['receta'] = Receta::factory()->create(['tenant_id' => $d['tenant']->id, 'variante_id' => $d['destino']->id, 'rendimiento' => 1]);
        RecetaIngrediente::factory()->create(['receta_id' => $d['receta']->id, 'insumo_id' => $d['insumo']->id, 'cantidad' => 1, 'unidad_medida_id' => $d['insumo']->unidad_medida_id]);
        $d['orden'] = OrdenProduccion::factory()->create(['receta_id' => $d['receta']->id, 'sucursal_id' => $d['sucursal']->id, 'usuario_id' => $d['usuario']->id]);
        $d['cotizacion'] = Cotizacion::factory()->create(['tenant_id' => $d['tenant']->id, 'sucursal_id' => $d['sucursal']->id, 'usuario_id' => $d['usuario']->id, 'cliente_id' => $d['cliente']->id, 'total' => 100, 'estado' => 'pendiente']);
        CotizacionDetalle::factory()->create(['cotizacion_id' => $d['cotizacion']->id, 'variante_id' => $d['variante']->id, 'cantidad' => 1, 'precio_unitario' => 100, 'subtotal' => 100]);

        return $d;
    }
}
