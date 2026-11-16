<?php

declare(strict_types=1);

namespace App\Modules\Precios\Support;

use Carbon\CarbonImmutable;

/**
 * Contexto de una cotización: tenant, sucursal, cliente y fecha de vigencia.
 * La lista explícita prevalece sobre la asignada al cliente.
 * sucursalId es null cuando la operación no tiene sucursal. Hoy el precio
 * no depende de ella: las listas actuales tienen alcance de tenant.
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
