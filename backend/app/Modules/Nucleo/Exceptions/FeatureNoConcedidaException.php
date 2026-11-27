<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

final class FeatureNoConcedidaException extends ExcepcionNegocio
{
    public function __construct(private readonly string $feature)
    {
        parent::__construct('La concesión no incluye esta función.');
    }

    public function errorCode(): string
    {
        return 'feature_no_concedida';
    }

    public function status(): int
    {
        return 403;
    }

    /** @return array{feature: string} */
    public function contexto(): array
    {
        return ['feature' => $this->feature];
    }
}
