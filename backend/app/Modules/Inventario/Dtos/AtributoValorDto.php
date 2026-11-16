<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Dtos;

final readonly class AtributoValorDto
{
    /** @param  list<string>  $presentes */
    public function __construct(
        public ?string $valor,
        public ?int $orden,
        private array $presentes,
    ) {}

    /** @return array<string, mixed> */
    public function datosPresentes(): array
    {
        $datos = [];
        if (in_array('valor', $this->presentes, true)) {
            $datos['valor'] = $this->valor;
        }
        if (in_array('orden', $this->presentes, true)) {
            $datos['orden'] = $this->orden ?? 0;
        }

        return $datos;
    }
}
