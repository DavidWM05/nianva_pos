<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

/**
 * DAT-03: la foto de una línea necesita costo. Si la variante no tiene stock en la sucursal y el
 * catálogo tampoco tiene costo (ni la variante ni su producto), la operación falla en vez de
 * guardar 0.
 */
class CostoNoDisponibleException extends ExcepcionNegocio
{
    public function __construct(private readonly int $varianteId, private readonly int $sucursalId)
    {
        parent::__construct('No hay costo para registrar la línea: la variante no tiene stock en la sucursal ni costo en el catálogo.');
    }

    public function errorCode(): string
    {
        return 'costo_no_disponible';
    }

    /** @return array<string, mixed> */
    public function contexto(): array
    {
        return ['variante_id' => $this->varianteId, 'sucursal_id' => $this->sucursalId];
    }
}
