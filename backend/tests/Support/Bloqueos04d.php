<?php

declare(strict_types=1);

namespace Tests\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/** Preparación del modelo para probar el núcleo dentro de RefreshDatabase. */
final class Bloqueos04d
{
    /**
     * @template T of Model
     *
     * @param  T  $modelo
     * @return T
     */
    public static function modelo(Model $modelo): Model
    {
        if (DB::transactionLevel() === 0) {
            throw new \LogicException('El test debe preparar una transacción.');
        }

        return $modelo->newQuery()->whereKey($modelo->getKey())->lockForUpdate()->firstOrFail();
    }
}
