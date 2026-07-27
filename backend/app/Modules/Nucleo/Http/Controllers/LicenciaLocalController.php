<?php

namespace App\Modules\Nucleo\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Nucleo\Http\Resources\LicenciaLocalResource;
use App\Modules\Nucleo\Models\LicenciaLocal;
use Illuminate\Http\Request;

/**
 * Solo lectura, tenant-scoped -- sin permiso especial mas alla de estar
 * autenticado (cualquier usuario del tenant puede ver el estado de su
 * propia licencia; la activacion/revalidacion son operaciones de CLI, no
 * HTTP -- ver licencia:activar/licencia:revalidar).
 */
class LicenciaLocalController extends Controller
{
    public function show(Request $request)
    {
        $licenciaLocal = LicenciaLocal::actual();

        if ($licenciaLocal === null) {
            abort(404, 'Este tenant no tiene una licencia local registrada.');
        }

        return new LicenciaLocalResource($licenciaLocal);
    }
}
