<?php

declare(strict_types=1);

namespace App\Modules\Precios\Services;

use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Scopes\TenantScope;
use App\Modules\Nucleo\Scopes\TenantScopeViaRelacion;
use App\Modules\Nucleo\Support\Cantidad;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Precios\Exceptions\CuponInvalidoException;
use App\Modules\Precios\Exceptions\CuponNoCombinableException;
use App\Modules\Precios\Exceptions\ListaPrecioNoDisponibleException;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Precios\Models\ListaPrecio;
use App\Modules\Precios\Models\ListaPrecioCliente;
use App\Modules\Precios\Models\ListaPrecioItem;
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
 * Resuelve reglas por prioridad configurable, nivel de cascada e id.
 * Solo combina una regla siguiente si ella y la primera son combinables;
 * el cupón se calcula después sobre las líneas elegibles según el tenant.
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
        $tasas = [];
        $lista = null;
        $listaConsultada = false;
        $configuracion = ConfiguracionTenant::sinTenant()->where('tenant_id', $contexto->tenantId)->firstOrFail();
        foreach ($carrito->lineas as $linea) {
            $variante = ProductoVariante::query()->withoutGlobalScope(TenantScopeViaRelacion::class)->findOrFail($linea->varianteId);
            $producto = Producto::query()->withoutGlobalScope(TenantScope::class)->findOrFail((int) $variante->getAttribute('producto_id'));
            if ((int) $producto->getAttribute('tenant_id') !== $contexto->tenantId) {
                throw new InvalidArgumentException("La variante {$linea->varianteId} no pertenece al tenant {$contexto->tenantId}.");
            }
            $precioBase = Dinero::desde((string) ($variante->getAttribute('precio_venta') ?? $producto->getAttribute('precio_venta')));
            if (! $listaConsultada) {
                $lista = $this->listaAplicable($contexto);
                $listaConsultada = true;
            }
            [$precioBase, $listaAplicada] = $this->precioDeLista($lista, $variante, $producto, $precioBase, $contexto);
            $tasas[] = [DecimalApi::tasa($producto->getAttribute('tasa_iva') ?? $configuracion->getAttribute('tasa_iva_default')), (bool) $producto->getAttribute('exento_iva')];
            $aplicables = $this->reglasAplicables($variante, $producto, $contexto);
            $descuento = Dinero::desde(0);
            $totalLinea = $precioBase->multiplicar(Cantidad::cadena($linea->cantidad));
            $reglas = [];
            $primeraCombinable = (bool) (($aplicables[0] ?? null)?->getAttribute('combinable') ?? false);
            foreach ($aplicables as $indice => $regla) {
                $combinable = (bool) $regla->getAttribute('combinable');
                if ($indice > 0 && (! $primeraCombinable || ! $combinable)) {
                    continue;
                }
                $descuentoRegla = $this->menor($indice === 0
                    ? $this->calcularDescuentoPorTipo($regla, $precioBase, $linea->cantidad)
                    : $this->descuentoSecuencial($regla, $totalLinea, $linea->cantidad), $totalLinea);
                $totalLinea = $totalLinea->restar($descuentoRegla);
                $descuento = $descuento->sumar($descuentoRegla);
                $reglas[] = new ReglaAplicada((int) $regla->getKey(), (string) $regla->getAttribute('tipo'), (int) $regla->getAttribute('prioridad'), $combinable, (float) $descuentoRegla->aCadena());
            }
            $lineas[] = new LineaPrecio($linea->varianteId, $linea->cantidad, (float) $precioBase->aCadena(), $listaAplicada, $reglas, (float) $descuento->aCadena(), 0.0, (float) $totalLinea->aCadena());
            $subtotal = $subtotal->sumar($totalLinea);
        }
        $importeSubtotal = $carrito->subtotalReferencia === null ? $subtotal->aCadena() : $this->referenciaDecimal($carrito->subtotalReferencia);
        $combinaCupon = (bool) $configuracion->getAttribute('cupon_combinable_con_promociones');
        $elegibles = array_values(array_filter($lineas, static fn (LineaPrecio $linea): bool => $combinaCupon || $linea->reglas === []));
        $baseCupon = $importeSubtotal;
        if (! $combinaCupon && $lineas !== []) {
            $base = Dinero::desde(0);
            foreach ($elegibles as $linea) {
                $base = $base->sumar(Dinero::desde((string) $linea->total));
            }
            $baseCupon = $base->aCadena();
        }
        $cotizacionCupon = $carrito->codigoCupon === null ? null : $this->cotizarCupon($carrito->codigoCupon, $baseCupon, $contexto);
        if ($carrito->codigoCupon !== null && $lineas !== [] && $elegibles === []) {
            throw new CuponNoCombinableException($carrito->codigoCupon);
        }

        $descuentoCupon = $cotizacionCupon['descuento'] ?? Dinero::desde(0);
        $cupon = $cotizacionCupon === null ? null : new CuponAplicado((int) $cotizacionCupon['modelo']->getKey(), (float) $descuentoCupon->aCadena(), $cotizacionCupon['modelo']);
        $total = Dinero::desde($importeSubtotal)->restar($descuentoCupon);

        $impuestos = Dinero::desde(0);
        if ($lineas !== []) {
            $pesos = array_map(static fn (LineaPrecio $linea): Dinero => Dinero::desde(! $combinaCupon && $linea->reglas !== [] ? '0' : (string) $linea->total), $lineas);
            $reparto = $descuentoCupon->repartir($pesos);
            foreach ($lineas as $indice => $linea) {
                [$tasa, $exento] = $tasas[$indice];
                $impuesto = $exento ? Dinero::desde(0) : Dinero::desde((string) $linea->total)->restar($reparto[$indice])->impuestoIncluido($tasa);
                $impuestos = $impuestos->sumar($impuesto);
                $lineas[$indice] = new LineaPrecio($linea->varianteId, $linea->cantidad, $linea->precioBase, $linea->listaAplicada, $linea->reglas, $linea->descuento, (float) $impuesto->aCadena(), $linea->total, $tasa, $exento);
            }
        }

        return new CotizacionPrecio($lineas, $carrito->subtotalReferencia ?? (float) $subtotal->aCadena(), $cupon, (float) $total->aCadena(), (float) $impuestos->aCadena());
    }

    private function listaAplicable(ContextoPrecio $contexto): ?ListaPrecio
    {
        $id = $contexto->listaPrecioId;
        if ($id === null && $contexto->clienteId !== null) {
            $id = ListaPrecioCliente::query()->withoutGlobalScope(TenantScope::class)->where('tenant_id', $contexto->tenantId)->where('cliente_id', $contexto->clienteId)->value('lista_precio_id');
        }
        if ($id === null) {
            return null;
        }
        $lista = ListaPrecio::query()->withoutGlobalScope(TenantScope::class)->where('tenant_id', $contexto->tenantId)->where('activo', true)->whereKey((int) $id)->first();
        if ($lista === null) {
            throw new ListaPrecioNoDisponibleException((int) $id);
        }

        return $lista;
    }

    /** @return array{Dinero, int|null} */
    private function precioDeLista(?ListaPrecio $lista, ProductoVariante $variante, Producto $producto, Dinero $resuelto, ContextoPrecio $contexto): array
    {
        if ($lista === null) {
            return [$resuelto, null];
        }
        $items = ListaPrecioItem::query()->withoutGlobalScope(TenantScope::class)->where('tenant_id', $contexto->tenantId)->where('lista_precio_id', $lista->getKey());
        $item = (clone $items)->where('variante_id', $variante->getKey())->first()
            ?? $items->where('producto_id', $producto->getKey())->first();

        return $item === null ? [$resuelto, null] : [Dinero::desde((string) $item->getAttribute('precio')), (int) $lista->getKey()];
    }

    /**
     * Aplica un cupón al importe elegible ya calculado; no recibe variante
     * ni cantidad. Conserva la referencia sin redondear para calcular el
     * porcentaje y acota el descuento al importe redondeado.
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

        return ['modelo' => $cupon, 'descuento' => $this->menor($descuento, Dinero::desde($totalCarrito))];
    }

    /**
     * Reúne la cascada completa; la prioridad configurable se compara antes
     * del nivel variante > producto > categoría > todo.
     * Si dos reglas comparten prioridad y nivel, gana el id más alto
     * (la configurada más recientemente).
     *
     * @return list<ReglaPrecio>
     */
    private function reglasAplicables(ProductoVariante $variante, Producto $producto, ContextoPrecio $contexto): array
    {
        $query = ReglaPrecio::query()->withoutGlobalScope(TenantScope::class)->where(function (Builder $query) use ($variante, $producto): void {
            $query->where('aplica_a', 'todo')
                ->orWhere(fn (Builder $q) => $q->where('aplica_a', 'variante')->where('variante_id', $variante->getKey()))
                ->orWhere(fn (Builder $q) => $q->where('aplica_a', 'producto')->where('producto_id', $producto->getKey()));
            if ($producto->getAttribute('categoria_id') !== null) {
                $query->orWhere(fn (Builder $q) => $q->where('aplica_a', 'categoria')->where('categoria_id', $producto->getAttribute('categoria_id')));
            }
        });
        $reglas = $this->vigentes($query, $contexto)->get()->all();
        $orden = static fn (ReglaPrecio $regla): array => [-(int) $regla->getAttribute('prioridad'), match ($regla->getAttribute('aplica_a')) {
            'variante' => 1, 'producto' => 2, 'categoria' => 3, default => 4,
        }, -(int) $regla->getKey()];
        usort($reglas, static fn (ReglaPrecio $a, ReglaPrecio $b): int => $orden($a) <=> $orden($b));

        return $reglas;
    }

    private function descuentoSecuencial(ReglaPrecio $regla, Dinero $total, int|float $cantidad): Dinero
    {
        $tipo = $regla->getAttribute('tipo');
        if ($tipo === 'porcentaje') {
            return $total->porcentaje((string) ($regla->getAttribute('porcentaje') ?? '0'));
        }
        if ($tipo === 'monto_fijo') {
            return $this->menor(Dinero::desdeProducto((string) ($regla->getAttribute('monto') ?? '0'), Cantidad::cadena($cantidad)), $total);
        }
        $milesimas = Cantidad::milesimas($cantidad);
        $compra = Cantidad::milesimas($regla->getAttribute('cantidad_compra') ?? 0);
        if ($milesimas <= 0 || $compra <= 0) {
            return Dinero::desde(0);
        }
        $grupos = intdiv($milesimas, $compra);
        if ($tipo === 'nxm') {
            $paga = Cantidad::milesimas($regla->getAttribute('cantidad_paga') ?? 0);

            return $paga <= 0 || $paga >= $compra ? Dinero::desde(0) : $total->proporcion($grupos * ($compra - $paga), $milesimas);
        }
        if ($tipo === 'bundle') {
            $precio = Dinero::desde((string) ($regla->getAttribute('precio_bundle') ?? '0'));
            if ($precio->centavos <= 0) {
                return Dinero::desde(0);
            }
            $conBundle = $precio->multiplicar($grupos)->sumar($total->proporcion($milesimas % $compra, $milesimas));

            return $conBundle->comparar($total) >= 0 ? Dinero::desde(0) : $total->restar($conBundle);
        }

        return Dinero::desde(0);
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
