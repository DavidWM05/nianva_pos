<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Support;

use App\Modules\Inventario\Exceptions\UnidadPiezaNoExisteException;
use App\Modules\Inventario\Models\ProductoVariante;
use Illuminate\Support\Facades\DB;

/**
 * DAT-03: la unidad que guarda la foto de una línea. Es la de la variante; si no tiene, la
 * variante se vende en la «Pieza» global (`pz`, sembrada en la migración de unidades). Es el
 * único lugar que decide esto: las Actions y los servicios no completan la unidad por su cuenta.
 *
 * Lee unidades_medida por tabla porque UnidadesMedida es una extensión y Inventario (base) no
 * depende de ella; producto_variantes ya referencia esa tabla por llave foránea.
 */
final class UnidadDeVariante
{
    public const ABREVIATURA_PIEZA = 'pz';

    /** @throws UnidadPiezaNoExisteException si la variante no tiene unidad y no existe «Pieza». */
    public static function idPara(ProductoVariante $variante): int
    {
        $propia = $variante->getAttribute('unidad_medida_id');
        if ($propia !== null) {
            return (int) $propia;
        }

        $pieza = DB::table('unidades_medida')
            ->whereNull('tenant_id')
            ->where('abreviatura', self::ABREVIATURA_PIEZA)
            ->value('id');

        if ($pieza === null) {
            throw new UnidadPiezaNoExisteException((int) $variante->getKey());
        }

        return (int) $pieza;
    }
}
