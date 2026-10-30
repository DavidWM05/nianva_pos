<?php

namespace App\Modules\Inventario\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventario\Http\Resources\ProductoResource;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Nucleo\Support\ReglasTenant;
use Illuminate\Http\Request;

/**
 * Segundo modulo real conectado al shell (ver Crm\Http\Controllers\ClienteController
 * para el mismo patron: paginacion pensada para DataTableLazyEvent,
 * permisos efectivos en el meta de la respuesta, "desactivar" nunca
 * DELETE fisico).
 */
class ProductoController extends Controller
{
    private const CAMPOS_ORDENABLES = ['nombre', 'precio_venta', 'stock_total'];

    public function index(Request $request)
    {
        $query = Producto::query()
            ->select('productos.*')
            // Suma de inventario_stock a traves de sus variantes -- se
            // puede calcular en el backend con una subquery correlacionada
            // en vez de N+1 o traer todo a PHP; SUM+COALESCE evita null
            // cuando el producto no tiene ninguna fila de stock todavia.
            ->selectSub(
                InventarioStock::query()
                    ->join('producto_variantes', 'producto_variantes.id', '=', 'inventario_stock.variante_id')
                    ->whereColumn('producto_variantes.producto_id', 'productos.id')
                    ->selectRaw('COALESCE(SUM(inventario_stock.stock_actual), 0)'),
                'stock_total',
            )
            ->with(['categoria:id,nombre', 'departamento:id,nombre']);

        if ($nombre = $request->query('filtro_nombre')) {
            $query->where('nombre', 'like', "%{$nombre}%");
        }

        if ($categoriaId = $request->query('filtro_categoria_id')) {
            $query->where('categoria_id', $categoriaId);
        }

        $sortField = $request->query('sort_field');
        if (is_string($sortField) && in_array($sortField, self::CAMPOS_ORDENABLES, true)) {
            $query->orderBy($sortField, $request->query('sort_order') === 'desc' ? 'desc' : 'asc');
        } else {
            $query->orderBy('nombre');
        }

        $rows = max(1, min(100, (int) $request->query('rows', 25)));
        $page = max(1, (int) $request->query('page', 1));
        $paginador = $query->paginate($rows, ['*'], 'page', $page);

        $usuario = $request->user();

        return response()->json([
            'data' => ProductoResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => [
                    'crear' => $usuario->tienePermiso('inventario.crear'),
                    'editar' => $usuario->tienePermiso('inventario.editar'),
                    'eliminar' => $usuario->tienePermiso('inventario.eliminar'),
                ],
            ],
        ]);
    }

    public function show(Request $request, Producto $producto)
    {
        $producto->load([
            'categoria:id,nombre',
            'departamento:id,nombre',
            'variantes.stock.sucursal:id,nombre',
        ]);

        $usuario = $request->user();

        return response()->json([
            'data' => new ProductoResource($producto),
            'meta' => [
                'permisos' => [
                    'crear' => $usuario->tienePermiso('inventario.crear'),
                    'editar' => $usuario->tienePermiso('inventario.editar'),
                    'eliminar' => $usuario->tienePermiso('inventario.eliminar'),
                    // Gate del boton "Registrar compra" (ver CompraController)
                    // -- permiso dedicado, no inventario.crear: dar de alta un
                    // producto y meterle stock son acciones distintas.
                    'compras_crear' => $usuario->tienePermiso('compras.crear'),
                ],
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validarDatos($request);
        $validated['tenant_id'] = app(TenantContext::class)->id();
        $validated['activo'] = true;

        $producto = Producto::create($validated);

        return (new ProductoResource($producto))->response()->setStatusCode(201);
    }

    public function update(Request $request, Producto $producto)
    {
        $validated = $this->validarDatos($request);
        $producto->update($validated);

        return new ProductoResource($producto);
    }

    /** Soft: nunca DELETE fisico -- solo apaga `activo` (ver Cliente::desactivar()). */
    public function desactivar(Producto $producto)
    {
        $producto->update(['activo' => false]);

        return new ProductoResource($producto);
    }

    private function validarDatos(Request $request): array
    {
        $tenantId = app(TenantContext::class)->id();

        return $request->validate([
            'nombre' => ['required', 'string', 'max:200'],
            'descripcion' => ['nullable', 'string'],
            'categoria_id' => ['nullable', 'integer', ReglasTenant::existe('categorias', $tenantId)],
            'departamento_id' => ['nullable', 'integer', ReglasTenant::existe('departamentos', $tenantId)],
            'precio_compra' => ['nullable', 'numeric', 'min:0'],
            'precio_venta' => ['nullable', 'numeric', 'min:0'],
            'imagen_url' => ['nullable', 'string', 'max:500'],
            'no_resurtible' => ['nullable', 'boolean'],
            'sin_descuento' => ['nullable', 'boolean'],
        ]);
    }
}
