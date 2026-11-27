<?php

declare(strict_types=1);

namespace App\Modules\Configuracion\Http\Controllers;

use App\Aplicacion\Configuracion\AplicarPerfilGiro;
use App\Http\Controllers\Controller;
use App\Modules\Configuracion\Http\Requests\AplicarPerfilGiroRequest;
use App\Modules\Configuracion\Http\Resources\PerfilGiroResource;
use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Configuracion\Support\PerfilesGiro;
use App\Modules\Nucleo\Services\TenantContext;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * ARQ-07: el giro es configuracion. Lista los perfiles (datos) y aplica uno al tenant.
 * Orquestacion: App\Aplicacion\Configuracion\AplicarPerfilGiro. Permiso: configuracion.editar.
 */
class PerfilGiroController extends Controller
{
    /** Catalogo fijo de perfiles (no es un listado paginado de registros). */
    public function catalogo(): AnonymousResourceCollection
    {
        return PerfilGiroResource::collection(PerfilesGiro::todos())->additional([
            'meta' => ['actual' => ConfiguracionTenant::actual()?->perfil_giro],
        ]);
    }

    /** Siembra lo que falte del perfil y lo deja como el perfil del tenant. */
    public function update(AplicarPerfilGiroRequest $request, AplicarPerfilGiro $aplicar): PerfilGiroResource
    {
        $clave = $request->toDto()->perfil;
        $creados = $aplicar->ejecutar((int) app(TenantContext::class)->id(), $clave);

        return (new PerfilGiroResource(PerfilesGiro::buscar($clave)))->additional([
            'meta' => [
                'actual' => $clave,
                /** @var array{atributos: int, valores: int, categorias: int, unidades: int} */
                'creados' => $creados,
            ],
        ]);
    }
}
