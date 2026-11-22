<?php

declare(strict_types=1);

namespace Tests\Feature\Datos;

use App\Modules\Apartados\Models\ApartadoDetalle;
use App\Modules\Cotizaciones\Models\CotizacionDetalle;
use App\Modules\Cotizaciones\Services\CotizacionService;
use App\Modules\Devoluciones\Models\DevolucionItem;
use App\Modules\Inventario\Models\CompraDetalle;
use App\Modules\Inventario\Models\InventarioStock;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Nucleo\Support\AccionSupervisor;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Models\VentaDetalle;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\Support\AutorizaOperaciones;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

/**
 * DAT-03: cada línea de venta, apartado, devolución, cotización y compra guarda la foto de la
 * operación (precio, descuento, lista, regla, costo, impuesto, unidad y factor). Cambiar el
 * catálogo después no cambia el documento ya emitido, y liquidar un apartado cobra lo acordado.
 */
class FotoPorLineaTest extends TestCase
{
    use AutorizaOperaciones;
    use PreparaNegocio;
    use RefreshDatabase;

    /** Columnas de foto NOT NULL y sin default. */
    private const OBLIGATORIAS = ['precio_unitario', 'costo_unitario', 'tasa_impuesto', 'exento', 'impuesto', 'unidad_medida_id', 'factor'];

    /** Pares que son null juntos cuando no aplicaron. */
    private const PARES = ['lista_precio_id', 'lista_precio_nombre', 'regla_precio_id', 'regla_nombre'];

