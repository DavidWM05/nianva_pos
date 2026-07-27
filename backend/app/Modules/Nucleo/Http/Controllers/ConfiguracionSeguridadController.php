<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Models\ConfiguracionSeguridad;
use Illuminate\Http\Request;

/**
 * Dias de "recordar este dispositivo" por tenant (ver TrustedDeviceService).
 * Los limites 1-90 se validan aqui, en el backend -- nunca solo en el
 * frontend, un cliente distinto al Angular oficial podria mandar cualquier
 * valor.
 */
class ConfiguracionSeguridadController extends Controller
{
    public function show(Request $request)
    {
        $config = ConfiguracionSeguridad::actual();

        if (! $config) {
            abort(404, 'No hay un tenant activo.');
        }

        return response()->json([
            'dias_dispositivo_normal' => $config->dias_dispositivo_normal,
            'dias_dispositivo_admin' => $config->dias_dispositivo_admin,
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'dias_dispositivo_normal' => ['required', 'integer', 'between:1,90'],
            'dias_dispositivo_admin' => ['required', 'integer', 'between:1,90'],
        ]);

        $config = ConfiguracionSeguridad::actual();

        if (! $config) {
            abort(404, 'No hay un tenant activo.');
        }

        $config->update($validated);

        return response()->json([
            'dias_dispositivo_normal' => $config->dias_dispositivo_normal,
            'dias_dispositivo_admin' => $config->dias_dispositivo_admin,
        ]);
    }
}
