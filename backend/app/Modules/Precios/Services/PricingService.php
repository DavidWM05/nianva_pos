<?php

declare(strict_types=1);

namespace App\Modules\Precios\Services;

use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Scopes\TenantScope;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Nucleo\Support\Cantidad;
use App\Modules\Nucleo\Support\Dinero;
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
        $subtotal = Dinero::desde(0);
        foreach ($carrito->lineas as $linea) {
            $variante = ProductoVariante::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->findOrFail($linea->varianteId);
            $producto = Producto::query()->withoutGlobalScope(TenantScope::class)->findOrFail((int) $variante->getAttribute('producto_id'));
            if ((int) $producto->getAttribute('tenant_id') !== $contexto->tenantId) {
                throw new InvalidArgumentException("La variante {$linea->varianteId} no pertenece al tenant {$contexto->tenantId}.");
            }
            $precioBase = Dinero::desde((string) $producto->getAttribute('precio_venta'));
            $regla = $this->reglaAplicable($variante, $producto, $contexto);
            $descuento = $regla === null ? Dinero::desde(0) : $this->calcularDescuentoPorTipo($regla, $precioBase, $linea->cantidad);
            $reglas = [];
            if ($regla !== null) {
                $prioridad = match ($regla->getAttribute('aplica_a')) {
                    'variante' => 1, 'producto' => 2, 'categoria' => 3, default => 4,
                };
                $reglas[] = new ReglaAplicada((int) $regla->getKey(), (string) $regla->getAttribute('tipo'), $prioridad, false);
            }
            $totalLinea = $precioBase->multiplicar(Cantidad::cadena($linea->cantidad))->restar($descuento);
            $lineas[] = new LineaPrecio($linea->varianteId, $linea->cantidad, (float) $precioBase->aCadena(), null, $reglas, (float) $descuento->aCadena(), 0.0, (float) $totalLinea->aCadena());
            $subtotal = $subtotal->sumar($totalLinea);
        }
        $importeSubtotal = $carrito->subtotalReferencia === null ? $subtotal->aCadena() : $this->referenciaDecimal($carrito->subtotalReferencia);
        $cotizacionCupon = $carrito->codigoCupon === null ? null : $this->cotizarCupon($carrito->codigoCupon, $importeSubtotal, $contexto);

        $descuentoCupon = $cotizacionCupon['descuento'] ?? Dinero::desde(0);
        $cupon = $cotizacionCupon === null ? null : new CuponAplicado((int) $cotizacionCupon['modelo']->getKey(), (float) $descuentoCupon->aCadena(), $cotizacionCupon['modelo']);
        $total = Dinero::desdeResta($importeSubtotal, $descuentoCupon->aCadena());

        return new CotizacionPrecio($lineas, $carrito->subtotalReferencia ?? (float) $subtotal->aCadena(), $cupon, (float) $total->aCadena());
    }

    /**
     * Aplica un cupon sobre el total del carrito. Independiente por
     * completo de la cascada de reglas -- no recibe variante ni cantidad,
     * solo el total ya calculado.
     *
     * @return array{modelo: Cupon, descuento: Dinero}
     *
     * @throws CuponInvalidoException si el codigo no existe, esta inactivo o fuera de vigencia.
     */
    private function cotizarCupon(string $codigo, string $totalCarrito, ContextoPrecio $contexto): array
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
            ? Dinero::porcentajeDe($totalCarrito, (string) $cupon->getAttribute('porcentaje'))
            : $this->menor(Dinero::desde((string) $cupon->getAttribute('monto')), Dinero::desde($totalCarrito));

        return ['modelo' => $cupon, 'descuento' => $descuento];
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

    private function calcularDescuentoPorTipo(ReglaPrecio $regla, Dinero $precioUnitario, int|float $cantidad): Dinero
    {
        return match ($regla->getAttribute('tipo')) {
            'porcentaje' => $precioUnitario->multiplicarPorcentaje(Cantidad::cadena($cantidad), (string) ($regla->getAttribute('porcentaje') ?? '0')),
            'monto_fijo' => $this->menor(Dinero::desdeProducto((string) ($regla->getAttribute('monto') ?? '0'), Cantidad::cadena($cantidad)), $precioUnitario->multiplicar(Cantidad::cadena($cantidad))),
            'nxm' => $this->descuentoNxm($regla, $precioUnitario, $cantidad),
            'bundle' => $this->descuentoBundle($regla, $precioUnitario, $cantidad),
            default => Dinero::desde(0),
        };
    }

    /**
     * nxm ("compra N paga M", ej. 3x2): por cada grupo completo de N
     * unidades solo se cobran M: el resto (menos de N unidades) paga
     * precio completo, sin descuento parcial de grupo.
     */
    private function descuentoNxm(ReglaPrecio $regla, Dinero $precioUnitario, int|float $cantidad): Dinero
    {
        $compra = Cantidad::numero($regla->getAttribute('cantidad_compra') ?? 0);
        $paga = Cantidad::numero($regla->getAttribute('cantidad_paga') ?? 0);

        if ($compra <= 0 || $paga <= 0 || $paga >= $compra) {
            return Dinero::desde(0);
        }

        $gruposCompletos = intdiv(Cantidad::milesimas($cantidad), Cantidad::milesimas($compra));
        $resto = Cantidad::desdeMilesimas(Cantidad::milesimas($cantidad) % Cantidad::milesimas($compra));
        $unidadesAPagar = ($gruposCompletos * $paga) + $resto;
        $unidadesGratis = $cantidad - $unidadesAPagar;

        return $precioUnitario->multiplicar(Cantidad::cadena($unidadesGratis));
    }

    /**
     * bundle: cada grupo completo de cantidad_compra unidades cuesta
     * precio_bundle fijo (total, no por unidad); el resto paga precio
     * unitario normal.
     */
    private function descuentoBundle(ReglaPrecio $regla, Dinero $precioUnitario, int|float $cantidad): Dinero
    {
        $compra = Cantidad::numero($regla->getAttribute('cantidad_compra') ?? 0);
        $precioBundle = Dinero::desde((string) ($regla->getAttribute('precio_bundle') ?? '0'));

        if ($compra <= 0 || $precioBundle->comparar(Dinero::desde(0)) <= 0) {
            return Dinero::desde(0);
        }

        $gruposCompletos = intdiv(Cantidad::milesimas($cantidad), Cantidad::milesimas($compra));
        $resto = Cantidad::desdeMilesimas(Cantidad::milesimas($cantidad) % Cantidad::milesimas($compra));
        $totalConBundle = $precioBundle->multiplicar($gruposCompletos)->sumar($precioUnitario->multiplicar(Cantidad::cadena($resto)));
        $totalSinDescuento = $precioUnitario->multiplicar(Cantidad::cadena($cantidad));

        $descuento = $totalSinDescuento->restar($totalConBundle);

        return $descuento->comparar(Dinero::desde(0)) > 0 ? $descuento : Dinero::desde(0);
    }

    private function menor(Dinero $a, Dinero $b): Dinero
    {
        return $a->comparar($b) <= 0 ? $a : $b;
    }

    // El DTO público conserva float. Aquí se expande su representación textual
    // sin operar en binario ni redondear la referencia antes del descuento.
    private function referenciaDecimal(float $importe): string
    {
        $decimal = (string) $importe;
        if (! preg_match('/\A([+-]?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)\z/', $decimal, $partes)) {
            return $decimal;
        }
        $digitos = $partes[2].$partes[3];
        $posicion = strlen($partes[2]) + (int) $partes[4];
        if ($posicion <= 0) {
            return $partes[1].'0.'.str_repeat('0', -$posicion).$digitos;
        }
        if ($posicion >= strlen($digitos)) {
            return $partes[1].$digitos.str_repeat('0', $posicion - strlen($digitos));
        }

        return $partes[1].substr($digitos, 0, $posicion).'.'.substr($digitos, $posicion);
    }
}
