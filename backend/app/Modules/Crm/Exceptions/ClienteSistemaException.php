<?php

declare(strict_types=1);

namespace App\Modules\Crm\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

/**
 * "Publico General" (es_sistema) no se edita ni se desactiva. Conserva el 403 y el mensaje del
 * abort() al que reemplaza.
 */
class ClienteSistemaException extends ExcepcionNegocio
{
    public function __construct(public readonly int $clienteId)
    {
        parent::__construct('Este es un cliente de sistema y no se puede modificar.');
    }

    public function errorCode(): string
    {
        return 'cliente_sistema';
    }

    public function status(): int
    {
        return 403;
    }

    /** @return array<string, int> */
    public function contexto(): array
    {
        return [
            'cliente_id' => $this->clienteId,
        ];
    }
}
