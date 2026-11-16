<?php

declare(strict_types=1);

namespace App\Modules\Configuracion\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * ARQ-07: un perfil de giro (datos de app/Modules/Configuracion/PerfilesGiro) para el selector
 * de configuracion: que atributos, unidades y categorias siembra y que modulos sugiere.
 */
class PerfilGiroResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        /** @var array{clave: string, nombre: string, atributos: list<array{nombre: string, valores: list<string>}>, unidades: list<array{nombre: string, abreviatura: string, tipo: string}>, categorias: list<string>, modulos_sugeridos: list<string>} $perfil */
        $perfil = $this->resource;

        return [
            'clave' => $perfil['clave'],
            'nombre' => $perfil['nombre'],
            /** @var list<array{nombre: string, valores: list<string>}> */
            'atributos' => $perfil['atributos'],
            /** @var list<string> */
            'unidades' => array_map(fn (array $unidad) => $unidad['abreviatura'], $perfil['unidades']),
            /** @var list<string> */
            'categorias' => $perfil['categorias'],
            /** @var list<string> */
            'modulos_sugeridos' => $perfil['modulos_sugeridos'],
        ];
    }
}
