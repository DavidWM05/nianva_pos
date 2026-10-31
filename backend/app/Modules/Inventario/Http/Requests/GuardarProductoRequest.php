<?php

namespace App\Modules\Inventario\Http\Requests;

use App\Modules\Inventario\Dtos\ProductoDto;
use App\Modules\Nucleo\Http\Requests\SolicitudNegocio;
use App\Modules\Nucleo\Support\ReglasTenant;

class GuardarProductoRequest extends SolicitudNegocio
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $tenantId = $this->tenantId();

        return [
            'nombre' => ['required', 'string', 'max:200'],
            'descripcion' => ['nullable', 'string'],
            'categoria_id' => ['nullable', 'integer', ReglasTenant::existe('categorias', $tenantId)],
            'departamento_id' => ['nullable', 'integer', ReglasTenant::existe('departamentos', $tenantId)],
            'precio_compra' => ['nullable', 'numeric', 'min:0'],
            'precio_venta' => ['nullable', 'numeric', 'min:0'],
            'imagen_url' => ['nullable', 'string', 'max:500'],
            'no_resurtible' => ['nullable', 'boolean'],
            'sin_descuento' => ['nullable', 'boolean'],
        ];
    }

    public function toDto(): ProductoDto
    {
        $v = $this->validated();

        return new ProductoDto(
            nombre: (string) $v['nombre'],
            descripcion: isset($v['descripcion']) ? (string) $v['descripcion'] : null,
            categoriaId: isset($v['categoria_id']) ? (int) $v['categoria_id'] : null,
            departamentoId: isset($v['departamento_id']) ? (int) $v['departamento_id'] : null,
            precioCompra: isset($v['precio_compra']) ? (float) $v['precio_compra'] : null,
            precioVenta: isset($v['precio_venta']) ? (float) $v['precio_venta'] : null,
            imagenUrl: isset($v['imagen_url']) ? (string) $v['imagen_url'] : null,
            noResurtible: isset($v['no_resurtible']) ? (bool) $v['no_resurtible'] : null,
            sinDescuento: isset($v['sin_descuento']) ? (bool) $v['sin_descuento'] : null,
            presentes: array_keys($v),
        );
    }
}
