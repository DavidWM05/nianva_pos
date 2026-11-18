<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Support;

use App\Modules\Nucleo\Exceptions\ProyeccionNoActualizadaException;
use Illuminate\Database\Eloquent\Model;

/**
 * DAT-04: el saldo de un documento (caja, cuenta, plan, nota) es la proyección de su libro. Se
 * actualiza en la misma transacción que el renglón, y solo si sigue valiendo lo que se leyó: si el
 * UPDATE afecta cero filas, la operación falla. Un solo lugar para esa regla en todos los libros de
 * dinero; el de stock la aplica en InventarioService.
 */
final class Proyeccion
{
    /**
     * @param  array<string, mixed>  $cambios  la columna del saldo con su valor nuevo y, si aplica, otras columnas del documento.
     *
     * @throws ProyeccionNoActualizadaException
     */
    public static function actualizar(Model $documento, string $columnaSaldo, string $saldoLeido, array $cambios): void
    {
        $filas = $documento->newQueryWithoutScopes()
            ->whereKey($documento->getKey())
            ->where($columnaSaldo, $saldoLeido)
            ->update($cambios);

        if ($filas !== 1) {
            throw new ProyeccionNoActualizadaException($documento->getTable(), (int) $documento->getKey());
        }

        $documento->forceFill($cambios)->syncOriginal();
    }
}
