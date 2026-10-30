<?php

namespace App\Modules\Precios\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Inventario\Support\ReglasVariante;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Nucleo\Support\ReglasTenant;
use App\Modules\Precios\Http\Resources\ReglaPrecioResource;
use App\Modules\Precios\Models\ReglaPrecio;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

/**
 * Tercer modulo real conectado al shell (ver Crm\ClienteController /
 * Inventario\ProductoController para el mismo esquema). show() usa el
 * mismo permiso de lectura que index() (reglas_precio.ver) -- no hay uno
 * mas granular para "ver una regla puntual".
 */
class ReglaPrecioController extends Controller
{
    private const TIPOS_CON_VALOR = ['porcentaje', 'monto_fijo'];

    private const TIPOS_CON_CANTIDAD_COMPRA = ['nxm', 'bundle'];

    private const CAMPOS_ORDENABLES = ['nombre', 'fecha_inicio', 'fecha_fin'];

    public function index(Request $request)
    {
        $query = ReglaPrecio::query()->with(['categoria:id,nombre', 'producto:id,nombre', 'variante:id,talla,color,producto_id', 'variante.producto:id,nombre']);

        if ($nombre = $request->query('filtro_nombre')) {
            $query->where('nombre', 'like', "%{$nombre}%");
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

        return response()->json([
            'data' => ReglaPrecioResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                'permisos' => $this->permisosDe($request, 'reglas_precio'),
            ],
        ]);
    }

