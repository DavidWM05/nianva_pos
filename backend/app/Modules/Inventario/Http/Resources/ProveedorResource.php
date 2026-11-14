<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Http\Resources;

use App\Modules\Inventario\Models\Proveedor;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin Proveedor
 */
class ProveedorResource extends JsonResource
{
    /**
     * @return array{id: int, razon_social: string, rfc: string|null, telefono: string|null, correo: string|null, activo: bool}
     */
    public function toArray(Request $request): array
    {
        $proveedor = $this->resource;

        return [
            'id' => (int) $proveedor->getKey(),
            'razon_social' => (string) $proveedor->getAttribute('razon_social'),
            'rfc' => self::textoONulo($proveedor->getAttribute('rfc')),
            'telefono' => self::textoONulo($proveedor->getAttribute('telefono')),
            'correo' => self::textoONulo($proveedor->getAttribute('correo')),
            'activo' => (bool) $proveedor->getAttribute('activo'),
        ];
    }

    private static function textoONulo(mixed $valor): ?string
    {
        return $valor === null ? null : (string) $valor;
    }
}
