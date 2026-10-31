<?php

namespace App\Modules\Payroll\Dtos;

final readonly class EmpleadoDto
{
    public function __construct(
        public int $usuarioId,
        public int $sucursalId,
        public ?float $salarioBase,
        public ?string $tipoSalario,
        public ?string $fechaIngreso,
        public ?string $numeroSeguridadSocial,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function datos(): array
    {
        return [
            'usuario_id' => $this->usuarioId,
            'sucursal_id' => $this->sucursalId,
            'salario_base' => $this->salarioBase,
            'tipo_salario' => $this->tipoSalario,
            'fecha_ingreso' => $this->fechaIngreso,
            'numero_seguridad_social' => $this->numeroSeguridadSocial,
        ];
    }
}