    public function show(Request $request, ReglaPrecio $regla)
    {
        $regla->load(['categoria:id,nombre', 'producto:id,nombre', 'variante:id,talla,color,producto_id', 'variante.producto:id,nombre']);

        return response()->json([
            'data' => new ReglaPrecioResource($regla),
            'meta' => ['permisos' => $this->permisosDe($request, 'reglas_precio')],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validarDatos($request);
        $validated['tenant_id'] = app(TenantContext::class)->id();
        $validated['activo'] = true;

        $regla = ReglaPrecio::create($validated);
        $regla->load(['categoria:id,nombre', 'producto:id,nombre', 'variante:id,talla,color,producto_id', 'variante.producto:id,nombre']);

        return (new ReglaPrecioResource($regla))->response()->setStatusCode(201);
    }

    public function update(Request $request, ReglaPrecio $regla)
    {
        $validated = $this->validarDatos($request);
        $regla->update($validated);
        $regla->load(['categoria:id,nombre', 'producto:id,nombre', 'variante:id,talla,color,producto_id', 'variante.producto:id,nombre']);

        return new ReglaPrecioResource($regla);
    }

    public function desactivar(ReglaPrecio $regla)
    {
        $regla->update(['activo' => false]);

        return new ReglaPrecioResource($regla);
    }

    /**
     * Valida forma basica y LUEGO fuerza la coherencia entre tipo/aplica_a
     * y sus campos dependientes en el backend -- sin importar lo que
     * mande el frontend (que ya solo muestra/envia los campos relevantes,
     * ver ReglaPrecioFormComponent), esta es la barrera real: un cliente
     * distinto no puede dejar una regla con campos de otro tipo
     * residuales, ni omitir el campo que su tipo si necesita.
     */
    private function validarDatos(Request $request): array
    {
        $tenantId = app(TenantContext::class)->id();

        $validated = $request->validate([
            'nombre' => ['required', 'string', 'max:120'],
            'tipo' => ['required', Rule::in(['porcentaje', 'monto_fijo', 'nxm', 'bundle'])],
            'valor' => ['nullable', 'numeric', 'min:0'],
            'cantidad_compra' => ['nullable', 'integer', 'min:1'],
            'cantidad_paga' => ['nullable', 'integer', 'min:1'],
            'precio_bundle' => ['nullable', 'numeric', 'min:0'],
            'aplica_a' => ['required', Rule::in(['todo', 'categoria', 'producto', 'variante'])],
            'categoria_id' => ['nullable', 'integer', ReglasTenant::existe('categorias', $tenantId)],
            'producto_id' => ['nullable', 'integer', ReglasTenant::existe('productos', $tenantId)],
            'variante_id' => ['nullable', 'integer', ReglasVariante::delTenant($tenantId)],
            'fecha_inicio' => ['nullable', 'date'],
            'fecha_fin' => ['nullable', 'date', 'after_or_equal:fecha_inicio'],
        ]);

        // $request->validate() omite del array las claves 'nullable' que el
        // cliente nunca mando (no las deja en null) -- se normalizan aqui
        // para poder leerlas sin "Undefined array key" mas abajo.
        $validated += [
            'valor' => null, 'cantidad_compra' => null, 'cantidad_paga' => null, 'precio_bundle' => null,
            'categoria_id' => null, 'producto_id' => null, 'variante_id' => null,
            'fecha_inicio' => null, 'fecha_fin' => null,
        ];

        $tieneValor = in_array($validated['tipo'], self::TIPOS_CON_VALOR, true);
        $tieneCantidadCompra = in_array($validated['tipo'], self::TIPOS_CON_CANTIDAD_COMPRA, true);
        $tieneCantidadPaga = $validated['tipo'] === 'nxm';
        $tienePrecioBundle = $validated['tipo'] === 'bundle';

        $errores = [];

        if ($tieneValor && $validated['valor'] === null) {
            $errores['valor'] = ['El valor es obligatorio para este tipo de regla.'];
        }
        if ($tieneCantidadCompra && $validated['cantidad_compra'] === null) {
            $errores['cantidad_compra'] = ['La cantidad de compra es obligatoria para este tipo de regla.'];
        }
        if ($tieneCantidadPaga && $validated['cantidad_paga'] === null) {
            $errores['cantidad_paga'] = ['La cantidad que paga es obligatoria para reglas nxm.'];
        }
        if ($tienePrecioBundle && $validated['precio_bundle'] === null) {
            $errores['precio_bundle'] = ['El precio del bundle es obligatorio para este tipo de regla.'];
        }

        if ($validated['aplica_a'] === 'categoria' && $validated['categoria_id'] === null) {
            $errores['categoria_id'] = ['Selecciona una categoría.'];
        }
        if ($validated['aplica_a'] === 'producto' && $validated['producto_id'] === null) {
            $errores['producto_id'] = ['Selecciona un producto.'];
        }
        if ($validated['aplica_a'] === 'variante' && $validated['variante_id'] === null) {
            $errores['variante_id'] = ['Selecciona una variante.'];
        }

        if ($errores !== []) {
            throw ValidationException::withMessages($errores);
        }

        // Fuerza null en todo lo que no corresponda a este tipo/aplica_a --
        // asi una edicion que cambia de nxm a porcentaje, por ejemplo, no
        // deja cantidad_compra/cantidad_paga residuales en la fila.
        $validated['valor'] = $tieneValor ? $validated['valor'] : null;
        $validated['cantidad_compra'] = $tieneCantidadCompra ? $validated['cantidad_compra'] : null;
        $validated['cantidad_paga'] = $tieneCantidadPaga ? $validated['cantidad_paga'] : null;
        $validated['precio_bundle'] = $tienePrecioBundle ? $validated['precio_bundle'] : null;

        $validated['categoria_id'] = $validated['aplica_a'] === 'categoria' ? $validated['categoria_id'] : null;
        $validated['producto_id'] = $validated['aplica_a'] === 'producto' ? $validated['producto_id'] : null;
        $validated['variante_id'] = $validated['aplica_a'] === 'variante' ? $validated['variante_id'] : null;

        return $validated;
    }

    /**
     * @return array{crear: bool, editar: bool, eliminar: bool}
     */
    private function permisosDe(Request $request, string $modulo): array
    {
        $usuario = $request->user();

        return [
            'crear' => $usuario->tienePermiso("{$modulo}.crear"),
            'editar' => $usuario->tienePermiso("{$modulo}.editar"),
            'eliminar' => $usuario->tienePermiso("{$modulo}.eliminar"),
        ];
    }
}
