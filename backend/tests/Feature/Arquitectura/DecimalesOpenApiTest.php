<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use App\Modules\Nucleo\Support\DecimalApi;
use Tests\TestCase;

class DecimalesOpenApiTest extends TestCase
{
    /** @var list<string> */
    private const BASE = [
        'components/schemas/ApartadoResource/properties/total',
        'components/schemas/ApartadoResource/properties/total_abonado',
        'components/schemas/ApartadoResource/properties/detalles/items/properties/cantidad',
        'components/schemas/ApartadoResource/properties/detalles/items/properties/precio_unitario',
        'components/schemas/ApartadoResource/properties/detalles/items/properties/subtotal',
        'components/schemas/ApartadoResource/properties/abonos/items/properties/monto',
        'components/schemas/ApartadoResource/properties/abonos/items/properties/pagos/items/properties/monto',
        'components/schemas/CajaSesionResource/properties/monto_apertura',
        'components/schemas/CajaSesionResource/properties/monto_cierre',
        'components/schemas/CajaSesionResource/properties/total_ventas_sistema',
        'components/schemas/CajaSesionResource/properties/diferencia',
        'components/schemas/CuponResource/properties/monto',
        'components/schemas/DevolucionResource/properties/monto_devolucion',
        'components/schemas/DevolucionResource/properties/monto_cambio',
        'components/schemas/DevolucionResource/properties/diferencia',
        'components/schemas/DevolucionResource/properties/items/items/properties/cantidad',
        'components/schemas/DevolucionResource/properties/items/items/properties/precio_unitario',
        'components/schemas/DevolucionResource/properties/items/items/properties/subtotal',
        'components/schemas/DevolucionResource/properties/pagos/items/properties/monto',
        'components/schemas/GastoResource/properties/monto',
        'components/schemas/ProductoResource/properties/precio_compra',
        'components/schemas/ProductoResource/properties/precio_venta',
        'components/schemas/ProductoResource/properties/stock_total',
        'components/schemas/ProductoVarianteResource/properties/stock_actual',
        'components/schemas/ProductoVarianteResource/properties/stock/items/properties/stock_actual',
        'components/schemas/ProductoVarianteResource/properties/stock/items/properties/stock_minimo',
        'components/schemas/ReglaPrecioResource/properties/monto',
        'components/schemas/ReglaPrecioResource/properties/cantidad_compra',
        'components/schemas/ReglaPrecioResource/properties/cantidad_paga',
        'components/schemas/ReglaPrecioResource/properties/precio_bundle',
        'components/schemas/Venta/properties/total',
        'components/schemas/Venta/properties/descuento_cupon',
        'components/schemas/Venta/properties/descuento_manual',
        'components/schemas/Venta/properties/abono_previo',
        'components/schemas/VentaResource/properties/total',
        'components/schemas/VentaResource/properties/descuento_cupon',
        'components/schemas/VentaResource/properties/descuento_manual',
        'components/schemas/VentaResource/properties/abono_previo',
        'components/schemas/VentaResource/properties/metodos_pago/items/properties/monto',
        'components/schemas/VentaLineaResource/properties/cantidad',
        'components/schemas/VentaLineaResource/properties/precio_unitario',
        'components/schemas/VentaLineaResource/properties/descuento_aplicado',
        'components/schemas/VentaLineaResource/properties/subtotal',
        'paths//apartados/{apartado}/cancelar/patch/responses/200/content/application/json/schema/properties/meta/properties/monto_abonado_pendiente',
        'paths//caja/actual/get/responses/200/content/application/json/schema/properties/meta/properties/resumen/properties/total_ventas',
        'paths//caja/actual/get/responses/200/content/application/json/schema/properties/meta/properties/resumen/properties/total_gastos',
        'paths//caja/{cajaSesion}/cerrar/patch/responses/200/content/application/json/schema/properties/desglose/properties/total_gastos',
        'paths//caja/{cajaSesion}/cerrar/patch/responses/200/content/application/json/schema/properties/desglose/properties/total_abonos_cxc',
        'paths//caja/{cajaSesion}/cerrar/patch/responses/200/content/application/json/schema/properties/desglose/properties/total_recargas_gc',
        'paths//caja/{cajaSesion}/cerrar/patch/responses/200/content/application/json/schema/properties/desglose/properties/total_pagos_cxp',
        'paths//compras/post/responses/201/content/application/json/schema/properties/data/properties/total',
        'paths//cupones/validar/post/responses/200/content/application/json/schema/properties/data/properties/descuento',
        'paths//cupones/validar/post/responses/200/content/application/json/schema/properties/data/properties/total_con_descuento',
        'paths//cupones/validar/post/responses/200/content/application/json/schema/properties/data/properties/cupon/properties/monto',
        'paths//devoluciones/post/responses/201/content/application/json/schema/properties/nota_credito/properties/monto_original',
        'paths//inicio/resumen/get/responses/200/content/application/json/schema/properties/data/properties/ventas_hoy/properties/total',
        'paths//inicio/resumen/get/responses/200/content/application/json/schema/properties/data/properties/apartados_por_vencer/items/properties/total',
        'paths//inicio/resumen/get/responses/200/content/application/json/schema/properties/data/properties/apartados_por_vencer/items/properties/total_abonado',
        'paths//producto-variantes/{variante}/kardex/get/responses/200/content/application/json/schema/properties/data/items/properties/cantidad',
        'paths//producto-variantes/{variante}/kardex/get/responses/200/content/application/json/schema/properties/data/items/properties/stock_resultante',
        'paths//ventas/cotizar/post/responses/200/content/application/json/schema/properties/data/properties/subtotal',
        'components/schemas/CotizacionVentaLineaResource/properties/cantidad',
        'components/schemas/CotizacionVentaLineaResource/properties/precio_unitario',
        'components/schemas/CotizacionVentaLineaResource/properties/descuento_aplicado',
        'components/schemas/CotizacionVentaLineaResource/properties/subtotal',
        'paths//ventas/reporte/get/responses/200/content/application/json/schema/properties/data/properties/total_ventas',
        'paths//ventas/reporte/get/responses/200/content/application/json/schema/properties/data/properties/ticket_promedio',
        'paths//ventas/reporte/get/responses/200/content/application/json/schema/properties/data/properties/por_sucursal/items/properties/total',
        'paths//ventas/reporte/get/responses/200/content/application/json/schema/properties/data/properties/por_metodo_pago/items/properties/total',
        'paths//ventas/reporte/get/responses/200/content/application/json/schema/properties/data/properties/top_productos/items/properties/cantidad_vendida',
        'paths//ventas/reporte/get/responses/200/content/application/json/schema/properties/data/properties/top_productos/items/properties/total_vendido',
    ];

