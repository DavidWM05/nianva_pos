<?php

declare(strict_types=1);

namespace App\Modules\Precios\Http\Middleware;

use App\Modules\Nucleo\Http\Middleware\CheckPermiso;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Models\ListaPrecioCliente;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class SeleccionarListaPrecio
{
    public function handle(Request $request, Closure $next): Response
    {
        $lista = filter_var($request->input('lista_precio_id'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        if ($lista === false) {
            return $next($request);
        }
        $cliente = filter_var($request->input('cliente_id'), FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
        $asignada = $cliente === false ? null : ListaPrecioCliente::sinTenant()->where('tenant_id', app(TenantContext::class)->id())->where('cliente_id', $cliente)->value('lista_precio_id');
        if ($asignada !== null && (int) $asignada === $lista) {
            return $next($request);
        }

        return app(CheckPermiso::class)->handle($request, $next, 'precios.elegir_lista');
    }
}
