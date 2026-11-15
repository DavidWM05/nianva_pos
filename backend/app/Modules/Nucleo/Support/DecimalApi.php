<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Support;

final class DecimalApi
{
    public const PATRON_DINERO = '^-?[0-9]+\.[0-9]{2}$';

    public const PATRON_CANTIDAD = '^-?[0-9]+\.[0-9]{3}$';

    public static function dinero(string|int|float $valor): string
    {
        return Dinero::desde(is_float($valor) ? self::decimalCalculado($valor) : $valor)->aCadena();
    }

    public static function cantidad(string|int|float $valor): string
    {
        return Cantidad::cadena($valor);
    }

    private static function decimalCalculado(float $valor): string
    {
        $decimal = json_encode($valor, JSON_PRESERVE_ZERO_FRACTION | JSON_THROW_ON_ERROR);
        if (! preg_match('/^(-?)(\d+)(?:\.(\d+))?[eE]([+-]?\d+)$/', $decimal, $partes)) {
            return $decimal;
        }
        $digitos = $partes[2].$partes[3];
        $posicion = strlen($partes[2]) + (int) $partes[4];
        if ($posicion <= 0) {
            return $partes[1].'0.'.str_repeat('0', -$posicion).$digitos;
        }
        if ($posicion >= strlen($digitos)) {
            return $partes[1].$digitos.str_repeat('0', $posicion - strlen($digitos));
        }

        return $partes[1].substr($digitos, 0, $posicion).'.'.substr($digitos, $posicion);
    }
}
