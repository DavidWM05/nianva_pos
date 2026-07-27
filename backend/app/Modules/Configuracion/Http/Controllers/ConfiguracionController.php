<?php

namespace App\Modules\Configuracion\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Configuracion\Http\Resources\ConfiguracionTenantResource;
use App\Modules\Configuracion\Models\ConfiguracionTenant;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Un solo registro por tenant (ConfiguracionTenant::actual(), sembrado
 * automaticamente al crear el tenant -- ver Configuracion\Observers\
 * TenantObserver), no una lista -- por eso show()/update() no reciben
 * ningun id, a diferencia del resto de los controllers de este proyecto.
 * Sin logo por archivo todavia: logo_url es solo texto (una URL) por
 * ahora, la subida de archivo queda para despues (ver el reporte).
 */
class ConfiguracionController extends Controller
{
    public function show(Request $request)
    {
        $configuracion = ConfiguracionTenant::actual();

        if (! $configuracion) {
            abort(404, 'No hay un tenant activo.');
        }

        return new ConfiguracionTenantResource($configuracion);
    }

    public function update(Request $request)
    {
        $configuracion = ConfiguracionTenant::actual();

        if (! $configuracion) {
            abort(404, 'No hay un tenant activo.');
        }

        $validated = $request->validate([
            'moneda' => ['required', 'string', 'max:5'],
            'mensaje_ticket' => ['nullable', 'string'],
            'logo_url' => ['nullable', 'string', 'max:500', 'url'],
            'mostrar_rfc' => ['required', 'boolean'],
            'mostrar_telefono' => ['required', 'boolean'],
            'mostrar_correo' => ['required', 'boolean'],
            'backup_auto' => ['required', 'boolean'],
            'backup_frecuencia' => ['required', Rule::in(['diario', 'semanal', 'mensual'])],
            'codigo_barras_automatico' => ['required', 'boolean'],
        ]);

        $configuracion->update($validated);

        return new ConfiguracionTenantResource($configuracion);
    }

    /**
     * Subconjunto de la configuracion que otros modulos necesitan leer sin
     * tener el permiso configuracion.editar (ej. Inventario, para saber si
     * debe autogenerar el codigo de barras de una variante nueva -- ver
     * ProductoVarianteController). A proposito sin middleware `permiso:`
     * (mismo patron que AuditoriaController::index()): son banderas de
     * bajo riesgo, no el registro completo de configuracion.
     */
    public function publica(Request $request)
    {
        $configuracion = ConfiguracionTenant::actual();

        return response()->json([
            'codigo_barras_automatico' => $configuracion?->codigo_barras_automatico ?? false,
        ]);
    }
}
