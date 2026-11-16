<?php

declare(strict_types=1);

namespace App\Aplicacion\Inventario;

use App\Modules\Inventario\Models\AtributoValor;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\VarianteAtributoValor;
use Illuminate\Support\Facades\DB;

/**
 * ARQ-07: reemplaza los valores de atributo de una variante por los dados (ids de
 * atributo_valores ya validados por GuardarProductoVarianteRequest: del tenant y uno por
 * atributo). Deja la variante con la relacion cargada para su Resource.
 */
final class AsignarAtributosVariante
{
    /** @param  list<int>  $valores */
    public function ejecutar(ProductoVariante $variante, array $valores): ProductoVariante
    {
        DB::transaction(function () use ($variante, $valores): void {
            VarianteAtributoValor::query()->where('variante_id', $variante->id)->delete();

            foreach (AtributoValor::query()->whereIn('id', $valores)->get(['id', 'atributo_id']) as $valor) {
                VarianteAtributoValor::create([
                    'variante_id' => $variante->id,
                    'atributo_id' => $valor->atributo_id,
                    'atributo_valor_id' => $valor->id,
                ]);
            }
        });

        return $variante->load('valoresAtributo.valor.atributo');
    }
}
