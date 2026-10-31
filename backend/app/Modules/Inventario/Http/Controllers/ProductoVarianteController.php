<?php

namespace App\Modules\Inventario\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Modules\Configuracion\Models\ConfiguracionTenant;
use App\Modules\Inventario\Http\Requests\GuardarProductoVarianteRequest;
use App\Modules\Inventario\Http\Resources\ProductoVarianteResource;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;

/**
 * Anidado bajo un Producto (POST) -- producto_id nunca viene del payload,
 * siempre del segmento de ruta, para que no se pueda "colgar" una
 * variante de un producto de otro tenant.
 *
 * Importa ConfiguracionTenant directamente (Inventario->Configuracion) --
 * segunda de 3 excepciones documentadas al patron de dependencia entre
 * modulos, junto con CajaController->GastoService e
 * InicioController::resumen() (Nucleo->Tpv+Apartados) -- ver el mapa
 * completo en docs/MANUAL_TECNICO.md. Igual que en esas, es la capa Http
 * la que orquesta, nunca InventarioService, que sigue sin conocer
 * Configuracion.
 */
class ProductoVarianteController extends Controller
{
    private const LONGITUD_CODIGO_AUTOGENERADO = 12;

    public function store(GuardarProductoVarianteRequest $request, Producto $producto)
    {
        $tenantId = $producto->tenant_id;
        $datos = $request->toDto()->datosPresentes();
        $datos['producto_id'] = $producto->id;
        $datos['activo'] = true;

        if (empty($datos['codigo_barras']) && ConfiguracionTenant::actual()?->codigo_barras_automatico) {
            $datos['codigo_barras'] = $this->generarCodigoBarrasUnico($tenantId);
        }

        $variante = ProductoVariante::create($datos);

        return (new ProductoVarianteResource($variante))->response()->setStatusCode(201);
    }

    public function update(GuardarProductoVarianteRequest $request, ProductoVariante $variante)
    {
        $variante->update($request->toDto()->datosPresentes());

        return new ProductoVarianteResource($variante);
    }

    public function desactivar(ProductoVariante $variante)
    {
        $variante->update(['activo' => false]);

        return new ProductoVarianteResource($variante);
    }

    /**
     * Numerico plano de 12 digitos (sin digito verificador EAN-13 real --
     * ver el reporte del modulo Inventario: se maneja como texto simple, no
     * se agrego una libreria de codigos de barra). random_int + reintento
     * contra la unique key en vez de una secuencia: mas simple que llevar
     * un contador propio y el espacio (10^12) hace una colision casi
     * imposible en la practica.
     */
    private function generarCodigoBarrasUnico(int $tenantId): string
    {
        do {
            $codigo = (string) random_int(10 ** (self::LONGITUD_CODIGO_AUTOGENERADO - 1), (10 ** self::LONGITUD_CODIGO_AUTOGENERADO) - 1);
        } while (ProductoVariante::where('tenant_id', $tenantId)->where('codigo_barras', $codigo)->exists());

        return $codigo;
    }
}
