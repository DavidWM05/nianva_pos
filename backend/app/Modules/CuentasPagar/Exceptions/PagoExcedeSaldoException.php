<?php

namespace App\Modules\CuentasPagar\Exceptions;

use App\Modules\Nucleo\Exceptions\ExcepcionNegocio;

class PagoExcedeSaldoException extends ExcepcionNegocio
{
    public float $saldoPendiente;

    public float $montoPago;

    public function __construct(float $saldoPendiente, float $montoPago)
    {
        parent::__construct("El monto del pago ({$montoPago}) excede el saldo pendiente ({$saldoPendiente}).");
        $this->saldoPendiente = $saldoPendiente;
        $this->montoPago = $montoPago;
    }

    public function errorCode(): string
    {
        return 'pago_excede_saldo';
    }

    public function contexto(): array
    {
        return [
            'saldo_pendiente' => $this->saldoPendiente,
            'monto_pago' => $this->montoPago,
        ];
    }
}
