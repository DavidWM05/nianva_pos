<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Services;

use App\Modules\Inventario\Dtos\GuardarPresentacionDto;
use App\Modules\Inventario\Models\Presentacion;
use App\Modules\Inventario\Models\ProductoVariante;
use Illuminate\Database\Eloquent\Collection;

final class PresentacionService
{
    /** @return Collection<int,Presentacion> */
    public function listar(ProductoVariante $variante): Collection
    {
        return Presentacion::query()->where('variante_id', $variante->id)->orderBy('nombre')->get();
    }

    public function crear(ProductoVariante $variante, GuardarPresentacionDto $dto): Presentacion
    {
        return Presentacion::create(['tenant_id' => $variante->getAttribute('tenant_id'), 'variante_id' => $variante->id, ...$dto->datos()])->refresh();
    }

    public function propia(ProductoVariante $variante, Presentacion $presentacion): Presentacion
    {
        return Presentacion::query()->where('variante_id', $variante->id)->whereKey($presentacion->id)->firstOrFail();
    }

    public function actualizar(ProductoVariante $variante, Presentacion $presentacion, GuardarPresentacionDto $dto): Presentacion
    {
        $p = $this->propia($variante, $presentacion);
        $p->update($dto->datos());

        return $p;
    }

    public function eliminar(ProductoVariante $variante, Presentacion $presentacion): void
    {
        $this->propia($variante, $presentacion)->delete();
    }
}