    /** @var array<string, string> */
    private const PENDIENTES = [];

    /** @var array<string, string> */
    private const EXENTOS = [
        'paths//crm/reporte/get/responses/200/content/application/json/schema/properties/data/properties/loyalty/properties/saldo_actual_total' => 'Saldo agregado de puntos enteros de lealtad de CrmAvanzado.',
    ];

    public function test_el_contrato_conserva_ids_conteos_y_campos_no_nullable(): void
    {
        $api = json_decode(file_get_contents(base_path('../docs/api/openapi.json')), true, flags: JSON_THROW_ON_ERROR);
        foreach (['precio_compra', 'precio_venta'] as $campo) {
            $this->assertSame('string', $api['components']['schemas']['ProductoResource']['properties'][$campo]['type']);
        }
        $this->assertSame('string', $api['components']['schemas']['ApartadoResource']['properties']['total_abonado']['type']);
        $esquemaLinea = $api['paths']['/ventas/cotizar']['post']['responses']['200']['content']['application/json']['schema']['properties']['data']['properties']['items']['items'];
        if (isset($esquemaLinea['$ref'])) {
            $esquemaLinea = $api['components']['schemas'][substr($esquemaLinea['$ref'], strlen('#/components/schemas/'))];
        }
        $linea = $esquemaLinea['properties'];
        $this->assertSame('integer', $linea['variante_id']['type']);
        $tiposRegla = $linea['regla_precio_id']['type'];
        sort($tiposRegla);
        $this->assertSame(['integer', 'null'], $tiposRegla);
        $conteo = $api['paths']['/caja/actual']['get']['responses']['200']['content']['application/json']['schema']['properties']['meta']['properties']['resumen']['properties']['ventas_count'];
        $this->assertSame('integer', $conteo['type']);
        $this->assertSame(0, $conteo['minimum']);
    }

