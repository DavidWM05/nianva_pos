<?php

declare(strict_types=1);

namespace App\OpenApi;

use Dedoc\Scramble\Support\Type\StringType;
use Dedoc\Scramble\Support\Type\Type;

final class TipoDecimal extends StringType
{
    public function __construct(public readonly string $patron) {}

    public function toString(): string
    {
        return 'decimal-api<'.$this->patron.'>';
    }

    public function isSame(Type $type): bool
    {
        return $type instanceof self && $type->patron === $this->patron;
    }
}
