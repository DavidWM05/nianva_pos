<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Models\Permiso;

/**
 * Solo index() -- el catalogo de permisos es fijo (sembrado por
 * NucleoRolesPermisosSeeder), no se crean/editan/borran permisos desde
 * la UI. Esto alimenta el checklist "asignar permisos" del formulario de
 * Rol -- el frontend agrupa por `modulo` client-side, esta respuesta ya
 * trae ambos campos sueltos para eso.
 */
class PermisoController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => Permiso::orderBy('modulo')->orderBy('accion')->get(['id', 'modulo', 'accion', 'nombre', 'descripcion']),
        ]);
    }
}
