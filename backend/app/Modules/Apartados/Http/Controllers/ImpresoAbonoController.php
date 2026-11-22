<?php

declare(strict_types=1);

namespace App\Modules\Apartados\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Apartados\Http\Resources\ImpresoAbonoResource;
use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Models\ApartadoAbono;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Support\SucursalOperacion;
use Illuminate\Http\Request;

final class ImpresoAbonoController extends Controller
{
    public function __invoke(Request $request, Apartado $apartado, ApartadoAbono $abono): ImpresoAbonoResource
    {
        $usuario = $request->user();
        abort_unless($usuario instanceof Usuario, 401);
        SucursalOperacion::paraEscritura($usuario, (int) $apartado->getAttribute('sucursal_id'));
        $abono->setRelation('apartado', $apartado->load('sucursal'));

        return new ImpresoAbonoResource($abono->load(['usuario', 'pagos.metodoPago']));
    }
}
