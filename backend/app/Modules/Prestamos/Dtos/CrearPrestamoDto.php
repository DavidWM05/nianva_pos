<?php

namespace App\Modules\Prestamos\Dtos;

final readonly class CrearPrestamoDto
{
    public function __construct(
        public ?int $proveedorId,
        public ?string $referencia,
        public float $monto,
        public ?float $interes,
        public string $fechaPrestamo,
        public ?string $fechaVencimiento,
        public ?string $notas,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function datos(): array
    {
        return [
            'proveedor_id' => $this->proveedorId,
            'referencia' => $this->referencia,
            'monto' => $this->monto,
            'interes' => $this->interes,
            'fecha_prestamo' => $this->fechaPrestamo,
            'fecha_vencimiento' => $this->fechaVencimiento,
            'notas' => $this->notas,
        ];
    }
}
