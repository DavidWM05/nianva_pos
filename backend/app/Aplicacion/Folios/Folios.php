<?php

declare(strict_types=1);

namespace App\Aplicacion\Folios;

use Illuminate\Support\Facades\DB;
use LogicException;

final class Folios
{
    public static function asignar(int $tenantId, int $sucursalId, string $tipo): string
    {
        if (DB::transactionLevel() === 0) {
            throw new LogicException('El folio se asigna dentro de la transacción del documento.');
        }

        $serie = ['tenant_id' => $tenantId, 'sucursal_id' => $sucursalId, 'tipo' => $tipo];

        // El alta concurrente de la primera fila usa la misma clave que la lectura bloqueante.
        DB::table('folio_contadores')->upsert([$serie + ['ultimo' => 0]], array_keys($serie), ['tipo']);

        $contador = DB::table('folio_contadores')->where($serie);
        $ultimo = (int) $contador->lockForUpdate()->sole()->ultimo;
        $siguiente = $ultimo + 1;
        $contador->update(['ultimo' => $siguiente]);

        return "{$tipo}-{$sucursalId}-{$siguiente}";
    }
}
