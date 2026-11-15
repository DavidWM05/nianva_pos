<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Support;

use InvalidArgumentException;
use OverflowException;

final class Cantidad
{
    private const MAXIMO_MILESIMAS = 99999999999999;

    public static function milesimas(int|float|string $valor): int
    {
        $decimal = is_float($valor) ? number_format($valor, 3, '.', '') : (string) $valor;
        if (! preg_match('/\A([+-]?)(\d+)(?:\.(\d+))?\z/', $decimal, $partes)) {
            throw new InvalidArgumentException('La cantidad debe ser decimal.');
        }
        $entero = ltrim($partes[2], '0') ?: '0';
        if (strlen($entero) > 11) {
            throw new OverflowException('La cantidad excede decimal(14,3).');
        }
        $fraccion = str_pad($partes[3] ?? '', 4, '0');
        $milesimas = ((int) $entero * 1000) + (int) substr($fraccion, 0, 3);
        if ($fraccion[3] >= '5') {
            $milesimas++;
        }
        if ($milesimas > self::MAXIMO_MILESIMAS) {
            throw new OverflowException('La cantidad excede decimal(14,3).');
        }

        return $partes[1] === '-' ? -$milesimas : $milesimas;
    }

    public static function desdeMilesimas(int $milesimas): int|float
    {
        if ($milesimas < -self::MAXIMO_MILESIMAS || $milesimas > self::MAXIMO_MILESIMAS) {
            throw new OverflowException('La cantidad excede decimal(14,3).');
        }

        return $milesimas % 1000 === 0 ? intdiv($milesimas, 1000) : $milesimas / 1000;
    }

    public static function numero(int|float|string $valor): int|float
    {
        return self::desdeMilesimas(self::milesimas($valor));
    }

    public static function cadena(int|float|string $valor): string
    {
        $milesimas = self::milesimas($valor);
        $absoluto = abs($milesimas);

        return ($milesimas < 0 ? '-' : '').intdiv($absoluto, 1000).'.'.str_pad((string) ($absoluto % 1000), 3, '0', STR_PAD_LEFT);
    }

    public static function sumar(int|float|string $a, int|float|string $b): int|float
    {
        return self::desdeMilesimas(self::milesimas($a) + self::milesimas($b));
    }

    public static function restar(int|float|string $a, int|float|string $b): int|float
    {
        return self::desdeMilesimas(self::milesimas($a) - self::milesimas($b));
    }
}
