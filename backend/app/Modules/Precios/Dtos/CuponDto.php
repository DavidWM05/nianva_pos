<?php

namespace App\Modules\Precios\Dtos;

final readonly class CuponDto
{
    /**
     * @param  list<string>  $presentes
     */
    public function __construct(
        public string $codigo,
        public string $nombre,
        public string $tipo,
        public float $valor,
        public ?int $usoMaximo,
        public ?int $usoMaximoPorCliente,
        public ?string $fechaInicio,
        public ?string $fechaFin,
        private array $presentes,
    ) {}

    /**
     * @return list<string>
     */
    public function camposPresentes(): array
    {
        return $this->presentes;
    }

    /**
     * @return array<string, mixed>
     */
    public function datosPresentes(): array
    {
        $datos = [];

        if (in_array('codigo', $this->presentes, true)) {
            $datos['codigo'] = $this->codigo;
        }
        if (in_array('nombre', $this->presentes, true)) {
            $datos['nombre'] = $this->nombre;
        }
        if (in_array('tipo', $this->presentes, true)) {
            $datos['tipo'] = $this->tipo;
        }
        if (in_array('valor', $this->presentes, true)) {
            $datos['valor'] = $this->valor;
        }
        if (in_array('uso_maximo', $this->presentes, true)) {
            $datos['uso_maximo'] = $this->usoMaximo;
        }
        if (in_array('uso_maximo_por_cliente', $this->presentes, true)) {
            $datos['uso_maximo_por_cliente'] = $this->usoMaximoPorCliente;
        }
        if (in_array('fecha_inicio', $this->presentes, true)) {
            $datos['fecha_inicio'] = $this->fechaInicio;
        }
        if (in_array('fecha_fin', $this->presentes, true)) {
            $datos['fecha_fin'] = $this->fechaFin;
        }

        return $datos;
    }
}
