<?php

declare(strict_types=1);

namespace App\Modules\Precios\Http\Requests;

use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Precios\Dtos\GuardarListaPrecioDto;
use App\Modules\Precios\Models\ListaPrecio;
use Illuminate\Validation\Rule;

class GuardarListaPrecioRequest extends SolicitudNegocio
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $lista = $this->route('lista');

        return [
            'nombre' => ['required', 'string', 'max:120', Rule::unique('listas_precio', 'nombre')->where('tenant_id', $this->tenantId())->ignore($lista instanceof ListaPrecio ? $lista->getKey() : null)],
            'activo' => ['sometimes', 'boolean'],
        ];
    }

    public function toDto(): GuardarListaPrecioDto
    {
        $v = $this->validated();

        return new GuardarListaPrecioDto((string) $v['nombre'], isset($v['activo']) ? (bool) $v['activo'] : null);
    }
}
