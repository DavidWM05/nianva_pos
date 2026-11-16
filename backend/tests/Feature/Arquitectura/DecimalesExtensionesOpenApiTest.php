<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use App\Modules\Nucleo\Support\DecimalApi;
use Tests\TestCase;

class DecimalesExtensionesOpenApiTest extends TestCase
{
    public function test_todas_las_respuestas_de_extensiones_tienen_patron_decimal(): void
    {
        $api = json_decode(file_get_contents(base_path('../docs/api/openapi.json')), true, flags: JSON_THROW_ON_ERROR);
        $propiedades = [];
        $this->recolectar($api, '', $propiedades);
        $campos = [
            'components/schemas/AbonoCuenta/properties/monto',
            'components/schemas/AbonoCuentaResource/properties/monto',
            'components/schemas/AbonoPagar/properties/monto',
            'components/schemas/AbonoPagarResource/properties/monto',
            'components/schemas/CotizacionDetalleResource/properties/cantidad',
            'components/schemas/CotizacionDetalleResource/properties/precio_unitario',
            'components/schemas/CotizacionDetalleResource/properties/descuento',
            'components/schemas/CotizacionDetalleResource/properties/subtotal',
            'components/schemas/CotizacionResource/properties/total',
            'components/schemas/CotizacionResource/properties/descuento',
            'components/schemas/CuentaCobrarResource/properties/monto_total',
            'components/schemas/CuentaCobrarResource/properties/saldo_pendiente',
            'components/schemas/CuentaPagarResource/properties/monto_total',
            'components/schemas/CuentaPagarResource/properties/saldo_pendiente',
            'components/schemas/EmpleadoResource/properties/salario_base',
            'components/schemas/GiftCardResource/properties/saldo_inicial',
            'components/schemas/GiftCardResource/properties/saldo_actual',
            'components/schemas/GiftCardResource/properties/recargas/items/properties/monto',
            'components/schemas/InsumoResource/properties/stock_minimo',
            'components/schemas/InsumoStock/properties/cantidad',
            'components/schemas/NominaDetalleResource/properties/percepciones',
            'components/schemas/NominaDetalleResource/properties/deducciones',
            'components/schemas/NominaDetalleResource/properties/neto',
            'components/schemas/NominaResource/properties/total_percepciones',
            'components/schemas/NominaResource/properties/total_deducciones',
            'components/schemas/NominaResource/properties/total_neto',
            'components/schemas/NotaCreditoResource/properties/monto_original',
            'components/schemas/NotaCreditoResource/properties/saldo_disponible',
            'components/schemas/NotaCreditoResource/properties/usos/items/properties/monto_usado',
            'components/schemas/OrdenProduccionResource/properties/cantidad_programada',
            'components/schemas/OrdenProduccionResource/properties/cantidad_producida',
            'components/schemas/PedidoItemResource/properties/cantidad',
            'components/schemas/PedidoItemResource/properties/precio_unitario',
            'components/schemas/PedidoItemResource/properties/subtotal',
            'components/schemas/PedidoResource/properties/costo_delivery',
            'components/schemas/PlanPagoClienteCuota/properties/monto',
            'components/schemas/PlanPagoClienteCuota/properties/monto_interes',
            'components/schemas/PlanPagoClienteCuota/properties/monto_capital',
            'components/schemas/PlanPagoResource/properties/monto_total',
            'components/schemas/PlanPagoResource/properties/interes_total',
            'components/schemas/PrestamoPago/properties/monto',
            'components/schemas/PrestamoResource/properties/monto',
            'components/schemas/PrestamoResource/properties/monto_a_pagar',
            'components/schemas/PrestamoResource/properties/saldo_pendiente',
            'components/schemas/RecetaIngrediente/properties/cantidad',
            'components/schemas/RecetaResource/properties/rendimiento',
            'components/schemas/TransformacionResource/properties/cantidad_origen',
            'components/schemas/TransformacionResource/properties/cantidad_destino',
            'paths//cuentas-cobrar/reporte/get/responses/200/content/application/json/schema/properties/data/properties/total_pendiente',
            'paths//cuentas-cobrar/reporte/get/responses/200/content/application/json/schema/properties/data/properties/total_vencido',
            'paths//cuentas-cobrar/reporte/get/responses/200/content/application/json/schema/properties/data/properties/por_antiguedad/properties/al_dia',
            'paths//cuentas-cobrar/reporte/get/responses/200/content/application/json/schema/properties/data/properties/por_antiguedad/properties/vencido_1_30',
            'paths//cuentas-cobrar/reporte/get/responses/200/content/application/json/schema/properties/data/properties/por_antiguedad/properties/vencido_31_60',
            'paths//cuentas-cobrar/reporte/get/responses/200/content/application/json/schema/properties/data/properties/por_antiguedad/properties/vencido_61_90',
            'paths//cuentas-cobrar/reporte/get/responses/200/content/application/json/schema/properties/data/properties/por_antiguedad/properties/vencido_90_mas',
            'paths//cuentas-cobrar/reporte/get/responses/200/content/application/json/schema/properties/data/properties/por_cliente/items/properties/saldo_pendiente',
            'paths//cuentas-cobrar/{id}/abonos/post/responses/200/content/application/json/schema/properties/data/properties/cuenta/properties/saldo_pendiente',
            'paths//cuentas-pagar/reporte/get/responses/200/content/application/json/schema/properties/data/properties/total_pendiente',
            'paths//cuentas-pagar/reporte/get/responses/200/content/application/json/schema/properties/data/properties/total_vencido',
            'paths//cuentas-pagar/reporte/get/responses/200/content/application/json/schema/properties/data/properties/por_antiguedad/properties/al_dia',
            'paths//cuentas-pagar/reporte/get/responses/200/content/application/json/schema/properties/data/properties/por_antiguedad/properties/vencido_1_30',
            'paths//cuentas-pagar/reporte/get/responses/200/content/application/json/schema/properties/data/properties/por_antiguedad/properties/vencido_31_60',
            'paths//cuentas-pagar/reporte/get/responses/200/content/application/json/schema/properties/data/properties/por_antiguedad/properties/vencido_61_90',
            'paths//cuentas-pagar/reporte/get/responses/200/content/application/json/schema/properties/data/properties/por_antiguedad/properties/vencido_90_mas',
            'paths//cuentas-pagar/reporte/get/responses/200/content/application/json/schema/properties/data/properties/por_proveedor/items/properties/saldo_pendiente',
            'paths//cuentas-pagar/{id}/pagos/post/responses/200/content/application/json/schema/properties/data/properties/cuenta/properties/saldo_pendiente',
        ];
        $errores = [];
        foreach ($campos as $campo) {
            $this->assertArrayHasKey($campo, $propiedades);
            $esquema = $propiedades[$campo];
            $nombre = substr($campo, strrpos($campo, '/') + 1);
            $patron = preg_match('/^(cantidad|stock|existencia|rendimiento)(_|$)/', $nombre)
                ? DecimalApi::PATRON_CANTIDAD : DecimalApi::PATRON_DINERO;
            $tipos = array_values(array_filter((array) ($esquema['type'] ?? []), static fn ($tipo) => $tipo !== 'null'));
            if ($tipos !== ['string'] || ($esquema['pattern'] ?? null) !== $patron) {
                $errores[] = $campo;
            }
        }
        $this->assertSame([], $errores);
    }

    private function recolectar(array $nodo, string $ruta, array &$propiedades): void
    {
        $propiedades[$ruta] = $nodo;
        foreach ($nodo as $clave => $valor) {
            if (is_array($valor)) {
                $this->recolectar($valor, $ruta === '' ? (string) $clave : $ruta.'/'.$clave, $propiedades);
            }
        }
    }
}
