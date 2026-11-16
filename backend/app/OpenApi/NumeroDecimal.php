<?php

declare(strict_types=1);

namespace App\OpenApi;

use Dedoc\Scramble\Support\Generator\Types\NumberType;

/**
 * Numero de un cuerpo de peticion con un maximo de decimales (regla `decimal:min,max`). Se
 * serializa como `multipleOf` = 10^-max, que es como JSON Schema dice "a lo mas N decimales".
 * Hereda de NumberType para que `min`, `max` y `between` sigan aplicando.
 */
final class NumeroDecimal extends NumberType
{
    public function __construct(public readonly int $decimales)
    {
        parent::__construct('number');
    }

    public function multiplo(): float
    {
        return 10 ** -$this->decimales;
    }

    public function serializeAs31(): mixed
    {
        return $this->conMultiplo(parent::serializeAs31());
    }

    public function serializeAs32(): mixed
    {
        return $this->conMultiplo(parent::serializeAs32());
    }

    private function conMultiplo(mixed $serializado): mixed
    {
        if (! is_array($serializado)) {
            return $serializado;
        }

        return [...$serializado, 'multipleOf' => $this->multiplo()];
    }
}
