<?php

declare(strict_types=1);

namespace App\Modules\Precios\Support;

use Carbon\CarbonImmutable;

/**
 * Contexto de una cotización: tenant, sucursal, cliente y fecha de vigencia.
 * Todavía no hay listas de precio; llegan en ARQ-05c.
 * sucursalId es null cuando la operación no tiene sucursal. Hoy el precio
 * no depende de ella; se usará con las listas de precio en ARQ-05c.
 */
final readonly class ContextoPrecio
{
    public function __construct(
        public int $tenantId,
        public ?int $sucursalId,
        public ?int $clienteId,
        public CarbonImmutable $fecha,
        public ?int $listaPrecioId = null,
    ) {}
}
