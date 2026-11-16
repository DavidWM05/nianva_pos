<?php

namespace App\Modules\Inventario\Http\Requests;

use App\Modules\Inventario\Dtos\CategoriaDto;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use Illuminate\Validation\Rule;

class GuardarCategoriaRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        // DAT-09: el nombre es unico por tenant; en edicion se ignora la propia categoria.
        $categoria = $this->route('categoria');
        $categoriaId = $categoria instanceof Categoria ? $categoria->id : null;

        return [
            'nombre' => [
                'required', 'string', 'max:120',
                Rule::unique('categorias', 'nombre')->where('tenant_id', $this->tenantId())->ignore($categoriaId),
            ],
            'descripcion' => ['nullable', 'string'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return ['nombre.unique' => 'Ya existe una categoría con ese nombre.'];
    }

    public function toDto(): CategoriaDto
    {
        $v = $this->validated();

        return new CategoriaDto(
            nombre: (string) $v['nombre'],
            descripcion: isset($v['descripcion']) ? (string) $v['descripcion'] : null,
            presentes: array_keys($v),
        );
    }
}
