<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Http\Requests;

use App\Modules\Inventario\Dtos\AtributoDto;
use App\Modules\Inventario\Models\Atributo;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use Illuminate\Validation\Rule;

class GuardarAtributoRequest extends SolicitudNegocio
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $atributo = $this->route('atributo');
        $atributoId = $atributo instanceof Atributo ? $atributo->id : null;

        return [
            'nombre' => [
                'required', 'string', 'max:60',
                Rule::unique('atributos', 'nombre')->where('tenant_id', $this->tenantId())->ignore($atributoId),
            ],
            'orden' => ['nullable', 'integer', 'min:0', 'max:65535'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return ['nombre.unique' => 'Ya existe un atributo con ese nombre.'];
    }

    public function toDto(): AtributoDto
    {
        $v = $this->validated();

        return new AtributoDto(
            nombre: (string) $v['nombre'],
            orden: isset($v['orden']) ? (int) $v['orden'] : null,
            presentes: array_keys($v),
        );
    }
}
