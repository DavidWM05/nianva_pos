<?php

namespace App\Modules\Crm\Dtos;

final readonly class PagarCuotaDto
{
    /**
     * @param  list<string>  $presentes
     */
    public function __construct(
        public int $cuotaId,
        public ?float $monto,
        private array $presentes,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function datosParaServicio(): array
    {
        $datos = ['cuota_id' => $this->cuotaId];

        if (in_array('monto', $this->presentes, true)) {
            $datos['monto'] = $this->monto;
        }

        return $datos;
    }
}
