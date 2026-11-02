<?php

declare(strict_types=1);

namespace App\Modules\Nucleo\Support;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

final class Listado
{
    /**
     * Declaracion:
     * [
     *     'campos_ordenables' => ['nombre', 'correo'],
     *     'orden_por_defecto' => 'nombre',
     *     'direccion_por_defecto' => 'asc',
     *     'filtros' => [
     *         'nombre' => 'like',
     *         'activo' => '=',
     *         'fecha' => ['operador' => 'rango_fechas'],
     *     ],
     *     'busqueda' => ['nombre', 'correo'],
     *     'filtros_por_defecto' => ['activo' => true],
     * ]
     *
     * @param  Builder<*>  $consulta
     * @param  array<string, mixed>  $declaracion
     * @param  array<string, mixed>  $permisos
     * @return array{
     *     items: array<int, mixed>,
     *     meta: array{total: int, page: int, rows: int, filtros_aplicados: array<string, mixed>, permisos: array<string, mixed>}
     * }
     */
    public static function aplicar(Request $request, Builder $consulta, array $declaracion, array $permisos): array
    {
        $filtros = $declaracion['filtros'] ?? [];
        $aplicados = [];
        $porDefecto = $declaracion['filtros_por_defecto'] ?? [];

        foreach ($filtros as $campo => $configuracion) {
            foreach (self::parametrosDeFiltro($campo, $configuracion) as $parametro) {
                if ($request->query->has($parametro)) {
                    continue 2;
                }
            }

            if (array_key_exists($campo, $porDefecto)) {
                self::aplicarFiltro($consulta, $campo, $configuracion, $porDefecto[$campo], $aplicados);
            }
        }

        foreach ($filtros as $campo => $configuracion) {
            $parametros = self::parametrosDeFiltro($campo, $configuracion);
            $valores = [];

            foreach ($parametros as $parametro) {
                $valor = self::escalar($request, $parametro);

                if ($valor !== null) {
                    $valores[$parametro] = $valor;
                }
            }

            if ($valores === []) {
                continue;
            }

            self::aplicarFiltro($consulta, $campo, $configuracion, $valores, $aplicados);
        }

        $busqueda = trim(self::escalar($request, 'q') ?? '');

        if ($busqueda !== '' && ($columnas = $declaracion['busqueda'] ?? []) !== []) {
            $consulta->where(function (Builder $subconsulta) use ($columnas, $busqueda): void {
                foreach ($columnas as $columna) {
                    $subconsulta->orWhere($columna, 'like', "%{$busqueda}%");
                }
            });
            $aplicados['q'] = $busqueda;
        }

        $camposOrdenables = $declaracion['campos_ordenables'] ?? [];
        $campoOrden = self::escalar($request, 'sort_field') ?? '';
        $campoValido = in_array($campoOrden, $camposOrdenables, true);

        if (! $campoValido) {
            $campoOrden = (string) ($declaracion['orden_por_defecto'] ?? $camposOrdenables[0] ?? 'id');
        }

        $orden = $campoValido && self::escalar($request, 'sort_order') === 'desc'
            ? 'desc'
            : (($declaracion['direccion_por_defecto'] ?? 'asc') === 'desc' ? 'desc' : 'asc');
        $consulta->orderBy($campoOrden, $orden);

        $rows = max(1, min(100, (int) (self::escalar($request, 'rows') ?? 25)));
        $page = max(1, (int) (self::escalar($request, 'page') ?? 1));
        $paginador = $consulta->paginate($rows, ['*'], 'page', $page);

        return [
            'items' => $paginador->items(),
            'meta' => [
                'total' => $paginador->total(),
                'page' => $paginador->currentPage(),
                'rows' => $rows,
                'filtros_aplicados' => $aplicados,
                'permisos' => $permisos,
            ],
        ];
    }

    /**
     * Valor de un parametro de query solo si es texto o numero: uno que llega como
     * arreglo (`?q[]=x`) se trata como ausente, en vez de reventar con un 500.
     */
    private static function escalar(Request $request, string $parametro): ?string
    {
        $valor = $request->query->all()[$parametro] ?? null;

        return is_string($valor) || is_int($valor) || is_float($valor) ? (string) $valor : null;
    }

    /**
     * @param  string|array<string, mixed>  $configuracion
     * @return list<string>
     */
    private static function parametrosDeFiltro(string $campo, string|array $configuracion): array
    {
        if (is_array($configuracion) && ($configuracion['operador'] ?? null) === 'rango_fechas') {
            return [
                $configuracion['desde'] ?? "filtro_{$campo}_desde",
                $configuracion['hasta'] ?? "filtro_{$campo}_hasta",
            ];
        }

        return ["filtro_{$campo}"];
    }

    /**
     * @param  Builder<*>  $consulta
     * @param  string|array<string, mixed>  $configuracion
     * @param  array<string, mixed>  $aplicados
     */
    private static function aplicarFiltro(Builder $consulta, string $campo, string|array $configuracion, mixed $valores, array &$aplicados): void
    {
        $operador = is_array($configuracion) ? ($configuracion['operador'] ?? '=') : $configuracion;

        if ($operador === 'rango_fechas') {
            $parametroDesde = is_array($configuracion) ? ($configuracion['desde'] ?? "filtro_{$campo}_desde") : "filtro_{$campo}_desde";
            $parametroHasta = is_array($configuracion) ? ($configuracion['hasta'] ?? "filtro_{$campo}_hasta") : "filtro_{$campo}_hasta";
            $desde = is_array($valores) ? ($valores['desde'] ?? $valores[$parametroDesde] ?? '') : '';
            $hasta = is_array($valores) ? ($valores['hasta'] ?? $valores[$parametroHasta] ?? '') : '';

            if ($desde !== '') {
                $consulta->whereDate($campo, '>=', $desde);
                $aplicados["{$campo}_desde"] = $desde;
            }

            if ($hasta !== '') {
                $consulta->whereDate($campo, '<=', $hasta);
                $aplicados["{$campo}_hasta"] = $hasta;
            }

            return;
        }

        $valor = is_array($valores) ? ($valores["filtro_{$campo}"] ?? null) : $valores;

        if ($valor === null || $valor === '') {
            return;
        }

        if ($operador === 'like') {
            $consulta->where($campo, 'like', "%{$valor}%");
        } else {
            $consulta->where($campo, $valor);
        }

        $aplicados[$campo] = $valor;
    }
}
