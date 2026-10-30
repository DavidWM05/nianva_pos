<?php

namespace App\Modules\Precios\Services;

use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Precios\Exceptions\CuponInvalidoException;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Precios\Models\ReglaPrecio;
use App\Modules\Precios\Support\ResultadoCupon;
use App\Modules\Precios\Support\ResultadoDescuento;
use Illuminate\Database\Eloquent\Builder;

/**
 * Resuelve reglas_precio (por item, cascada variante > producto > categoria
 * > todo) y cupones (sobre el total del carrito) -- dos mecanismos
 * deliberadamente separados, nunca mezclados. calcularDescuento() jamas
 * aplica mas de una regla de item a la vez: la cascada se detiene en el
 * primer nivel con una regla activa y vigente.
 */
class PrecioService
{
    /**
     * Resuelve la regla de precio aplicable a una variante (si hay alguna)
     * y calcula el descuento resultante para la cantidad dada.
     */
    public function calcularDescuento(ProductoVariante $variante, int $cantidad): ResultadoDescuento
    {
        $variante->loadMissing('producto.categoria');
        $producto = $variante->producto;
        $precioUnitario = (float) $producto->precio_venta;

        $regla = $this->reglaAplicable($variante, $producto);

        if (! $regla) {
            return new ResultadoDescuento(null, $precioUnitario, $cantidad, 0.0);
        }

        $descuentoTotal = $this->calcularDescuentoPorTipo($regla, $precioUnitario, $cantidad);

        return new ResultadoDescuento($regla, $precioUnitario, $cantidad, $descuentoTotal);
    }

    /**
     * Aplica un cupon sobre el total del carrito. Independiente por
     * completo de calcularDescuento() -- no recibe variante ni cantidad,
     * solo el total ya calculado.
     *
     * @throws CuponInvalidoException si el codigo no existe, esta inactivo o fuera de vigencia.
     */
    public function aplicarCupon(string $codigo, float $totalCarrito): ResultadoCupon
    {
        $cupon = $this->vigentes(Cupon::where('codigo', $codigo))->first();

        if (! $cupon) {
            throw new CuponInvalidoException($codigo);
        }

        $descuento = $cupon->tipo === 'porcentaje'
            ? round($totalCarrito * ((float) $cupon->valor / 100), 2)
            : min(round((float) $cupon->valor, 2), round($totalCarrito, 2));

        // uso_maximo / uso_maximo_por_cliente: el conteo de usos vive en la
        // tabla ventas (modulo TPV, aun no construido) -- ese modulo es el
        // que sabe cuantas veces se aplico un cupon. Aqui solo se valida
        // vigencia (activo + rango de fechas), no consumo.
        return new ResultadoCupon($cupon, $totalCarrito, $descuento);
    }

    /**
     * Cascada de prioridad: variante > producto > categoria > todo. Se
     * detiene en el primer nivel con una regla activa y vigente -- nunca
     * combina reglas de dos niveles distintos.
     */
    private function reglaAplicable(ProductoVariante $variante, Producto $producto): ?ReglaPrecio
    {
        if ($regla = $this->reglaPorNivel('variante', ['variante_id' => $variante->id])) {
            return $regla;
        }

        if ($regla = $this->reglaPorNivel('producto', ['producto_id' => $producto->id])) {
            return $regla;
        }

        if ($producto->categoria_id !== null) {
            if ($regla = $this->reglaPorNivel('categoria', ['categoria_id' => $producto->categoria_id])) {
                return $regla;
            }
        }

        return $this->reglaPorNivel('todo', []);
    }

    /**
     * @param  array<string, int>  $condiciones
     *
     * Si mas de una regla activa y vigente compite en el MISMO nivel, gana
     * la de id mas alto (la configurada mas recientemente). No especificado
     * por el documento -- criterio de desempate propio, documentado aqui.
     */
    private function reglaPorNivel(string $aplicaA, array $condiciones): ?ReglaPrecio
    {
        return $this->vigentes(
            ReglaPrecio::where('aplica_a', $aplicaA)->where($condiciones)
        )->orderByDesc('id')->first();
    }

    /**
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    private function vigentes(Builder $query): Builder
    {
        $hoy = now()->toDateString();

        return $query->where('activo', true)
            ->where(fn (Builder $q) => $q->whereNull('fecha_inicio')->orWhereDate('fecha_inicio', '<=', $hoy))
            ->where(fn (Builder $q) => $q->whereNull('fecha_fin')->orWhereDate('fecha_fin', '>=', $hoy));
    }

    private function calcularDescuentoPorTipo(ReglaPrecio $regla, float $precioUnitario, int $cantidad): float
    {
        return match ($regla->tipo) {
            'porcentaje' => round($precioUnitario * $cantidad * ((float) $regla->valor / 100), 2),
            'monto_fijo' => min(round((float) $regla->valor * $cantidad, 2), round($precioUnitario * $cantidad, 2)),
            'nxm' => $this->descuentoNxm($regla, $precioUnitario, $cantidad),
            'bundle' => $this->descuentoBundle($regla, $precioUnitario, $cantidad),
            default => 0.0,
        };
    }

    /**
     * nxm ("compra N paga M", ej. 3x2): por cada grupo completo de N
     * unidades solo se cobran M: el resto (menos de N unidades) paga
     * precio completo, sin descuento parcial de grupo.
     */
    private function descuentoNxm(ReglaPrecio $regla, float $precioUnitario, int $cantidad): float
    {
        $compra = (int) $regla->cantidad_compra;
        $paga = (int) $regla->cantidad_paga;

        if ($compra <= 0 || $paga <= 0 || $paga >= $compra) {
            return 0.0;
        }

        $gruposCompletos = intdiv($cantidad, $compra);
        $resto = $cantidad % $compra;
        $unidadesAPagar = ($gruposCompletos * $paga) + $resto;
        $unidadesGratis = $cantidad - $unidadesAPagar;

        return round($unidadesGratis * $precioUnitario, 2);
    }

    /**
     * bundle: cada grupo completo de cantidad_compra unidades cuesta
     * precio_bundle fijo (total, no por unidad); el resto paga precio
     * unitario normal.
     */
    private function descuentoBundle(ReglaPrecio $regla, float $precioUnitario, int $cantidad): float
    {
        $compra = (int) $regla->cantidad_compra;
        $precioBundle = (float) $regla->precio_bundle;

        if ($compra <= 0 || $precioBundle <= 0) {
            return 0.0;
        }

        $gruposCompletos = intdiv($cantidad, $compra);
        $resto = $cantidad % $compra;
        $totalConBundle = ($gruposCompletos * $precioBundle) + ($resto * $precioUnitario);
        $totalSinDescuento = $precioUnitario * $cantidad;

        return round(max($totalSinDescuento - $totalConBundle, 0), 2);
    }
}