    public function test_los_patrones_distinguen_dinero_y_cantidad(): void
    {
        $api = json_decode(file_get_contents(base_path('../docs/api/openapi.json')), true, flags: JSON_THROW_ON_ERROR);
        $this->assertSame(DecimalApi::PATRON_DINERO, $api['components']['schemas']['ProductoResource']['properties']['precio_venta']['pattern']);
        $this->assertSame(DecimalApi::PATRON_CANTIDAD, $api['components']['schemas']['ProductoVarianteResource']['properties']['stock_actual']['pattern']);
    }

    public function test_las_respuestas_del_alcance_son_cadenas_con_patron_y_solo_quedan_los_pendientes_de_api02b(): void
    {
        $api = json_decode(file_get_contents(base_path('../docs/api/openapi.json')), true, flags: JSON_THROW_ON_ERROR);
        $campos = [];
        foreach ($api['components']['schemas'] as $nombre => $esquema) {
            if (! str_ends_with($nombre, 'Request')) {
                $this->recolectar($esquema, 'components/schemas/'.$nombre, $campos);
            }
        }
        foreach ($api['paths'] as $ruta => $operaciones) {
            foreach ($operaciones as $verbo => $operacion) {
                if (isset($operacion['responses'])) {
                    $this->recolectar($operacion['responses'], 'paths/'.$ruta.'/'.$verbo.'/responses', $campos);
                }
            }
        }
        foreach (self::BASE as $campo) {
            $this->assertArrayHasKey($campo, $campos);
            $this->assertArrayNotHasKey($campo, self::PENDIENTES);
        }
        foreach (self::EXENTOS as $campo => $razon) {
            $this->assertArrayHasKey($campo, $campos, $razon);
            $this->assertSame('integer', $campos[$campo]['type'], $razon);
        }
        $incumplimientos = [];
        foreach ($campos as $clave => $esquema) {
            if (isset(self::EXENTOS[$clave])) {
                continue;
            }
            $nombre = substr($clave, strrpos($clave, '/') + 1);
            $cantidad = preg_match('/^(cantidad|stock|existencia|rendimiento)(_|$)/', $nombre);
            $patron = match (true) {
                $clave === 'components/schemas/InsumoResource/properties/costo' => '^-?[0-9]+\.[0-9]{4}$',
                (bool) $cantidad => DecimalApi::PATRON_CANTIDAD,
                default => DecimalApi::PATRON_DINERO,
            };
            $tipos = array_values(array_filter((array) ($esquema['type'] ?? []), static fn ($tipo) => $tipo !== 'null'));
            if ($tipos !== ['string'] || ($esquema['pattern'] ?? null) !== $patron) {
                $incumplimientos[] = $clave;
            }
        }
        $esperados = array_keys(self::PENDIENTES);
        sort($esperados);
        sort($incumplimientos);
        $this->assertSame($esperados, $incumplimientos, 'PENDIENTES de API-02b solo baja. Cada campo base debe ser string con patrón D2 o D3.');
    }

    /**
     * @param  array<string, mixed>  $nodo
     * @param  array<string, array<string, mixed>>  $campos
     */
    private function recolectar(array $nodo, string $ruta, array &$campos): void
    {
        foreach ($nodo as $clave => $valor) {
            if ($clave === 'properties') {
                foreach ($valor as $nombre => $esquema) {
                    $decimal = preg_match('/^(?:(?:precio|monto|total|subtotal|costo|saldo|descuento|abono|cantidad|stock|existencia|rendimiento)(?:_|$)|diferencia$|ticket_promedio$|valor$|salario_base$|percepciones$|deducciones$|neto$|interes_total$)/', $nombre)
                        || str_ends_with($ruta, '/properties/por_antiguedad');
                    $contenedor = isset($esquema['$ref']) || in_array($esquema['type'] ?? null, ['array', 'object'], true);
                    $conteo = ($nombre === 'total' && str_ends_with($ruta, '/properties/meta'))
                        || ($nombre === 'cantidad' && str_ends_with($ruta, '/properties/ventas_hoy'));
                    if ($decimal && ! $contenedor && ! $conteo && ! str_ends_with($nombre, '_id')) {
                        $campos[$ruta.'/properties/'.$nombre] = $esquema;
                    }
                }
            }
            if (is_array($valor)) {
                $this->recolectar($valor, $ruta.'/'.$clave, $campos);
            }
        }
    }
}
