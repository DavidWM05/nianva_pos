<?php

declare(strict_types=1);

namespace App\Modules\Precios\Services;

use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Scopes\TenantScope;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Exceptions\CuponInvalidoException;
use App\Modules\Precios\Models\Cupon;
use App\Modules\Precios\Models\ReglaPrecio;
use App\Modules\Precios\Support\Carrito;
use App\Modules\Precios\Support\ContextoPrecio;
use App\Modules\Precios\Support\LineaCarrito;
use App\Modules\Precios\Support\ResultadoCupon;
use App\Modules\Precios\Support\ResultadoDescuento;
use Carbon\CarbonImmutable;

/** @deprecated Compatibilidad de firmas anteriores; la lógica vive en PricingService::cotizar(). */
class PrecioService
{
    public function __construct(private readonly PricingService $pricingService) {}

    /** @deprecated Usa PricingService::cotizar() con un Carrito y ContextoPrecio. */
    public function calcularDescuento(ProductoVariante $variante, int $cantidad): ResultadoDescuento
    {
        $producto = Producto::query()->withoutGlobalScope(TenantScope::class)->findOrFail((int) $variante->getAttribute('producto_id'));
        $contexto = new ContextoPrecio((int) $producto->getAttribute('tenant_id'), null, null, CarbonImmutable::now());
        $linea = $this->pricingService->cotizar(new Carrito([new LineaCarrito((int) $variante->getKey(), $cantidad)]), $contexto)->lineas[0];
        $regla = $linea->reglas === [] ? null : ReglaPrecio::query()->withoutGlobalScope(TenantScope::class)->findOrFail($linea->reglas[0]->id);

        return new ResultadoDescuento($regla, $linea->precioBase, $linea->cantidad, $linea->descuento);
    }

    /** @deprecated Usa PricingService::cotizar() con un Carrito y ContextoPrecio. */
    public function aplicarCupon(string $codigo, float $totalCarrito): ResultadoCupon
    {
        $modelo = Cupon::query()->where('codigo', $codigo)->first();
        $tenantId = app(TenantContext::class)->id() ?? (int) $modelo?->getAttribute('tenant_id');
        $resultado = $this->pricingService->cotizar(new Carrito([], $codigo, $totalCarrito), new ContextoPrecio($tenantId, null, null, CarbonImmutable::now()));
        $aplicado = $resultado->cupon ?? throw new CuponInvalidoException($codigo);

        return new ResultadoCupon($aplicado->modelo(), $totalCarrito, $aplicado->descuento);
    }
}
