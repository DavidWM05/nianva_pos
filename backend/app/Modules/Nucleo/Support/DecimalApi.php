<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Support;

final class DecimalApi
{
    public const PATRON_DINERO = '^-?[0-9]+\.[0-9]{2}$';

    public const PATRON_CANTIDAD = '^-?[0-9]+\.[0-9]{3}$';

    /** Tasas decimal(7,4) y costos unitarios con 4 decimales. */
    public const PATRON_CUATRO_DECIMALES = '^-?[0-9]+\.[0-9]{4}$';

    public static function dinero(string|int|float $valor): string
    {
        return Dinero::desde(is_float($valor) ? self::decimalCalculado($valor) : $valor)->aCadena();
    }

    public static function cantidad(string|int|float $valor): string
    {
        return Cantidad::cadena($valor);
    }

    /**
     * Tasa (porcentaje decimal(7,4)) como cadena con 4 decimales, redondeada a la mitad hacia
     * afuera en la quinta cifra, igual que dinero y cantidad en la suya.
     */
    public static function tasa(string|int|float $valor): string
    {
        $decimal = is_float($valor) ? self::decimalCalculado($valor) : (string) $valor;
        if (! preg_match('/\A([+-]?)(\d+)(?:\.(\d+))?\z/', $decimal, $partes)) {
            throw new \InvalidArgumentException('La tasa debe ser un decimal con punto y sin separadores.');
        }
        $fraccion = str_pad($partes[3] ?? '', 5, '0');
        $digitos = ltrim($partes[2], '0').substr($fraccion, 0, 4);
        if ($fraccion[4] >= '5') {
            $digitos = self::incrementar($digitos);
        }
        $digitos = str_pad(ltrim($digitos, '0'), 5, '0', STR_PAD_LEFT);
        $resultado = substr($digitos, 0, -4).'.'.substr($digitos, -4);

        return ($partes[1] === '-' && trim($digitos, '0') !== '' ? '-' : '').$resultado;
    }

    private static function incrementar(string $digitos): string
    {
        $i = strlen($digitos) - 1;
        while ($i >= 0 && $digitos[$i] === '9') {
            $digitos[$i] = '0';
            $i--;
        }

        return $i < 0 ? '1'.$digitos : substr_replace($digitos, (string) ((int) $digitos[$i] + 1), $i, 1);
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
