<?php

namespace App\Modules\Payroll\Exceptions;

use RuntimeException;

class NominaYaPagadaException extends RuntimeException
{
    public function __construct(int $nominaId = 0)
    {
        parent::__construct("La nómina {$nominaId} ya está pagada.");
    }
}
