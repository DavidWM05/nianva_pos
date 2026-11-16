<?php

declare(strict_types=1);

namespace App\Modules\Precios\Services;

use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Dtos\AsignarListaPrecioClienteDto;
use App\Modules\Precios\Dtos\GuardarListaPrecioDto;
use App\Modules\Precios\Dtos\GuardarListaPrecioItemDto;
use App\Modules\Precios\Dtos\ListarListasPrecioDto;
use App\Modules\Precios\Models\ListaPrecio;
use App\Modules\Precios\Models\ListaPrecioCliente;
use App\Modules\Precios\Models\ListaPrecioItem;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

final class ListaPrecioService
{
    /** @return LengthAwarePaginator<int, ListaPrecio> */
    public function listar(ListarListasPrecioDto $dto): LengthAwarePaginator
    {
        $consulta = ListaPrecio::query();
        if ($dto->q !== '') {
            $consulta->where('nombre', 'like', '%'.$dto->q.'%');
        }

        return $consulta->orderBy($dto->sortField, $dto->sortOrder)->paginate($dto->rows, ['*'], 'page', $dto->page);
    }

    /** @return Collection<int, ListaPrecio> */
    public function disponibles(): Collection
    {
        return ListaPrecio::query()->where('activo', true)->orderBy('nombre')->get();
    }

    public function crear(GuardarListaPrecioDto $dto): ListaPrecio
    {
        return ListaPrecio::create(['tenant_id' => app(TenantContext::class)->id(), ...$dto->datos()])->refresh();
    }

    public function actualizar(ListaPrecio $lista, GuardarListaPrecioDto $dto): ListaPrecio
    {
        $lista->update($dto->datos());

        return $lista;
    }

    public function desactivar(ListaPrecio $lista): ListaPrecio
    {
        $lista->update(['activo' => false]);

        return $lista;
    }

    public function guardarItem(ListaPrecio $lista, GuardarListaPrecioItemDto $dto): ListaPrecioItem
    {
        return ListaPrecioItem::create(['tenant_id' => app(TenantContext::class)->id(), 'lista_precio_id' => $lista->getKey(), ...$dto->datos()]);
    }

    public function actualizarItem(ListaPrecio $lista, ListaPrecioItem $item, GuardarListaPrecioItemDto $dto): ListaPrecioItem
    {
        $propio = $lista->items()->whereKey($item->getKey())->firstOrFail();
        $propio->update($dto->datos());

        return $propio;
    }

    public function quitarItem(ListaPrecio $lista, ListaPrecioItem $item): void
    {
        $lista->items()->whereKey($item->getKey())->firstOrFail()->delete();
    }

    public function asignarCliente(ListaPrecio $lista, AsignarListaPrecioClienteDto $dto): ListaPrecioCliente
    {
        return ListaPrecioCliente::updateOrCreate(['tenant_id' => app(TenantContext::class)->id(), 'cliente_id' => $dto->clienteId], ['lista_precio_id' => $lista->getKey()]);
    }

    public function quitarCliente(ListaPrecio $lista, ListaPrecioCliente $asignacion): void
    {
        $lista->clientes()->whereKey($asignacion->getKey())->firstOrFail()->delete();
    }
}
