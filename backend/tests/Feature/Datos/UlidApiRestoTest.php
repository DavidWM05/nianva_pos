<?php

declare(strict_types=1);

namespace Tests\Feature\Datos;

use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Precios\Models\ListaPrecio;
use App\Modules\Precios\Models\ListaPrecioCliente;
use App\Modules\Produccion\Models\OrdenProduccion;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

/**
 * DAT-08 etapa 3: clientes, cotizaciones, cuentas por cobrar y por pagar, planes de pago y
 * órdenes de producción se resuelven por ulid y lo publican en `id` (D-4); las rutas que recibían
 * `{id}` a mano pasan a binding. Las entradas `cliente_id` y `cuota_id` reciben el ulid y
 * rechazan el id interno, y el middleware de listas de precio reconoce al cliente por su ulid.
 */
class UlidApiRestoTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        $this->prepararNegocio([
            'clientes.ver', 'clientes.editar', 'cotizaciones.ver', 'cotizaciones.editar',
            'cotizaciones.eliminar', 'cuentas_cobrar.ver', 'cuentas_cobrar.anular',
            'cuentas_cobrar.registrar_abono', 'cuentas_pagar.ver', 'cuentas_pagar.anular',
            'ventas_plazos.ver', 'ventas_plazos.crear', 'produccion.completar', 'ventas.crear',
            'apartados.crear', 'cotizaciones.crear', 'gift_cards.ver', 'produccion.ver',
        ]);
        $this->seleccionarTerminalDeCaja();
        $this->actingAs($this->usuario);
    }

    public function test_los_detalles_responden_por_ulid_y_no_por_id(): void
    {
        $cotizacion = Cotizacion::query()->findOrFail($this->crearCotizacion());
        $cuenta = $this->crearCuentaCobrar();
        $plan = $this->crearPlan($this->crearVenta());

        foreach ([
            'clientes' => $this->cliente, 'cotizaciones' => $cotizacion,
            'cuentas-cobrar' => $cuenta, 'planes-pago-cliente' => $plan,
        ] as $recurso => $modelo) {
            $respuesta = $this->getJson("/api/v1/{$recurso}/{$modelo->ulid}");
            $this->assertSame(200, $respuesta->status(), "{$recurso}: ".$respuesta->getContent());
            $this->assertSame($modelo->ulid, $respuesta->json('data.id'), $recurso);
            $this->getJson("/api/v1/{$recurso}/{$modelo->getKey()}")->assertNotFound();
        }
    }

    public function test_las_rutas_que_recibian_id_a_mano_pasan_a_binding(): void
    {
        $cotizacion = Cotizacion::query()->findOrFail($this->crearCotizacion());
        $this->deleteJson("/api/v1/cotizaciones/{$cotizacion->getKey()}")->assertNotFound();
        $this->deleteJson("/api/v1/cotizaciones/{$cotizacion->ulid}")->assertOk();
        $this->assertSame('anulada', $cotizacion->refresh()->estado);

        $cuenta = $this->crearCuentaCobrar();
        $this->postJson("/api/v1/cuentas-cobrar/{$cuenta->getKey()}/anular")->assertNotFound();
        $this->postJson("/api/v1/cuentas-cobrar/{$cuenta->ulid}/anular")->assertOk();

        $pagar = CuentaPagar::factory()->create(['tenant_id' => $this->tenant->id, 'compra_id' => $this->compra->id]);
        $this->postJson("/api/v1/cuentas-pagar/{$pagar->getKey()}/anular")->assertNotFound();
        $this->postJson("/api/v1/cuentas-pagar/{$pagar->ulid}/anular")->assertOk();

        $orden = OrdenProduccion::factory()->create(['tenant_id' => $this->tenant->id, 'sucursal_id' => $this->sucursal->id]);
        $this->patchJson("/api/v1/ordenes-produccion/{$orden->getKey()}/estado", ['estado' => 'en_proceso'])->assertNotFound();
        $this->patchJson("/api/v1/ordenes-produccion/{$orden->ulid}/estado", ['estado' => 'en_proceso'])->assertOk();
        $this->assertSame('en_proceso', $orden->refresh()->estado);
        $this->getJson('/api/v1/ordenes-produccion')
            ->assertJsonPath('data.0.id', $orden->ulid)
            ->assertJsonMissingPath('data.0.numero');
    }

    public function test_el_abono_de_una_cuenta_responde_por_ulid_sin_ids_internos(): void
    {
        $cuenta = $this->crearCuentaCobrar();

        $datos = $this->postJson("/api/v1/cuentas-cobrar/{$cuenta->ulid}/abonos", [
            'monto' => 40, 'metodo_pago_id' => $this->metodoPago->id,
        ])->assertOk()->json('data');

        $this->assertSame($cuenta->ulid, $datos['cuenta']['id']);
        $this->assertArrayNotHasKey('caja_sesion_id', $datos['abono']);
        $this->assertArrayNotHasKey('cuenta_cobrar_id', $datos['abono']);
        $this->assertSame($cuenta->abonos()->firstOrFail()->ulid, $datos['abono']['id']);
    }

    public function test_cuentas_y_planes_publican_el_folio_de_su_documento_de_origen(): void
    {
        $cuenta = $this->crearCuentaCobrar();
        $venta = $cuenta->venta()->firstOrFail();
        $folioVenta = "V-{$this->sucursal->id}-1";
        $venta->update(['folio' => $folioVenta]);
        $plan = $this->crearPlan($venta);

        $folioCompra = "CO-{$this->sucursal->id}-1";
        $this->compra->update(['folio' => $folioCompra]);
        $pagar = CuentaPagar::factory()->create(['tenant_id' => $this->tenant->id, 'compra_id' => $this->compra->id]);

        $this->getJson("/api/v1/cuentas-cobrar/{$cuenta->ulid}")
            ->assertOk()->assertJsonPath('data.folio', $folioVenta);
        $this->getJson("/api/v1/planes-pago-cliente/{$plan->ulid}")
            ->assertOk()->assertJsonPath('data.folio', $folioVenta);
        $this->getJson('/api/v1/cuentas-pagar')
            ->assertOk()->assertJsonPath('data.0.id', $pagar->ulid)->assertJsonPath('data.0.folio', $folioCompra);
    }

    public function test_los_resources_publican_numero_y_referencias_por_ulid(): void
    {
        $cuenta = $this->crearCuentaCobrar();
        $this->getJson("/api/v1/cuentas-cobrar/{$cuenta->ulid}")
            ->assertJsonMissingPath('data.numero')
            ->assertJsonPath('data.cliente.id', $this->cliente->ulid)
            ->assertJsonPath('data.venta_id', $cuenta->venta()->firstOrFail()->ulid);

        $plan = $this->crearPlan($this->crearVenta());
        $cuota = $plan->cuotas()->orderBy('numero_cuota')->firstOrFail();
        $this->getJson("/api/v1/planes-pago-cliente/{$plan->ulid}")
            ->assertJsonMissingPath('data.numero')
            ->assertJsonPath('data.cuotas.0.id', $cuota->ulid);

        $pagar = CuentaPagar::factory()->create(['tenant_id' => $this->tenant->id, 'compra_id' => $this->compra->id]);
        $this->getJson('/api/v1/cuentas-pagar')
            ->assertOk()
            ->assertJsonPath('data.0.id', $pagar->ulid)
            ->assertJsonMissingPath('data.0.numero');
    }

    public function test_las_entradas_de_cliente_y_cuota_exigen_el_ulid(): void
    {
        $this->postJson('/api/v1/ventas', $this->payloadVenta(['cliente_id' => $this->cliente->getKey()]))
            ->assertStatus(422)->assertJsonValidationErrors(['cliente_id']);
        $this->postJson('/api/v1/ventas', $this->payloadVenta(['cliente_id' => $this->clienteB->ulid]))
            ->assertStatus(422)->assertJsonValidationErrors(['cliente_id']);
        $this->postJson('/api/v1/ventas', $this->payloadVenta())->assertCreated();

        $plan = $this->crearPlan($this->crearVenta());
        $cuota = $plan->cuotas()->orderBy('numero_cuota')->firstOrFail();
        $this->postJson("/api/v1/planes-pago-cliente/{$plan->ulid}/pagar-cuota", ['cuota_id' => $cuota->getKey(), 'monto' => 1, 'metodo_pago_id' => $this->metodoPago->id])
            ->assertStatus(422)->assertJsonValidationErrors(['cuota_id']);
    }

    public function test_el_filtro_por_cliente_recibe_el_ulid(): void
    {
        $this->crearCuentaCobrar();

        $this->getJson("/api/v1/cuentas-cobrar?filtro_cliente_id={$this->cliente->ulid}")->assertOk()->assertJsonCount(1, 'data');
        $this->getJson("/api/v1/cuentas-cobrar?filtro_cliente_id={$this->cliente->getKey()}")->assertOk()->assertJsonCount(0, 'data');
    }

    public function test_la_lista_asignada_al_cliente_se_reconoce_por_su_ulid_sin_permiso_de_elegir(): void
    {
        // Sin precios.elegir_lista: solo pasa si el middleware reconoce que la lista es la asignada.
        $lista = ListaPrecio::factory()->create(['tenant_id' => $this->tenant->id]);
        ListaPrecioCliente::factory()->create(['tenant_id' => $this->tenant->id, 'lista_precio_id' => $lista->id, 'cliente_id' => $this->cliente->id]);

        $this->postJson('/api/v1/ventas', $this->payloadVenta(['lista_precio_id' => $lista->id]))->assertCreated();

        $otra = ListaPrecio::factory()->create(['tenant_id' => $this->tenant->id]);
        $this->postJson('/api/v1/ventas', $this->payloadVenta(['lista_precio_id' => $otra->id]))->assertForbidden();
    }
}
