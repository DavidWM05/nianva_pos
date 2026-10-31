<?php

namespace App\Modules\VentasPlazos\Dtos;

final readonly class CrearPlanPagoDto
{
    /**
     * @param  list<string>  $presentes
     */
    public function __construct(
        public int $numeroCuotas,
        public ?float $tasaInteres,
        public ?string $periodicidad,
        public ?string $fechaInicio,
        private array $presentes,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function datosParaServicio(): array
    {
        $datos = ['numero_cuotas' => $this->numeroCuotas];

        if (in_array('tasa_interes', $this->presentes, true)) {
            $datos['tasa_interes'] = $this->tasaInteres;
        }
        if (in_array('periodicidad', $this->presentes, true)) {
            $datos['periodicidad'] = $this->periodicidad;
        }
        if (in_array('fecha_inicio', $this->presentes, true)) {
            $datos['fecha_inicio'] = $this->fechaInicio;
        }

        return $datos;
    }
}
