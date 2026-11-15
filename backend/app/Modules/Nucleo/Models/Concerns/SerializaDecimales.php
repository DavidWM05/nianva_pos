<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Models\Concerns;

use App\Modules\Nucleo\Support\FormatoDecimal;

trait SerializaDecimales
{
    public function attributesToArray(): array
    {
        $datos = parent::attributesToArray();
        $casts = $this->getCasts();
        foreach ($datos as $campo => $valor) {
            $formato = FormatoDecimal::desdeCast($casts[$campo] ?? '');
            if ($valor !== null && $formato !== null) {
                $datos[$campo] = $formato->serializar($valor);
            }
        }

        return $datos;
    }
}
