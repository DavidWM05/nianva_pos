<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Support;

use InvalidArgumentException;
use OverflowException;

final readonly class Dinero
{
    private function __construct(public int $centavos) {}

    public static function desde(string|int $importe): self
    {
        return self::redondear($importe);
    }

    public static function desdeProducto(string|int $importe, string|int $cantidad): self
    {
        return self::producto($importe, $cantidad, 0);
    }

    public static function porcentajeDe(string|int $importe, string|int $tasa): self
    {
        return self::producto($importe, $tasa, 2);
    }

    public static function desdeResta(string|int $importe, string|int $descuento): self
    {
        [$negativoA, $a, $escalaA] = self::partes($importe);
        [$negativoB, $b, $escalaB] = self::partes($descuento);
        $escala = max($escalaA, $escalaB);
        $a .= str_repeat('0', $escala - $escalaA);
        $b .= str_repeat('0', $escala - $escalaB);
        $negativoB = ! $negativoB;
        if ($negativoA === $negativoB) {
            $digitos = self::sumarDigitos($a, $b);
            $negativo = $negativoA;
        } elseif (self::compararDigitos($a, $b) >= 0) {
            $digitos = self::restarDigitos($a, $b);
            $negativo = $negativoA;
        } else {
            $digitos = self::restarDigitos($b, $a);
            $negativo = $negativoB;
        }

        return self::redondear(self::decimal($digitos, $escala, $negativo));
    }

    public function sumar(self $otro): self
    {
        if (($otro->centavos > 0 && $this->centavos > PHP_INT_MAX - $otro->centavos)
            || ($otro->centavos < 0 && $this->centavos < PHP_INT_MIN - $otro->centavos)) {
            throw new OverflowException('La suma de dinero excede los centavos representables.');
        }

        return new self($this->centavos + $otro->centavos);
    }

    public function restar(self $otro): self
    {
        if (($otro->centavos > 0 && $this->centavos < PHP_INT_MIN + $otro->centavos)
            || ($otro->centavos < 0 && $this->centavos > PHP_INT_MAX + $otro->centavos)) {
            throw new OverflowException('La resta de dinero excede los centavos representables.');
        }

        return new self($this->centavos - $otro->centavos);
    }

    public function multiplicar(string|int $cantidad): self
    {
        return self::desdeProducto($this->aCadena(), $cantidad);
    }

    public function porcentaje(string|int $tasa): self
    {
        return self::porcentajeDe($this->aCadena(), $tasa);
    }

    public function comparar(self $otro): int
    {
        return $this->centavos <=> $otro->centavos;
    }

    public function aCadena(): string
    {
        return self::decimal(ltrim((string) $this->centavos, '-'), 2, $this->centavos < 0);
    }

    public static function redondear(string|int $importe): self
    {
        [$negativo, $digitos, $escala] = self::partes($importe);
        if ($escala <= 2) {
            $centavos = $digitos.str_repeat('0', 2 - $escala);
        } else {
            $corte = strlen($digitos) - $escala + 2;
            $centavos = $corte > 0 ? substr($digitos, 0, $corte) : '0';
            $siguiente = $corte >= 0 ? ($digitos[$corte] ?? '0') : '0';
            if ($siguiente >= '5') {
                $centavos = self::sumarDigitos($centavos, '1');
            }
        }
        $centavos = ltrim($centavos, '0') ?: '0';
        $limite = $negativo ? substr((string) PHP_INT_MIN, 1) : (string) PHP_INT_MAX;
        if (self::compararDigitos($centavos, $limite) > 0) {
            throw new OverflowException('El importe excede los centavos representables.');
        }

        return new self((int) (($negativo ? '-' : '').$centavos));
    }

    /** @return array{bool, string, int} */
    private static function partes(string|int $importe): array
    {
        if (! preg_match('/\A([+-]?)(\d+)(?:\.(\d+))?\z/', (string) $importe, $partes)) {
            throw new InvalidArgumentException('El importe debe ser un decimal con punto y sin separadores.');
        }

        return [$partes[1] === '-', ltrim($partes[2].($partes[3] ?? ''), '0') ?: '0', strlen($partes[3] ?? '')];
    }

    private static function producto(string|int $importe, string|int $factor, int $escalaExtra): self
    {
        [$negativoA, $a, $escalaA] = self::partes($importe);
        [$negativoB, $b, $escalaB] = self::partes($factor);
        $digitos = self::multiplicarDigitos($a, $b);

        return self::redondear(self::decimal($digitos, $escalaA + $escalaB + $escalaExtra, $negativoA !== $negativoB));
    }

    private static function decimal(string $digitos, int $escala, bool $negativo): string
    {
        $digitos = str_pad($digitos, $escala + 1, '0', STR_PAD_LEFT);
        $valor = $escala === 0 ? $digitos : substr($digitos, 0, -$escala).'.'.substr($digitos, -$escala);

        return ($negativo ? '-' : '').$valor;
    }

    private static function compararDigitos(string $a, string $b): int
    {
        $a = ltrim($a, '0') ?: '0';
        $b = ltrim($b, '0') ?: '0';

        return strlen($a) <=> strlen($b) ?: strcmp($a, $b);
    }

    private static function sumarDigitos(string $a, string $b): string
    {
        $resultado = '';
        $acarreo = 0;
        for ($i = strlen($a) - 1, $j = strlen($b) - 1; $i >= 0 || $j >= 0 || $acarreo !== 0; $i--, $j--) {
            $suma = ($i >= 0 ? (int) $a[$i] : 0) + ($j >= 0 ? (int) $b[$j] : 0) + $acarreo;
            $resultado = ($suma % 10).$resultado;
            $acarreo = intdiv($suma, 10);
        }

        return $resultado;
    }

    private static function restarDigitos(string $a, string $b): string
    {
        $resultado = '';
        $prestamo = 0;
        for ($i = strlen($a) - 1, $j = strlen($b) - 1; $i >= 0; $i--, $j--) {
            $diferencia = (int) $a[$i] - ($j >= 0 ? (int) $b[$j] : 0) - $prestamo;
            $prestamo = $diferencia < 0 ? 1 : 0;
            $resultado = ($diferencia + ($prestamo * 10)).$resultado;
        }

        return ltrim($resultado, '0') ?: '0';
    }

    private static function multiplicarDigitos(string $a, string $b): string
    {
        $resultado = array_fill(0, strlen($a) + strlen($b), 0);
        for ($i = strlen($a) - 1; $i >= 0; $i--) {
            for ($j = strlen($b) - 1; $j >= 0; $j--) {
                $posicion = $i + $j + 1;
                $producto = ((int) $a[$i] * (int) $b[$j]) + $resultado[$posicion];
                $resultado[$posicion] = $producto % 10;
                $resultado[$posicion - 1] += intdiv($producto, 10);
            }
        }

        return ltrim(implode('', $resultado), '0') ?: '0';
    }
}
