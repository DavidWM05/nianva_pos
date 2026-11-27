<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

final class LimitePlanExcedidoException extends ExcepcionNegocio
{
    public function __construct(
        private readonly string $recurso,
        private readonly string $operacion,
        private readonly int $limite,
        private readonly int $uso,
    ) {
        parent::__construct('Se alcanzó el límite de '.$recurso.' de la concesión.');
    }

    public function errorCode(): string
    {
        return 'limite_plan_excedido';
    }

    /** @return array{recurso: string, operacion: string, limite: int, uso: int} */
    public function contexto(): array
    {
        return ['recurso' => $this->recurso, 'operacion' => $this->operacion, 'limite' => $this->limite, 'uso' => $this->uso];
    }
}
