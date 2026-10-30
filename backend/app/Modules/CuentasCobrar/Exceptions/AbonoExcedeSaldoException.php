<?php

namespace App\Modules\CuentasCobrar\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class AbonoExcedeSaldoException extends ExcepcionNegocio
{
    public float $saldoPendiente;
    public float $montoAbono;

    public function __construct(float $saldoPendiente, float $montoAbono)
    {
        parent::__construct("El monto del abono ({$montoAbono}) excede el saldo pendiente ({$saldoPendiente}).");
        $this->saldoPendiente = $saldoPendiente;
        $this->montoAbono = $montoAbono;
    }

    public function errorCode(): string
    {
        return 'abono_excede_saldo';
    }

    public function contexto(): array
    {
        return [
            'saldo_pendiente' => $this->saldoPendiente,
            'monto_abono' => $this->montoAbono,
        ];
    }
}
