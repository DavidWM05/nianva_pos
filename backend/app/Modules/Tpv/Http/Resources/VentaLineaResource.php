<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Http\Resources;

use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Tpv\Models\VentaDetalle;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** @mixin VentaDetalle */
class VentaLineaResource extends JsonResource
{
    /** @return array<string,mixed> */
    public function toArray(Request $request): array
    {
        $detalle = $this->resource;
        if (! $detalle instanceof VentaDetalle) {
            throw new \LogicException('VentaLineaResource requiere una línea de venta.');
        }
        $variante = $detalle->getRelationValue('variante');

        // DAT-08: la línea se publica por su ulid; la devolución la recibe en venta_detalle_id.
        return ['id' => (string) $detalle->getAttribute('ulid'), 'variante_id' => (int) $detalle->getAttribute('variante_id'), 'variante' => $variante instanceof ProductoVariante ? $this->datosVariante($variante) : null,
            'cantidad' => DecimalApi::cantidad($detalle->getAttribute('cantidad')), 'precio_unitario' => DecimalApi::dinero($detalle->getAttribute('precio_unitario')), 'descuento_aplicado' => DecimalApi::dinero($detalle->getAttribute('descuento_aplicado')), 'subtotal' => DecimalApi::dinero($detalle->getAttribute('subtotal')),
            // DAT-03: la foto de la línea, nunca el catálogo actual.
            'lista_precio_nombre' => $detalle->getAttribute('lista_precio_nombre') === null ? null : (string) $detalle->getAttribute('lista_precio_nombre'),
            'regla_nombre' => $detalle->getAttribute('regla_nombre') === null ? null : (string) $detalle->getAttribute('regla_nombre'),
            'tasa_impuesto' => DecimalApi::tasa((string) $detalle->getAttribute('tasa_impuesto')), 'exento' => (bool) $detalle->getAttribute('exento'),
            'impuesto' => DecimalApi::dinero($detalle->getAttribute('impuesto')), 'unidad_medida_id' => (int) $detalle->getAttribute('unidad_medida_id'),
            'presentacion_id' => $this->when($detalle->getAttribute('presentacion_nombre') !== null, fn () => $detalle->getAttribute('presentacion_id') === null ? null : (int) $detalle->getAttribute('presentacion_id')),
            'presentacion_nombre' => $this->when($detalle->getAttribute('presentacion_nombre') !== null, fn () => (string) $detalle->getAttribute('presentacion_nombre')),
            'factor' => $this->when($detalle->getAttribute('presentacion_nombre') !== null, fn () => DecimalApi::cantidad($detalle->getAttribute('factor')))];
    }

    /** @return array{id:int, nombre:?string, producto_nombre:string} */
    private function datosVariante(ProductoVariante $variante): array
    {
        $producto = $variante->getRelationValue('producto');
        if (! $producto instanceof Producto) {
            throw new \LogicException('La variante de venta requiere su producto.');
        }

        return ['id' => (int) $variante->getKey(), 'nombre' => $variante->nombreDeAtributos(), 'producto_nombre' => (string) $producto->getAttribute('nombre')];
    }
}
