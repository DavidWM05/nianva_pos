<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Support;

enum AccionSupervisor: string
{
    case AnularVenta = 'ventas.anular';
    case DescuentoVenta = 'ventas.descuento';
    case CancelarApartado = 'apartados.cancelar';
    case CerrarCaja = 'caja.cerrar';
    case Reembolsar = 'devoluciones.reembolsar';

    public function permiso(): string
    {
        return match ($this) {
            self::DescuentoVenta => 'ventas.autorizar_descuento',
            self::Reembolsar => 'devoluciones.crear',
            default => $this->value,
        };
    }
}
