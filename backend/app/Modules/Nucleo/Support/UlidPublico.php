<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

/**
 * DAT-08 (D-4): una referencia publicada (`venta_id`, `nota_credito_id`…) lleva el ulid del
 * registro relacionado, nunca su id interno. Las llaves foráneas siguen en bigint; esto solo
 * traduce al armar la respuesta.
 */
final class UlidPublico
{
    /**
     * Ulid del modelo de una relación BelongsTo. Usa la relación cargada; si falta, la carga una
     * vez (un listado debe cargarla con with() para no hacer una consulta por fila).
     */
    public static function de(Model $modelo, string $relacion): ?string
    {
        if (! $modelo->relationLoaded($relacion)) {
            $modelo->loadMissing($relacion);
        }
        $relacionado = $modelo->getRelation($relacion);

        return $relacionado instanceof Model ? (string) $relacionado->getAttribute('ulid') : null;
    }

    /**
     * Id interno de un ulid recibido en la entrada, ya validado con su regla de existencia por
     * tenant (ReglasTenant::existeUlid o la regla por relación). Lo usan los toDto(): Services y
     * Actions siguen recibiendo el id.
     */
    public static function idInterno(string $tabla, string $ulid): int
    {
        $id = DB::table($tabla)->where('ulid', strtolower($ulid))->value('id');
        if ($id === null) {
            throw new \LogicException("{$tabla}: el ulid validado no existe.");
        }

        return (int) $id;
    }

    /**
     * Ulid de una fila por su id interno cuando el modelo no puede declarar la relación (un
     * módulo base que referencia a una extensión, ARQ-03). Solo para el contrato de salida.
     */
    public static function deTabla(string $tabla, mixed $id): ?string
    {
        if ($id === null) {
            return null;
        }
        $ulid = DB::table($tabla)->where('id', (int) $id)->value('ulid');

        return $ulid === null ? null : (string) $ulid;
    }
}
