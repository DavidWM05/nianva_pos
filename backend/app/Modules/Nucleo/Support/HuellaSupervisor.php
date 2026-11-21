<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Support;

final class HuellaSupervisor
{
    /** @param array<mixed> $datos */
    public static function de(array $datos): string
    {
        return hash('sha256', json_encode(self::ordenar($datos), JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION));
    }

    /**
     * @param  array<mixed>  $datos
     * @return array<mixed>
     */
    private static function ordenar(array $datos): array
    {
        if (! array_is_list($datos)) {
            ksort($datos);
        }

        return array_map(static fn (mixed $valor): mixed => is_array($valor) ? self::ordenar($valor) : $valor, $datos);
    }
}
