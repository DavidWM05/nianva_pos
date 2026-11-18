<?php

declare(strict_types=1);

namespace App\Modules\Precios\Support;

final readonly class ReglaAplicada
{
    /**
     * Prioridad configurable de negocio; el nivel de cascada solo desempata. El nombre se copia
     * a la foto de la línea (DAT-03).
     */
    public function __construct(public int $id, public string $tipo, public int $prioridad, public bool $combinable, public float $descuento, private string $nombre) {}

    /** Nombre copiado a la foto; privado para no cambiar la forma pública del resultado del cálculo. */
    public function nombre(): string
    {
        return $this->nombre;
    }
}
