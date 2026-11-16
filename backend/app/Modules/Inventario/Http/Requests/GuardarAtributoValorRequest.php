<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Http\Requests;

use App\Modules\Inventario\Dtos\AtributoValorDto;
use App\Modules\Inventario\Models\Atributo;
use App\Modules\Inventario\Models\AtributoValor;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use Illuminate\Validation\Rule;

/** Alta (con {atributo} en la ruta) y edicion (con {valor}) de un valor de atributo. */
class GuardarAtributoValorRequest extends SolicitudNegocio
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $valor = $this->route('valor');
        $atributo = $this->route('atributo');
        $atributoId = $valor instanceof AtributoValor ? $valor->atributo_id : ($atributo instanceof Atributo ? $atributo->id : null);

        return [
            // En la API el texto del valor es `nombre`; en la tabla, `valor`.
            'nombre' => [
                'required', 'string', 'max:60',
                Rule::unique('atributo_valores', 'valor')
                    ->where('atributo_id', $atributoId)
                    ->ignore($valor instanceof AtributoValor ? $valor->id : null),
            ],
            'orden' => ['nullable', 'integer', 'min:0', 'max:65535'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['nombre.unique' => 'Ese atributo ya tiene ese valor.'];
    }

    public function toDto(): AtributoValorDto
    {
        $v = $this->validated();

        return new AtributoValorDto(
            valor: (string) $v['nombre'],
            orden: isset($v['orden']) ? (int) $v['orden'] : null,
            presentes: array_map(fn (string $campo) => $campo === 'nombre' ? 'valor' : $campo, array_keys($v)),
        );
    }
}
