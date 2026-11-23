<?php

declare(strict_types=1);

namespace App\Modules\Metricas\Services;

use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Metricas\Valores\ContextoMetricas;
use App\Modules\Metricas\Valores\TotalesVentasComerciales;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Scopes\SucursalScope;
use App\Modules\Nucleo\Support\DecimalApi;
use App\Modules\Nucleo\Support\Dinero;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaDetalle;
use App\Modules\Tpv\Models\VentaPago;
use DateTimeImmutable;
use DateTimeZone;
use Illuminate\Database\Eloquent\Builder;

final class VentasComerciales
{
    public function totales(ContextoMetricas $contexto): TotalesVentasComerciales
    {
        $ventas = $this->ventas($contexto)
            ->selectRaw('count(*) as tickets, coalesce(sum(total), 0) as vendido')
            ->firstOrFail();

        $devoluciones = $this->devoluciones($contexto)
            ->selectRaw("
                coalesce(sum(case when tipo = 'devolucion' then monto_devolucion else 0 end), 0) as devuelto,
                coalesce(sum(case when tipo = 'cambio' then monto_devolucion else 0 end), 0) as recibido,
                coalesce(sum(case when tipo = 'cambio' then monto_cambio else 0 end), 0) as entregado
            ")
            ->firstOrFail();

        return new TotalesVentasComerciales(
            Dinero::desde(DecimalApi::dinero($ventas->getAttribute('vendido'))),
            (int) $ventas->getAttribute('tickets'),
            Dinero::desde(DecimalApi::dinero($devoluciones->getAttribute('devuelto'))),
            Dinero::desde(DecimalApi::dinero($devoluciones->getAttribute('recibido'))),
            Dinero::desde(DecimalApi::dinero($devoluciones->getAttribute('entregado'))),
        );
    }

    /** @return Builder<Venta> */
    public function ventas(ContextoMetricas $contexto): Builder
    {
        return Venta::query()->withoutGlobalScope(SucursalScope::class)
            ->where('tenant_id', $contexto->tenantId)
            ->when($contexto->sucursalId !== null, fn ($consulta) => $consulta->where('sucursal_id', $contexto->sucursalId))
            ->where('estado', 'completada')
            ->where('es_venta_sombra', false)
            ->where('fecha', '>=', $contexto->periodo->inicioUtc)
            ->where('fecha', '<', $contexto->periodo->finUtcExclusivo);
    }

    /**
     * @return array{por_sucursal: list<array{sucursal_id: int, sucursal_nombre: ?string, total: string, numero_ventas: int}>, por_metodo_pago: list<array{metodo_pago_id: int, metodo_pago_nombre: ?string, total: string}>, top_productos: list<array{variante_id: int, producto_nombre: ?string, nombre: ?string, cantidad_vendida: string, total_vendido: string}>}
     */
    public function desgloses(ContextoMetricas $contexto): array
    {
        $base = $this->ventas($contexto);

        // Por sucursal
        $sucursales = Sucursal::sinTenant()->where('tenant_id', $contexto->tenantId)->pluck('nombre', 'id');
        $porSucursal = [];
        foreach ((clone $base)->selectRaw('sucursal_id, sum(total) as total, count(*) as numero_ventas')->groupBy('sucursal_id')->get() as $fila) {
            $id = (int) $fila->getAttribute('sucursal_id');
            $nombre = $sucursales->get($id);
            $porSucursal[] = [
                'sucursal_id' => $id,
                'sucursal_nombre' => $nombre === null ? null : (string) $nombre,
                'total' => DecimalApi::dinero($fila->getAttribute('total')),
                'numero_ventas' => (int) $fila->getAttribute('numero_ventas'),
            ];
        }

        // IDs de las ventas del período para cruzar contra pagos/detalles
        $ventaIds = (clone $base)->select('id');

        // Por método de pago
        $porMetodoPago = [];
        $pagos = VentaPago::query()->whereIn('venta_id', $ventaIds)
            ->selectRaw('metodo_pago_id, sum(monto) as total')
            ->groupBy('metodo_pago_id')
            ->with('metodoPago:id,nombre')
            ->get();
        foreach ($pagos as $pago) {
            $metodo = $pago->getRelation('metodoPago');
            $porMetodoPago[] = [
                'metodo_pago_id' => (int) $pago->getAttribute('metodo_pago_id'),
                'metodo_pago_nombre' => $metodo instanceof MetodoPago ? (string) $metodo->getAttribute('nombre') : null,
                'total' => DecimalApi::dinero($pago->getAttribute('total')),
            ];
        }

        // Top 10 productos por cantidad vendida
        $topProductos = [];
        $productos = VentaDetalle::query()->whereIn('venta_id', $ventaIds)
            ->selectRaw('variante_id, sum(cantidad) as cantidad_vendida, sum(subtotal) as total_vendido')
            ->groupBy('variante_id')
            ->orderByDesc('cantidad_vendida')
            ->orderBy('variante_id')
            ->limit(10)
            ->with(['variante.producto', 'variante.valoresAtributo.valor.atributo'])
            ->get();
        foreach ($productos as $fila) {
            $variante = $fila->getRelation('variante');
            $producto = $variante instanceof ProductoVariante ? $variante->getRelation('producto') : null;
            $topProductos[] = [
                'variante_id' => (int) $fila->getAttribute('variante_id'),
                'producto_nombre' => $producto instanceof Producto ? (string) $producto->getAttribute('nombre') : null,
                'nombre' => $variante instanceof ProductoVariante ? $variante->nombreDeAtributos() : null,
                'cantidad_vendida' => DecimalApi::cantidad($fila->getAttribute('cantidad_vendida')),
                'total_vendido' => DecimalApi::dinero($fila->getAttribute('total_vendido')),
            ];
        }

        return [
            'por_sucursal' => $porSucursal,
            'por_metodo_pago' => $porMetodoPago,
            'top_productos' => $topProductos,
        ];
    }

    /** @return Builder<Devolucion> */
    private function devoluciones(ContextoMetricas $contexto): Builder
    {
        return Devolucion::query()->withoutGlobalScope(SucursalScope::class)
            ->where('tenant_id', $contexto->tenantId)
            ->when($contexto->sucursalId !== null, fn ($consulta) => $consulta->where('sucursal_id', $contexto->sucursalId))
            ->where('fecha', '>=', $contexto->periodo->inicioUtc)
            ->where('fecha', '<', $contexto->periodo->finUtcExclusivo);
    }

    /** @return list<array{fecha: string, vendido: string, ventas_netas_comerciales: string}> */
    public function porDia(ContextoMetricas $contexto): array
    {
        $cero = Dinero::desde(0);
        $vendido = [];
        $neto = [];
        foreach ($this->ventas($contexto)->select(['fecha', 'total'])->cursor() as $venta) {
            $fecha = $this->fechaLocal((string) $venta->getRawOriginal('fecha'), $contexto->zona);
            $monto = Dinero::desde((string) $venta->getAttribute('total'));
            $vendido[$fecha] = ($vendido[$fecha] ?? $cero)->sumar($monto);
            $neto[$fecha] = ($neto[$fecha] ?? $cero)->sumar($monto);
        }

        foreach ($this->devoluciones($contexto)->select(['fecha', 'tipo', 'monto_devolucion', 'monto_cambio'])->cursor() as $devolucion) {
            $fecha = $this->fechaLocal((string) $devolucion->getRawOriginal('fecha'), $contexto->zona);
            $neto[$fecha] = ($neto[$fecha] ?? $cero)->restar(Dinero::desde((string) $devolucion->getAttribute('monto_devolucion')));
            if ($devolucion->getAttribute('tipo') === 'cambio') {
                $neto[$fecha] = $neto[$fecha]->sumar(Dinero::desde((string) $devolucion->getAttribute('monto_cambio')));
            }
        }

        $serie = [];
        $dia = new DateTimeImmutable($contexto->periodo->desde, $contexto->zona);
        while (($fecha = $dia->format('Y-m-d')) <= $contexto->periodo->hasta) {
            $serie[] = [
                'fecha' => $fecha,
                'vendido' => ($vendido[$fecha] ?? $cero)->aCadena(),
                'ventas_netas_comerciales' => ($neto[$fecha] ?? $cero)->aCadena(),
            ];
            $dia = $dia->modify('tomorrow');
        }

        return $serie;
    }

    /**
     * @return array{filas: list<array{tipo: string, folio: ?string, fecha: string, importe_comercial: string}>, total: int}
     */
    public function detalle(ContextoMetricas $contexto, int $pagina, int $filas): array
    {
        $ventas = $this->ventas($contexto)->select('id', 'folio', 'fecha')
            ->selectRaw("'venta' as tipo, total as importe");
        $devoluciones = $this->devoluciones($contexto)->select('id', 'folio', 'fecha', 'tipo')
            ->selectRaw("case when tipo = 'cambio' then monto_cambio - monto_devolucion else -monto_devolucion end as importe");
        $detalle = $ventas->toBase()->unionAll($devoluciones->toBase())
            ->orderByDesc('fecha')->orderBy('tipo')->orderByDesc('id')
            ->paginate($filas, ['*'], 'page', $pagina);

        return [
            'filas' => array_values(array_map(fn ($fila) => [
                'tipo' => (string) $fila->tipo,
                'folio' => $fila->folio === null ? null : (string) $fila->folio,
                'fecha' => (new DateTimeImmutable((string) $fila->fecha, new DateTimeZone('UTC')))
                    ->setTimezone($contexto->zona)->format(DATE_ATOM),
                'importe_comercial' => DecimalApi::dinero($fila->importe),
            ], $detalle->items())),
            'total' => $detalle->total(),
        ];
    }

    private function fechaLocal(string $utc, DateTimeZone $zona): string
    {
        return (new DateTimeImmutable($utc, new DateTimeZone('UTC')))->setTimezone($zona)->format('Y-m-d');
    }

    /** @return array<int, list<array{variante_id: int, producto_nombre: ?string, cantidad_base: string}>> */
    public function rankingVariantes(ContextoMetricas $contexto): array
    {
        $filas = VentaDetalle::query()->whereIn('venta_id', $this->ventas($contexto)->select('id'))
            ->whereNotNull('unidad_medida_id')
            ->selectRaw('unidad_medida_id, variante_id, sum(round(cantidad * factor, 3)) as cantidad_base')
            ->groupBy('unidad_medida_id', 'variante_id')
            ->orderBy('unidad_medida_id')
            ->orderByDesc('cantidad_base')
            ->orderBy('variante_id')
            ->with('variante.producto')
            ->get();

        $grupos = [];
        foreach ($filas as $fila) {
            $unidad = (int) $fila->getAttribute('unidad_medida_id');
            if (count($grupos[$unidad] ?? []) >= 10) {
                continue;
            }
            $variante = $fila->getRelation('variante');
            $producto = $variante instanceof ProductoVariante ? $variante->getRelation('producto') : null;
            $grupos[$unidad][] = [
                'variante_id' => (int) $fila->getAttribute('variante_id'),
                'producto_nombre' => $producto instanceof Producto ? (string) $producto->getAttribute('nombre') : null,
                'cantidad_base' => DecimalApi::cantidad($fila->getAttribute('cantidad_base')),
            ];
        }

        return $grupos;
    }
}
