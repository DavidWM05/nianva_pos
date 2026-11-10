<?php

declare(strict_types=1);

namespace App\Modules\Precios\Services;

use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Scopes\TenantScope;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Precios\Exceptions\CuponInvalidoException;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Precios\Models\ReglaPrecio;
use App\Modules\Precios\Support\Carrito;
use App\Modules\Precios\Support\ContextoPrecio;
use App\Modules\Precios\Support\CotizacionPrecio;
use App\Modules\Precios\Support\CuponAplicado;
use App\Modules\Precios\Support\LineaPrecio;
use App\Modules\Precios\Support\ReglaAplicada;
use Illuminate\Database\Eloquent\Builder;
use InvalidArgumentException;

/**
 * Resuelve reglas_precio (por item, cascada variante > producto > categoria
 * > todo) y cupones (sobre el total del carrito) -- dos mecanismos
 * deliberadamente separados, nunca mezclados. cotizar() jamas
 * aplica mas de una regla de item a la vez: la cascada se detiene en el
 * primer nivel con una regla activa y vigente.
 */
final class PricingService
{
    /**
     * Cotiza las líneas y el cupón opcional del carrito para el tenant y la
     * sucursal del contexto. Devuelve precios, reglas, descuentos y totales
     * por línea y del carrito; la vigencia de reglas y cupones se evalúa
     * con la fecha del contexto.
     */
    public function cotizar(Carrito $carrito, ContextoPrecio $contexto): CotizacionPrecio
    {
        $lineas = [];
        $subtotal = 0.0;
        foreach ($carrito->lineas as $linea) {
            $variante = ProductoVariante::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->findOrFail($linea->varianteId);
            $producto = Producto::query()->withoutGlobalScope(TenantScope::class)->findOrFail((int) $variante->getAttribute('producto_id'));
            if ((int) $producto->getAttribute('tenant_id') !== $contexto->tenantId) {
                throw new InvalidArgumentException("La variante {$linea->varianteId} no pertenece al tenant {$contexto->tenantId}.");
            }
            $precioBase = (float) $producto->getAttribute('precio_venta');
            $regla = $this->reglaAplicable($variante, $producto, $contexto);
            $descuento = $regla === null ? 0.0 : $this->calcularDescuentoPorTipo($regla, $precioBase, $linea->cantidad);
            $reglas = [];
            if ($regla !== null) {
                $prioridad = match ($regla->getAttribute('aplica_a')) {
                    'variante' => 1, 'producto' => 2, 'categoria' => 3, default => 4,
                };
                $reglas[] = new ReglaAplicada((int) $regla->getKey(), (string) $regla->getAttribute('tipo'), $prioridad, false);
            }
            $totalLinea = round(round($precioBase * $linea->cantidad, 2) - $descuento, 2);
            $lineas[] = new LineaPrecio($linea->varianteId, $linea->cantidad, $precioBase, null, $reglas, $descuento, 0.0, $totalLinea);
            $subtotal += $totalLinea;
        }
        $subtotal = $carrito->subtotalReferencia ?? round($subtotal, 2);
        $cupon = $carrito->codigoCupon === null ? null : $this->cotizarCupon($carrito->codigoCupon, $subtotal, $contexto);

        return new CotizacionPrecio($lineas, $subtotal, $cupon, round($subtotal - ($cupon->descuento ?? 0.0), 2));
    }

    /**
     * Aplica un cupon sobre el total del carrito. Independiente por
     * completo de la cascada de reglas -- no recibe variante ni cantidad,
     * solo el total ya calculado.
     *
     * @throws CuponInvalidoException si el codigo no existe, esta inactivo o fuera de vigencia.
     */
    private function cotizarCupon(string $codigo, float $totalCarrito, ContextoPrecio $contexto): CuponAplicado
    {
        $cupon = $this->vigentes(Cupon::query()->withoutGlobalScope(TenantScope::class)->where('codigo', $codigo), $contexto)->first();
        if ($cupon === null) {
            throw new CuponInvalidoException($codigo);
        }

        // uso_maximo / uso_maximo_por_cliente: el conteo de usos vive en la
        // tabla ventas (modulo TPV, aun no construido) -- ese modulo es el
        // que sabe cuantas veces se aplico un cupon. Aqui solo se valida
        // vigencia (activo + rango de fechas), no consumo.
        $descuento = $cupon->getAttribute('tipo') === 'porcentaje'
            ? round($totalCarrito * ((float) $cupon->getAttribute('valor') / 100), 2)
            : min(round((float) $cupon->getAttribute('valor'), 2), round($totalCarrito, 2));

        return new CuponAplicado((int) $cupon->getKey(), $descuento, $cupon);
    }

    /**
     * Cascada de prioridad: variante > producto > categoria > todo. Se
     * detiene en el primer nivel con una regla activa y vigente -- nunca
     * combina reglas de dos niveles distintos.
     */
    private function reglaAplicable(ProductoVariante $variante, Producto $producto, ContextoPrecio $contexto): ?ReglaPrecio
    {
        if ($regla = $this->reglaPorNivel('variante', ['variante_id' => (int) $variante->getKey()], $contexto)) {
            return $regla;
        }

        if ($regla = $this->reglaPorNivel('producto', ['producto_id' => (int) $producto->getKey()], $contexto)) {
            return $regla;
        }

        if ($producto->getAttribute('categoria_id') !== null) {
            if ($regla = $this->reglaPorNivel('categoria', ['categoria_id' => (int) $producto->getAttribute('categoria_id')], $contexto)) {
                return $regla;
            }
        }

        return $this->reglaPorNivel('todo', [], $contexto);
    }

    /**
     * @param  array<string, int>  $condiciones
     *
     * Si mas de una regla activa y vigente compite en el MISMO nivel, gana
     * la de id mas alto (la configurada mas recientemente). No especificado
     * por el documento -- criterio de desempate propio, documentado aqui.
     */
    private function reglaPorNivel(string $aplicaA, array $condiciones, ContextoPrecio $contexto): ?ReglaPrecio
    {
        return $this->vigentes(
            ReglaPrecio::query()->withoutGlobalScope(TenantScope::class)->where('aplica_a', $aplicaA)->where($condiciones),
            $contexto,
        )->orderByDesc('id')->first();
    }

    /**
     * @template TModel of \Illuminate\Database\Eloquent\Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    private function vigentes(Builder $query, ContextoPrecio $contexto): Builder
    {
        $hoy = $contexto->fecha->toDateString();

        return $query->where(fn (Builder $q) => $q->where('tenant_id', $contexto->tenantId)->orWhereNull('tenant_id'))
            ->where('activo', true)
            ->where(fn (Builder $q) => $q->whereNull('fecha_inicio')->orWhereDate('fecha_inicio', '<=', $hoy))
            ->where(fn (Builder $q) => $q->whereNull('fecha_fin')->orWhereDate('fecha_fin', '>=', $hoy));
    }

    private function calcularDescuentoPorTipo(ReglaPrecio $regla, float $precioUnitario, int $cantidad): float
    {
        return match ($regla->getAttribute('tipo')) {
            'porcentaje' => round($precioUnitario * $cantidad * ((float) $regla->getAttribute('valor') / 100), 2),
            'monto_fijo' => min(round((float) $regla->getAttribute('valor') * $cantidad, 2), round($precioUnitario * $cantidad, 2)),
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
        $compra = (int) $regla->getAttribute('cantidad_compra');
        $paga = (int) $regla->getAttribute('cantidad_paga');

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
        $compra = (int) $regla->getAttribute('cantidad_compra');
        $precioBundle = (float) $regla->getAttribute('precio_bundle');

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
