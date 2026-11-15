<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Support;

use Illuminate\Contracts\Validation\ValidationRule;

final class ReglasCantidad
{
    /** @return list<string> */
    public static function decimal(bool $permiteCero = false): array
    {
        return ['numeric', 'decimal:0,3', $permiteCero ? 'min:0' : 'min:0.001', 'max:99999999999.999'];
    }

    /** @return list<string|ValidationRule> */
    public static function paraVariante(int $tenantId, string $campoVariante = 'variante_id', ?int $varianteId = null): array
    {
        $reglas = self::decimal();
        if ($tenantId > 0) {
            $reglas[] = new CantidadDeVariante($tenantId, $campoVariante, $varianteId);
        }

        return $reglas;
    }

    /**
     * @param  list<string>  $campos
     * @return array<string, string>
     */
    public static function mensajes(array $campos): array
    {
        $mensajes = [];
        foreach ($campos as $campo) {
            $mensajes[$campo.'.numeric'] = 'La cantidad debe ser un número.';
            $mensajes[$campo.'.decimal'] = 'La cantidad admite como máximo tres decimales.';
            $mensajes[$campo.'.min'] = 'La cantidad está por debajo del mínimo permitido.';
            $mensajes[$campo.'.max'] = 'La cantidad excede el máximo permitido.';
        }

        return $mensajes;
    }
}
