<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

/**
 * Un usuario no puede desactivarse a si mismo, sin importar el permiso: se quedaria sin poder
 * volver a entrar a revertirlo. Conserva el 403 y el mensaje del abort() al que reemplaza.
 */
class DesactivarPropioUsuarioException extends ExcepcionNegocio
{
    public function __construct(public readonly int $usuarioId)
    {
        parent::__construct('No puedes desactivar tu propio usuario.');
    }

    public function errorCode(): string
    {
        return 'desactivar_propio_usuario';
    }

    public function status(): int
    {
        return 403;
    }

    /** @return array<string, int> */
    public function contexto(): array
    {
        return [
            'usuario_id' => $this->usuarioId,
        ];
    }
}
