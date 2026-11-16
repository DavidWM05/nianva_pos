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

    public static function multiplicar(int|float|string $a, int|float|string $b): int|float
    {
        $a = self::milesimas($a);
        $b = self::milesimas($b);
        $negativo = ($a < 0) !== ($b < 0);
        $a = abs($a);
        $b = abs($b);
        $divisor = 1000;
        $factores = [$a, $b];
        foreach ($factores as &$factor) {
            $valor = $factor;
            $mcd = $divisor;
            while ($mcd !== 0) {
                $resto = $valor % $mcd;
                $valor = $mcd;
                $mcd = $resto;
            }
            $factor = intdiv($factor, $valor);
            $divisor = intdiv($divisor, $valor);
        }
        unset($factor);
        [$a, $b] = $factores;
        if ($divisor !== 1) {
            throw new InvalidArgumentException('La cantidad en unidad base admite como máximo tres decimales.');
        }
        if ($b > 0 && $a > intdiv(self::MAXIMO_MILESIMAS, $b)) {
            throw new OverflowException('La cantidad en unidad base excede decimal(14,3).');
        }

        return self::desdeMilesimas(($negativo ? -1 : 1) * $a * $b);
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
