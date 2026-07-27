<?php

namespace App\Modules\Crm\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Crm\Http\Resources\ClienteResource;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Http\Request;

/**
 * Primer modulo real conectado al shell (ver frontend nucleo-data-table +
 * DynamicFormComponent). Contrato de paginacion pensado para
 * DataTableLazyEvent del frontend: page/rows/sort_field/sort_order,
 * filtro_<campo> por cada columna filtrable.
 */
class ClienteController extends Controller
{
    private const CAMPOS_ORDENABLES = ['nombre', 'documento_fiscal', 'fecha_registro'];

    public function index(Request $request)
    {
        $query = Cliente::query();

        if ($nombre = $request->query('filtro_nombre')) {
            $query->where('nombre', 'like', "%{$nombre}%");
        }

        if ($documento = $request->query('filtro_documento_fiscal')) {
            $query->where('documento_fiscal', 'like', "%{$documento}%");
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
            'data' => ClienteResource::collection($paginador->items()),
            'meta' => [
                'total' => $paginador->total(),
                // El frontend oculta "Nuevo cliente" y las acciones de editar
                // segun esto -- reacciona a lo que dice el backend, nunca a una
                // lista de roles hardcodeada en el cliente. Va aqui (en vez de
                // exigir una llamada de sondeo aparte, como el 403 de
                // /api/configuracion-seguridad) porque la lista YA se pide
                // siempre al entrar a la pantalla.
                'permisos' => [
                    'crear' => $usuario->tienePermiso('clientes.crear'),
                    'editar' => $usuario->tienePermiso('clientes.editar'),
                    'eliminar' => $usuario->tienePermiso('clientes.eliminar'),
                ],
            ],
        ]);
    }

    /**
     * Incluye 'permisos' igual que index() -- la vista de registro se
     * puede alcanzar tambien navegando directo a /crm/clientes/{id}, no
     * solo desde el boton "editar" de la lista, asi que necesita su propia
     * forma de saber si debe mostrar el formulario como editable.
     */
    public function show(Request $request, Cliente $cliente)
    {
        $usuario = $request->user();

        return response()->json([
            'data' => new ClienteResource($cliente),
            'meta' => [
                'permisos' => [
                    'editar' => $usuario->tienePermiso('clientes.editar'),
                    'eliminar' => $usuario->tienePermiso('clientes.eliminar'),
                ],
            ],
        ]);
    }

    public function store(Request $request)
    {
        $validated = $this->validarDatos($request);
        $validated['tenant_id'] = app(TenantContext::class)->id();
        // Explicito en vez de confiar en el default de la columna -- el
        // modelo en memoria no se recarga solo tras create(), asi que el
        // recurso devuelto en la misma respuesta reflejaria null si no se
        // pasa aqui.
        $validated['activo'] = true;
        $validated['es_sistema'] = false;

        $cliente = Cliente::create($validated);

        // response()->json($resource) NO aplica el wrap "data" que si aplica
        // devolver el resource directamente -- ->response() si lo respeta,
        // manteniendo el mismo shape que show()/update()/desactivar().
        return (new ClienteResource($cliente))->response()->setStatusCode(201);
    }

    public function update(Request $request, Cliente $cliente)
    {
        $this->rechazarSiEsSistema($cliente);

        $validated = $this->validarDatos($request);
        $cliente->update($validated);

        return new ClienteResource($cliente);
    }

    /**
     * Soft: nunca DELETE fisico -- solo apaga `activo`. "Publico General"
     * (es_sistema) esta protegido tanto aqui como en el frontend (ver
     * ClientesListComponent), pero esta es la barrera real: un cliente
     * distinto al frontend oficial no puede desactivarlo solo porque el
     * boton estaba oculto.
     */
    public function desactivar(Cliente $cliente)
    {
        $this->rechazarSiEsSistema($cliente);

        $cliente->update(['activo' => false]);

        return new ClienteResource($cliente);
    }

    private function rechazarSiEsSistema(Cliente $cliente): void
    {
        if ($cliente->es_sistema) {
            abort(403, 'Este es un cliente de sistema y no se puede modificar.');
        }
    }

    private function validarDatos(Request $request): array
    {
        return $request->validate([
            'nombre' => ['required', 'string', 'max:200'],
            'documento_fiscal' => ['nullable', 'string', 'max:30'],
            'telefono' => ['nullable', 'string', 'max:20'],
            'correo' => ['nullable', 'email', 'max:150'],
            'direccion' => ['nullable', 'string'],
        ]);
    }
}
