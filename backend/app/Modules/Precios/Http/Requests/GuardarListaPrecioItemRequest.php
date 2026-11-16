<?php

declare(strict_types=1);

namespace App\Modules\Precios\Http\Requests;

use App\Modules\Inventario\Support\ReglasVariante;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Precios\Dtos\GuardarListaPrecioItemDto;
use App\Modules\Precios\Models\ListaPrecio;
use App\Modules\Precios\Models\ListaPrecioItem;
use Illuminate\Validation\Rule;

class GuardarListaPrecioItemRequest extends SolicitudNegocio
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $lista = $this->route('lista');
        $item = $this->route('item');
        $tenant = $this->tenantId();

        return [
            'producto_id' => ['nullable', 'required_without:variante_id', 'prohibits:variante_id', 'integer', ReglasTenant::existe('productos', $tenant), Rule::unique('lista_precio_items', 'producto_id')->where('tenant_id', $tenant)->where('lista_precio_id', $lista instanceof ListaPrecio ? $lista->getKey() : null)->ignore($item instanceof ListaPrecioItem ? $item->getKey() : null)],
            'variante_id' => ['nullable', 'required_without:producto_id', 'prohibits:producto_id', 'integer', ReglasVariante::delTenant($tenant), Rule::unique('lista_precio_items', 'variante_id')->where('tenant_id', $tenant)->where('lista_precio_id', $lista instanceof ListaPrecio ? $lista->getKey() : null)->ignore($item instanceof ListaPrecioItem ? $item->getKey() : null)],
            'precio' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:9999999999.99'],
        ];
    }

    public function toDto(): GuardarListaPrecioItemDto
    {
        $v = $this->validated();

        return new GuardarListaPrecioItemDto(isset($v['producto_id']) ? (int) $v['producto_id'] : null, isset($v['variante_id']) ? (int) $v['variante_id'] : null, (string) $v['precio']);
    }
}
