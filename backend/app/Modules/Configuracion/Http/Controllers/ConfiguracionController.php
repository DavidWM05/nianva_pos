<?php

namespace App\Modules\Configuracion\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Configuracion\Http\Requests\ActualizarConfiguracionRequest;
use App\Modules\Configuracion\Http\Resources\ConfiguracionTenantResource;
use App\Modules\Configuracion\Models\ConfiguracionTenant;
use Illuminate\Http\Request;

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

    public function update(ActualizarConfiguracionRequest $request)
    {
        $configuracion = $request->configuracion();
        $configuracion->update($request->toDto()->datosPresentes());

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
