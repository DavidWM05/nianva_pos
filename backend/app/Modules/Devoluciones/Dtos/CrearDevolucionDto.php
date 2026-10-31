<?php

namespace App\Modules\Devoluciones\Dtos;

final readonly class CrearDevolucionDto
{
    /**
     * @param  list<ItemDevueltoDto>  $itemsDevueltos
     * @param  list<ItemNuevoDto>  $itemsNuevos
     * @param  list<PagoDevolucionDto>  $pagos
     */
    public function __construct(
        public int $ventaId,
        public string $tipo,
        public array $itemsDevueltos,
        public array $itemsNuevos,
        public array $pagos,
        public ?string $motivo,
        public string $tipoReembolso,
    ) {}
}
