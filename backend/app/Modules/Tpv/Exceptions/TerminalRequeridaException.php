<?php

declare(strict_types=1);

namespace App\Modules\Tpv\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

final class TerminalRequeridaException extends ExcepcionNegocio
{
    public function __construct()
    {
        parent::__construct('Elige una terminal de la sucursal antes de abrir caja.');
    }

    public function errorCode(): string
    {
        return 'terminal_requerida';
    }
}