    /** @var array<string, string> tabla => columna de descuento */
    private const TABLAS = [
        'venta_detalles' => 'descuento_aplicado',
        'apartado_detalles' => 'descuento',
        'devolucion_items' => 'descuento',
        'cotizacion_detalles' => 'descuento',
        'compra_detalles' => 'descuento',
    ];

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio(['ventas.ver', 'apartados.crear', 'apartados.abonar', 'apartados.ver', 'devoluciones.crear', 'devoluciones.ver', 'cotizaciones.ver']);
    }

    public function test_las_columnas_de_foto_son_not_null_y_sin_default(): void
    {
        $infracciones = [];
        foreach (self::TABLAS as $tabla => $descuento) {
            $columnas = collect(Schema::getColumns($tabla))->keyBy('name');
            foreach ([...self::OBLIGATORIAS, $descuento] as $nombre) {
                $columna = $columnas->get($nombre);
                if ($columna === null || $columna['nullable'] || $columna['default'] !== null) {
                    $infracciones[] = "{$tabla}.{$nombre}";
                }
            }
            foreach (self::PARES as $nombre) {
                if (! $columnas->has($nombre)) {
                    $infracciones[] = "{$tabla}.{$nombre} (falta)";
                }
            }
        }

        $this->assertSame([], $infracciones);
    }

    public function test_cambiar_el_catalogo_no_cambia_una_venta_emitida(): void
    {
        $venta = $this->crearVenta();
        $antes = $this->foto(VentaDetalle::query()->where('venta_id', $venta->id)->firstOrFail());

        $this->cambiarCatalogo();

        $this->assertSame($antes, $this->foto(VentaDetalle::query()->where('venta_id', $venta->id)->firstOrFail()));
        $this->assertSame(['100.00', '50.00', '16.0000', '13.79'], [$antes['precio_unitario'], $antes['costo_unitario'], $antes['tasa_impuesto'], $antes['impuesto']]);
        $this->actingAs($this->usuario)->getJson("/api/v1/ventas/{$venta->ulid}")
            ->assertOk()
            ->assertJsonPath('data.detalles.0.precio_unitario', '100.00')
            ->assertJsonPath('data.detalles.0.tasa_impuesto', '16.0000')
            ->assertJsonPath('data.detalles.0.impuesto', '13.79');
    }

    public function test_cambiar_el_catalogo_no_cambia_un_apartado_emitido(): void
    {
        $apartado = $this->crearApartado();
        $antes = $this->foto(ApartadoDetalle::query()->where('apartado_id', $apartado->id)->firstOrFail());

        $this->cambiarCatalogo();

        $this->assertSame($antes, $this->foto(ApartadoDetalle::query()->where('apartado_id', $apartado->id)->firstOrFail()));
        $this->assertSame(['100.00', '50.00', '16.0000'], [$antes['precio_unitario'], $antes['costo_unitario'], $antes['tasa_impuesto']]);
    }

    public function test_cambiar_el_catalogo_no_cambia_una_cotizacion_emitida(): void
    {
        $cotizacionId = $this->crearCotizacion();
        $antes = $this->foto(CotizacionDetalle::query()->where('cotizacion_id', $cotizacionId)->firstOrFail());

        $this->cambiarCatalogo();

        $this->assertSame($antes, $this->foto(CotizacionDetalle::query()->where('cotizacion_id', $cotizacionId)->firstOrFail()));
        $this->assertSame(['100.00', '50.00', '16.0000', '13.79'], [$antes['precio_unitario'], $antes['costo_unitario'], $antes['tasa_impuesto'], $antes['impuesto']]);
    }

    public function test_cambiar_el_catalogo_no_cambia_una_compra_emitida(): void
    {
        $linea = CompraDetalle::query()->where('compra_id', $this->compra->id)->where('variante_id', $this->variante->id)->firstOrFail();
        $antes = $this->foto($linea);

        $this->cambiarCatalogo();

        $this->assertSame($antes, $this->foto($linea->refresh()));
        $this->assertSame(['50.00', '50.00', '0.00', '16.0000', '344.83'], [$antes['precio_unitario'], $antes['costo_unitario'], $antes['descuento'], $antes['tasa_impuesto'], $antes['impuesto']]);
    }

    public function test_una_devolucion_copia_la_foto_de_la_venta_y_no_la_recotiza(): void
    {
        $venta = $this->crearVenta();
        $this->cambiarCatalogo();

        $datosSupervisor1 = [
            'venta_id' => $venta->ulid,
            'tipo' => 'devolucion',
            'items_devueltos' => [['variante_id' => $this->variante->id, 'cantidad' => 1, 'va_a_merma' => false]],
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => 100]],
        ];
        $this->actingAs($this->usuario)->postJson('/api/v1/devoluciones', $datosSupervisor1, ['X-Autorizacion-Supervisor' => self::conSupervisor($this->usuario, AccionSupervisor::Reembolsar, $datosSupervisor1, $venta->ulid)->token])->assertCreated();

        $devuelto = $this->foto(DevolucionItem::query()->where('tipo', 'devuelto')->firstOrFail());
        $original = $this->foto(VentaDetalle::query()->where('venta_id', $venta->id)->firstOrFail());
        $this->assertSame(['100.00', '50.00', '16.0000', '13.79'], [$devuelto['precio_unitario'], $devuelto['costo_unitario'], $devuelto['tasa_impuesto'], $devuelto['impuesto']]);
        $this->assertSame($original['unidad_medida_id'], $devuelto['unidad_medida_id']);
    }

    public function test_liquidar_un_apartado_cobra_el_precio_del_apartado_aunque_cambie_el_catalogo(): void
    {
        $apartado = $this->crearApartado();
        $this->actingAs($this->usuario)->postJson("/api/v1/apartados/{$apartado->ulid}/abonos", [
            'monto' => 100,
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => 100]],
        ])->assertOk();

        $this->producto->update(['precio_venta' => 180]);

        $ventaId = $this->patchJson("/api/v1/apartados/{$apartado->ulid}/liquidar")->assertOk()->json('data.venta_id');

        $venta = Venta::query()->where('ulid', $ventaId)->firstOrFail();
        $this->assertSame('100.00', (string) $venta->total);
        $linea = VentaDetalle::query()->where('venta_id', $venta->id)->firstOrFail();
        $this->assertSame('100.00', (string) $linea->getAttribute('precio_unitario'));
        $this->assertSame('16.0000', (string) $linea->getAttribute('tasa_impuesto'));
    }

    public function test_una_cotizacion_sin_stock_en_la_sucursal_usa_el_costo_de_la_variante(): void
    {
        $variante = ProductoVariante::create(['producto_id' => $this->producto->id, 'costo' => 35]);

        $linea = $this->cotizarVariante($variante->id);

        $this->assertSame('35.00', (string) $linea->getAttribute('costo_unitario'));
    }

    public function test_una_cotizacion_sin_stock_ni_costo_de_variante_usa_el_del_producto(): void
    {
        $variante = ProductoVariante::create(['producto_id' => $this->producto->id]);

        $linea = $this->cotizarVariante($variante->id);

        $this->assertSame('50.00', (string) $linea->getAttribute('costo_unitario'));
    }

    private function cotizarVariante(int $varianteId): CotizacionDetalle
    {
        $cotizacion = app(CotizacionService::class)->crear(
            ['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id, 'usuario_id' => $this->usuario->id, 'cliente_id' => $this->cliente->id, 'validez_dias' => 15, 'descuento' => 0, 'observaciones' => null, 'uso_cfdi' => null],
            [['variante_id' => $varianteId, 'cantidad' => 1, 'precio_unitario' => 100, 'descuento' => 0]],
        );

        return CotizacionDetalle::query()->where('cotizacion_id', $cotizacion->id)->firstOrFail();
    }

    /** Sube el precio, el costo de catálogo y la tasa, y mueve el costo promedio del stock. */
    private function cambiarCatalogo(): void
    {
        $this->producto->update(['precio_venta' => 150, 'precio_compra' => 90, 'tasa_iva' => '8.0000']);
        InventarioStock::query()->withoutGlobalScopes()->where('variante_id', $this->variante->id)->update(['costo_promedio' => 77]);
    }

    /** @return array<string, string|null> */
    private function foto(Model $linea): array
    {
        $descuento = $linea instanceof VentaDetalle ? 'descuento_aplicado' : 'descuento';
        $campos = ['precio_unitario', $descuento, 'lista_precio_id', 'lista_precio_nombre', 'regla_precio_id', 'regla_nombre', 'costo_unitario', 'tasa_impuesto', 'exento', 'impuesto', 'unidad_medida_id', 'factor'];
        $linea->refresh();

        $foto = [];
        foreach ($campos as $campo) {
            $valor = $linea->getAttribute($campo);
            $foto[$campo === $descuento ? 'descuento' : $campo] = $valor === null ? null : (is_bool($valor) ? ($valor ? '1' : '0') : (string) $valor);
        }

        return $foto;
    }
}
