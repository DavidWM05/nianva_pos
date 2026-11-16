<?php

namespace App\Modules\UnidadesMedida\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\UnidadesMedida\Dtos\UnidadMedidaDto;
use Illuminate\Validation\Rule;

class GuardarUnidadMedidaRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        // DAT-09: la abreviatura es unica por tenant, como el indice (tenant_id, abreviatura);
        // en edicion se ignora la propia unidad.
        $unidadId = $this->route('id');
        $abreviaturaUnica = Rule::unique('unidades_medida', 'abreviatura')
            ->where('tenant_id', $this->tenantId())
            ->ignore($unidadId);

        if ($unidadId !== null) {
            return [
                'nombre' => ['sometimes', 'string', 'max:50'],
                'abreviatura' => ['sometimes', 'string', 'max:10', $abreviaturaUnica],
                'tipo' => ['sometimes', 'string', 'in:entero,fraccionario'],
                'activo' => ['sometimes', 'boolean'],
            ];
        }

        return [
            'nombre' => ['required', 'string', 'max:50'],
            'abreviatura' => ['required', 'string', 'max:10', $abreviaturaUnica],
            'tipo' => ['required', 'string', 'in:entero,fraccionario'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['abreviatura.unique' => 'Ya existe una unidad con esa abreviatura.'];
    }

    public function toDto(): UnidadMedidaDto
    {
        $v = $this->validated();

        return new UnidadMedidaDto(
            nombre: isset($v['nombre']) ? (string) $v['nombre'] : null,
            abreviatura: isset($v['abreviatura']) ? (string) $v['abreviatura'] : null,
            tipo: isset($v['tipo']) ? (string) $v['tipo'] : null,
            activo: isset($v['activo']) ? (bool) $v['activo'] : null,
            presentes: array_keys($v),
        );
    }
}
