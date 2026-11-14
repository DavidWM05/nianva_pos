<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Exceptions;

/**
 * DAT-10: el ultimo usuario activo con el rol admin de un tenant no se desactiva ni pierde ese
 * rol; el tenant se quedaria sin nadie que pueda administrarlo.
 */
class UltimoAdminException extends ExcepcionNegocio
{
    public function __construct(public readonly int $usuarioId)
    {
        parent::__construct('Es el último administrador activo: no puedes desactivarlo ni quitarle el rol de administrador.');
    }

    public function errorCode(): string
    {
        return 'ultimo_admin';
    }

    /** @return array<string, int> */
    public function contexto(): array
    {
        return [
            'usuario_id' => $this->usuarioId,
        ];
    }
}
