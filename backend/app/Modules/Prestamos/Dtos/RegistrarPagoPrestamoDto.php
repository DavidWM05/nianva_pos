<?php

namespace App\Modules\Prestamos\Dtos;

final readonly class RegistrarPagoPrestamoDto
{
    public function __construct(
        public float $monto,
        public ?int $cajaSesionId,
        public ?string $notas,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function datosParaServicio(): array
    {
        return [
            'monto' => $this->monto,
            'caja_sesion_id' => $this->cajaSesionId,
            'notas' => $this->notas,
        ];
    }
}
