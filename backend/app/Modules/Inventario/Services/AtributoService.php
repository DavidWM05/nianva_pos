<?php

declare(strict_types=1);

namespace App\Modules\Inventario\Services;

use App\Modules\Inventario\Exceptions\AtributoEnUsoException;
use App\Modules\Inventario\Models\Atributo;
use App\Modules\Inventario\Models\AtributoValor;
use App\Modules\Inventario\Models\VarianteAtributoValor;
use App\Modules\Nucleo\Support\Listado;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\Request;

/**
 * ARQ-07: consultas y escrituras del catalogo de atributos genericos de variante y sus valores.
 */
class AtributoService
{
    private const CAMPOS_ORDENABLES = ['nombre', 'orden'];

    /**
     * Listado uniforme (Listado::aplicar): busqueda por nombre, orden por nombre por defecto.
     *
     * @param  array{crear: bool, editar: bool, eliminar: bool}  $permisos
     * @return array{items: mixed, meta: array<string, mixed>}
     */
    public function listado(Request $request, array $permisos): array
    {
        return Listado::aplicar(
            $request,
            Atributo::query(),
            [
                'campos_ordenables' => self::CAMPOS_ORDENABLES,
                'orden_por_defecto' => 'nombre',
                'filtros' => ['nombre' => 'like'],
                'busqueda' => ['nombre'],
            ],
            $permisos,
        );
    }

    /** @return Collection<int, Atributo> Todos, con sus valores, en el orden del nombre de la variante. */
    public function conValores(): Collection
    {
        return Atributo::query()->with('valores')->orderBy('orden')->orderBy('id')->get();
    }

    /** @param  array<string, mixed>  $datos */
    public function crear(int $tenantId, array $datos): Atributo
    {
        return Atributo::create([...$datos, 'tenant_id' => $tenantId])->load('valores');
    }

    /** @param  array<string, mixed>  $datos */
    public function actualizar(Atributo $atributo, array $datos): Atributo
    {
        $atributo->update($datos);

        return $atributo->load('valores');
    }

    /** Solo si ninguna variante usa el atributo (DAT-10); sus valores se van con el. */
    public function eliminar(Atributo $atributo): void
    {
        if (VarianteAtributoValor::query()->where('atributo_id', $atributo->id)->exists()) {
            throw new AtributoEnUsoException('atributo', $atributo->id);
        }

        $atributo->delete();
    }

    /** @param  array<string, mixed>  $datos */
    public function crearValor(Atributo $atributo, array $datos): Atributo
    {
        AtributoValor::create([...$datos, 'atributo_id' => $atributo->id]);

        return $atributo->load('valores');
    }

    /** @param  array<string, mixed>  $datos */
    public function actualizarValor(AtributoValor $valor, array $datos): Atributo
    {
        $valor->update($datos);

        return Atributo::query()->with('valores')->findOrFail($valor->atributo_id);
    }

    /** Solo si ninguna variante usa el valor (DAT-10). */
    public function eliminarValor(AtributoValor $valor): void
    {
        if (VarianteAtributoValor::query()->where('atributo_valor_id', $valor->id)->exists()) {
            throw new AtributoEnUsoException('valor', $valor->id);
        }

        $valor->delete();
    }
}
