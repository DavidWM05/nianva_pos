<?php

declare(strict_types=1);

namespace App\Modules\Precios\Support;

/**
 * DAT-02b: reglas de precio y cupones guardan el porcentaje y el monto en columnas propias.
 * Cada tipo usa la suya (porcentaje solo con tipo porcentaje, monto solo con monto_fijo; nxm y
 * bundle sin ninguno) y la otra llega null o ausente. Lo comparten GuardarReglaPrecioRequest y
 * GuardarCuponRequest.
 */
final class ReglasPorcentajeMonto
{
    /** @return list<string> */
    public static function porcentaje(): array
    {
        return ['nullable', 'numeric', 'decimal:0,4', 'min:0', 'max:100'];
    }

    /** @return list<string> */
    public static function monto(): array
    {
        return ['nullable', 'numeric', 'decimal:0,2', 'min:0'];
    }

    /**
     * Errores por tipo: el campo que toca es obligatorio y el que no toca debe ir vacio.
     *
     * @param  'reglas'|'cupones'  $entidad
     * @return array<string, list<string>>
     */
    public static function errores(string $tipo, mixed $porcentaje, mixed $monto, string $entidad): array
    {
        $singular = $entidad === 'reglas' ? 'regla' : 'cupón';
        $errores = [];

        if ($tipo === 'porcentaje' && $porcentaje === null) {
            $errores['porcentaje'] = ["El porcentaje es obligatorio para este tipo de {$singular}."];
        }
        if ($tipo === 'monto_fijo' && $monto === null) {
            $errores['monto'] = ["El monto es obligatorio para este tipo de {$singular}."];
        }
        if ($tipo !== 'porcentaje' && $porcentaje !== null) {
            $errores['porcentaje'] = ["El porcentaje solo aplica a {$entidad} de porcentaje; envíalo vacío."];
        }
        if ($tipo !== 'monto_fijo' && $monto !== null) {
            $errores['monto'] = ["El monto solo aplica a {$entidad} de monto fijo; envíalo vacío."];
        }

        return $errores;
    }

    /** El porcentaje del tipo (null si no le toca). */
    public static function porcentajeDelTipo(string $tipo, mixed $porcentaje): ?string
    {
        return $tipo === 'porcentaje' && $porcentaje !== null ? (string) $porcentaje : null;
    }

    /** El monto del tipo (null si no le toca). */
    public static function montoDelTipo(string $tipo, mixed $monto): ?string
    {
        return $tipo === 'monto_fijo' && $monto !== null ? (string) $monto : null;
    }
}
