<?php

declare(strict_types=1);

namespace Tests\Feature\Arquitectura;

use Tests\TestCase;

/**
 * UI-11b / DAT-02: todo campo de dinero del cuerpo de una peticion lleva `decimal:0,2` en su
 * FormRequest, y el contrato lo publica como `multipleOf 0.01`. Asi el frontend lee del
 * contrato cuantos decimales acepta y el backend rechaza un tercer decimal en vez de
 * redondearlo. El dinero se reconoce por el nombre, con el mismo criterio que
 * DineroEnDecimalTest usa para las columnas; tambien en las lineas (`items.*`, `pagos.*`).
 */
class DineroEnCuerposOpenApiTest extends TestCase
{
    /** @var array<string, string> esquema.campo => razon */
    private const EXENTOS = [
        'CrearInsumoRequest.costo' => 'costo unitario de insumo de produccion: 4 decimales (decision del responsable, 2026-11-14; ver DineroEnDecimalTest)',
        'CrearPedidoRequest.costo_delivery' => 'Delivery esta congelado (ARQ-10)',
        'CrearPedidoRequest.items.precio_unitario' => 'Delivery esta congelado (ARQ-10)',
        'CrearEmpleadoRequest.salario_base' => 'Payroll esta congelado (ARQ-10)',
        'CrearPrestamoRequest.monto' => 'Prestamos esta congelado (ARQ-10)',
        'RegistrarPagoPrestamoRequest.monto' => 'Prestamos esta congelado (ARQ-10)',
    ];

    public function test_todo_campo_de_dinero_de_un_cuerpo_publica_multiple_of_0_01(): void
    {
        $sinDecimales = [];
        $exentosEncontrados = [];
        foreach ($this->camposDeDinero() as $clave => $propiedad) {
            if (array_key_exists($clave, self::EXENTOS)) {
                $exentosEncontrados[] = $clave;

                continue;
            }
            $multiplo = $propiedad['multipleOf'] ?? null;
            if (! is_numeric($multiplo) || abs((float) $multiplo - 0.01) > 1e-12) {
                $sinDecimales[] = $clave;
            }
        }

        $this->assertSame([], $sinDecimales, 'Campos de dinero sin decimal:0,2 en su FormRequest.');
        $this->assertNotEmpty($exentosEncontrados);
    }

    public function test_cada_exento_sigue_existiendo_en_el_contrato(): void
    {
        $this->assertSame([], array_values(array_diff(array_keys(self::EXENTOS), array_keys($this->camposDeDinero()))));
    }

    /**
     * Campos numericos con nombre de dinero de los esquemas `*Request`, con su clave
     * `Esquema.campo` o `Esquema.arreglo.campo` para los de las lineas.
     *
     * @return array<string, array<string, mixed>>
     */
    private function camposDeDinero(): array
    {
        $api = json_decode((string) file_get_contents(base_path('../docs/api/openapi.json')), true, flags: JSON_THROW_ON_ERROR);
        $campos = [];
        foreach ($api['components']['schemas'] as $nombre => $esquema) {
            if (str_ends_with($nombre, 'Request')) {
                $this->recolectar($esquema['properties'] ?? [], $nombre, $campos);
            }
        }

        return $campos;
    }

    /**
     * @param  array<string, array<string, mixed>>  $propiedades
     * @param  array<string, array<string, mixed>>  $campos
     */
    private function recolectar(array $propiedades, string $prefijo, array &$campos): void
    {
        foreach ($propiedades as $campo => $propiedad) {
            $tipos = (array) ($propiedad['type'] ?? []);
            if (in_array('array', $tipos, true) && isset($propiedad['items']['properties'])) {
                $this->recolectar($propiedad['items']['properties'], $prefijo.'.'.$campo, $campos);

                continue;
            }
            if (in_array('number', $tipos, true) && $this->esDinero((string) $campo)) {
                $campos[$prefijo.'.'.$campo] = $propiedad;
            }
        }
    }

    private function esDinero(string $nombre): bool
    {
        return preg_match('/^(precio|monto|total|subtotal|costo|saldo|descuento|abono)(_|$)/', $nombre) === 1
            || in_array($nombre, ['diferencia', 'salario_base', 'percepciones', 'deducciones', 'neto', 'interes_total'], true);
    }
}
