<?php

declare(strict_types=1);

namespace Tests\Feature\Inventario;

use App\Modules\Apartados\Http\Requests\CrearApartadoRequest;
use App\Modules\Cotizaciones\Http\Requests\CrearCotizacionRequest;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Delivery\Http\Requests\CrearPedidoRequest;
use App\Modules\Devoluciones\Http\Requests\CrearDevolucionRequest;
use App\Modules\Inventario\Http\Requests\RegistrarCompraRequest;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Http\Requests\GuardarReglaPrecioRequest;
use App\Modules\Produccion\Http\Requests\CambiarEstadoOrdenRequest;
use App\Modules\Produccion\Http\Requests\CrearInsumoRequest;
use App\Modules\Produccion\Http\Requests\CrearOrdenProduccionRequest;
use App\Modules\Produccion\Http\Requests\CrearRecetaRequest;
use App\Modules\Produccion\Http\Requests\CrearTransformacionRequest;
use App\Modules\Produccion\Http\Requests\GuardarInsumoStockRequest;
use App\Modules\Produccion\Models\Insumo;
use App\Modules\Produccion\Models\OrdenProduccion;
use App\Modules\Produccion\Models\Receta;
use App\Modules\Tpv\Http\Requests\CotizarVentaRequest;
use App\Modules\Tpv\Http\Requests\CrearVentaRequest;
use App\Modules\Tpv\Models\Venta;
use App\Modules\UnidadesMedida\Models\UnidadMedida;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CantidadesRequestTest extends TestCase
{
    use RefreshDatabase;

    #[DataProvider('operaciones')]
    public function test_el_form_request_valida_granel_y_pieza(string $clase, string $campo, bool $granel, float|int $cantidad, bool $valido): void
    {
        $tenant = Tenant::factory()->create();
        app(TenantContext::class)->set($tenant);
        $sucursal = Sucursal::factory()->create(['tenant_id' => $tenant->id]);
        $usuario = Usuario::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id]);
        $producto = Producto::factory()->create(['tenant_id' => $tenant->id]);
        $variante = ProductoVariante::factory()->create(['producto_id' => $producto->id, 'es_granel' => $granel]);
        $cliente = Cliente::factory()->create(['tenant_id' => $tenant->id]);
        $proveedor = Proveedor::factory()->create(['tenant_id' => $tenant->id]);
        $metodo = MetodoPago::factory()->create(['tenant_id' => $tenant->id]);
        $venta = Venta::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id, 'cliente_id' => $cliente->id]);
        $linea = ['variante_id' => $variante->id, 'cantidad' => $cantidad, 'precio_compra' => 100, 'precio_unitario' => 100];
        $payload = ['cliente_id' => $cliente->ulid, 'proveedor_id' => $proveedor->id, 'venta_id' => $venta->ulid,
            'tipo' => 'devolucion', 'items' => [$linea], 'items_devueltos' => [$linea],
            'pagos' => [['metodo_pago_id' => $metodo->id, 'monto' => 50]], 'tipo_entrega' => 'domicilio', 'direccion_entrega' => 'Centro'];
        $idRuta = 0;
        if (str_contains($clase, 'Produccion')) {
            $unidad = UnidadMedida::factory()->create(['tenant_id' => $tenant->id]);
            $insumo = Insumo::factory()->create(['tenant_id' => $tenant->id, 'unidad_medida_id' => $unidad->id]);
            $receta = Receta::factory()->create(['tenant_id' => $tenant->id, 'variante_id' => $variante->id]);
            $orden = OrdenProduccion::factory()->create(['tenant_id' => $tenant->id, 'receta_id' => $receta->id, 'sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id]);
            $idRuta = $orden->id;
            $payload += ['nombre' => 'Dato de cantidad', 'unidad_medida_id' => $unidad->id, 'cantidad' => $cantidad, 'stock_minimo' => $cantidad,
                'receta_id' => $receta->id, 'variante_id' => $variante->id, 'cantidad_programada' => $cantidad,
                'cantidad_producida' => $cantidad, 'estado' => 'completada', 'rendimiento' => $cantidad,
                'variante_origen_id' => $variante->id, 'variante_destino_id' => $variante->id,
                'cantidad_origen' => $cantidad, 'cantidad_destino' => $cantidad,
                'ingredientes' => [['insumo_id' => $insumo->id, 'cantidad' => $cantidad, 'unidad_medida_id' => $unidad->id]]];
        }
        if (str_contains($clase, 'Precios')) {
            $payload['tipo'] = 'nxm';
            $payload += ['nombre' => 'Regla decimal', 'aplica_a' => 'variante', 'variante_id' => $variante->id, 'cantidad_compra' => $cantidad, 'cantidad_paga' => 1];
        }
        Route::post('/__dat01-cantidades/{id?}', function () use ($clase) {
            return response()->json(app($clase)->validated());
        });
        $respuesta = $this->actingAs($usuario)->postJson('/__dat01-cantidades/'.$idRuta, $payload);
        if ($valido) {
            $respuesta->assertOk()->assertJsonPath($campo, $cantidad);
        } else {
            $respuesta->assertStatus(422)->assertJsonValidationErrors($campo);
            if (! $granel && $cantidad === 0.5) {
                $this->assertSame('La cantidad de una variante por pieza debe ser entera.', $respuesta->json('errors')[$campo][0]);
            }
            if ($cantidad === 0.0001) {
                $this->assertSame('La cantidad admite como máximo tres decimales.', $respuesta->json('errors')[$campo][0]);
            }
        }
    }

    public static function operaciones(): array
    {
        $casos = [];
        foreach ([CrearVentaRequest::class, CotizarVentaRequest::class, CrearApartadoRequest::class, RegistrarCompraRequest::class, CrearDevolucionRequest::class, CrearCotizacionRequest::class, CrearPedidoRequest::class] as $clase) {
            foreach ([[true, 0.5, true], [false, 0.5, false], [true, 0.001, true], [true, 0.0001, false], [false, 1, true], [true, 0, false]] as [$granel, $cantidad, $valido]) {
                $campo = $clase === CrearDevolucionRequest::class ? 'items_devueltos.0.cantidad' : 'items.0.cantidad';
                $casos[$clase.' '.($granel ? 'granel' : 'pieza').' '.$cantidad] = [$clase, $campo, $granel, $cantidad, $valido];
            }
        }

        foreach ([
            [CrearOrdenProduccionRequest::class, 'cantidad_programada', true, false],
            [CambiarEstadoOrdenRequest::class, 'cantidad_producida', true, false],
            [CrearTransformacionRequest::class, 'cantidad_origen', true, false],
            [CrearRecetaRequest::class, 'rendimiento', true, false],
            [GuardarInsumoStockRequest::class, 'cantidad', false, false],
            [CrearInsumoRequest::class, 'stock_minimo', false, true],
            [GuardarReglaPrecioRequest::class, 'cantidad_compra', false, false],
        ] as [$clase, $campo, $porVariante, $permiteCero]) {
            foreach ([[true, 0.5], [false, 0.5], [true, 0.001], [true, 0.0001], [false, 1], [true, 0]] as [$granel, $cantidad]) {
                $valido = $cantidad === 0 ? $permiteCero : $cantidad >= 0.001 && (! $porVariante || $granel || $cantidad === 1);
                $casos[$clase.' '.($granel ? 'granel' : 'pieza').' '.$cantidad] = [$clase, $campo, $granel, $cantidad, $valido];
            }
        }

        return $casos;
    }
}
