<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Support;

use App\Modules\Nucleo\Casts\CantidadDecimal;
use App\Modules\Nucleo\Casts\CantidadFormateada;
use App\Modules\Nucleo\Casts\CantidadFormateadaNullable;

enum FormatoDecimal
{
    case Dinero;
    case Cantidad;
    case CostoUnitario;

    public static function desdeCast(string $cast): ?self
    {
        return match ($cast) {
            'decimal:2' => self::Dinero,
            'decimal:3' => self::Cantidad,
            'decimal:4' => self::CostoUnitario,
            default => match (explode(':', $cast, 2)[0]) {
                CantidadDecimal::class, CantidadFormateada::class, CantidadFormateadaNullable::class => self::Cantidad,
                default => null,
            },
        };
    }

    public function serializar(string|int|float $valor): string
    {
        return match ($this) {
            self::Dinero => DecimalApi::dinero($valor),
            self::Cantidad => DecimalApi::cantidad($valor),
            self::CostoUnitario => DecimalApi::costoUnitario($valor),
        };
    }

    public function patron(): string
    {
        return match ($this) {
            self::Dinero => DecimalApi::PATRON_DINERO,
            self::Cantidad => DecimalApi::PATRON_CANTIDAD,
            self::CostoUnitario => DecimalApi::PATRON_CUATRO_DECIMALES,
        };
    }
}
