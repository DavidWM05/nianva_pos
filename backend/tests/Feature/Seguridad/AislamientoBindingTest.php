<?php

namespace Tests\Feature\Seguridad;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Cotizaciones\Models\Cotizacion;
use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\CuentasPagar\Models\CuentaPagar;
use App\Modules\Delivery\Models\Pedido;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Gastos\Models\Gasto;
use App\Modules\GiftCards\Models\GiftCard;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\Kardex;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\Nucleo\Database\Seeders\NucleoRolesPermisosSeeder;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Payroll\Models\Empleado;
use App\Modules\Payroll\Models\Nomina;
use App\Modules\Prestamos\Models\Prestamo;
use App\Modules\Produccion\Models\Insumo;
use App\Modules\Produccion\Models\OrdenProduccion;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\VentasPlazos\Models\PlanPagoCliente;
use Illuminate\Contracts\Routing\UrlRoutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Route;
use Tests\Support\PreparaNegocio;
use Tests\TestCase;

class AislamientoBindingTest extends TestCase
{
    use PreparaNegocio;
    use RefreshDatabase;

    /**
     * Rutas cuyo binding es de catalogo/tenant, no de sucursal, o cuyo
     * aislamiento de sucursal se comprueba en otra prueba especifica.
     *
     * @var array<string, string>
     */
    private const EXENTAS = [
        'api/v1/usuarios/' => 'Usuario es identidad del tenant; sucursal_id es atributo.',
        'api/v1/roles/' => 'Rol global o del tenant; no tiene sucursal.',
        'api/v1/clientes/' => 'Cliente es del tenant; sus ventas/notas se prueban en listados.',
        'api/v1/categorias/' => 'Catalogo del tenant.',
        'api/v1/departamentos/' => 'Catalogo del tenant.',
        'api/v1/productos/' => 'Catalogo del tenant.',
        'api/v1/producto-variantes/' => 'Variante del tenant; kardex se prueba aparte.',
        'api/v1/reglas-precio/' => 'Configuracion de precios del tenant.',
        'api/v1/cupones/' => 'Catalogo del tenant.',
        'api/v1/metodos-pago/' => 'Catalogo del tenant o global.',
        'api/v1/unidades-medida/' => 'Catalogo del tenant o global.',
        'api/v1/gift-cards/' => 'Gift card del tenant; no tiene sucursal.',
        'api/v1/notas-credito/' => 'Nota de credito del tenant; no tiene sucursal directa.',
        'api/v1/planes-pago-cliente/' => 'Plan del tenant; la venta se prueba en su ruta.',
        'api/v1/empleados/' => 'Payroll fuera de la lista operativa; escritura cubierta por SucursalEndpointsTest.',
        'api/v1/nominas/' => 'Payroll fuera de la lista operativa; su ruta manual se prueba aparte.',
        'api/v1/prestamos/' => 'Prestamo es del tenant; no tiene sucursal.',
        'api/v1/insumos/' => 'Binding del insumo es del tenant; endpoint filtra por sucursal.',
    ];

    private Sucursal $sucursalA2;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(NucleoRolesPermisosSeeder::class);
        $this->prepararNegocio([]);
        $this->usuario->refresh();
        $this->sucursalA2 = Sucursal::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'Sucursal A2',
        ]);

        $rol = Rol::create(['tenant_id' => null, 'nombre' => 'aislamiento-'.uniqid(), 'es_sistema' => false]);
        $rol->permisos()->attach(Permiso::where('nombre', '!=', 'sucursales.todas')->pluck('id'));
        $this->usuario->roles()->attach($rol->id);
    }

    public function test_las_60_rutas_con_binding_responden_404_para_otro_tenant(): void
    {
        $fallos = [];

        foreach ($this->rutasConBinding() as [$metodo, $uri, $clase]) {
            $uri = $this->sustituir($uri, $clase, $this->tenantB, $this->sucursalB, $this->usuarioB);
            $estado = $this->actingAs($this->usuario)->json($metodo, '/'.$uri)->getStatusCode();

            if ($estado !== 404) {
                $fallos[] = "{$metodo} /{$uri}: {$estado}";
            }
        }

        $this->assertSame([], $fallos, implode(PHP_EOL, $fallos));
    }

    public function test_las_rutas_operativas_con_binding_responden_404_para_otra_sucursal(): void
    {
        $operativas = [
            Venta::class,
            CajaSesion::class,
            Apartado::class,
            Devolucion::class,
            Cotizacion::class,
            CuentaCobrar::class,
            CuentaPagar::class,
            Pedido::class,
        ];

        $fallos = [];

        foreach ($this->rutasConBinding() as [$metodo, $uri, $clase]) {
            if (! in_array($clase, $operativas, true) || $this->esExenta($uri)) {
                continue;
            }

            $uri = $this->sustituir($uri, $clase, $this->tenant, $this->sucursalA2, $this->usuario);
            $estado = $this->actingAs($this->usuario)->json($metodo, '/'.$uri)->getStatusCode();

            if ($estado !== 404) {
                $fallos[] = "{$metodo} /{$uri}: {$estado}";
            }
        }

        $this->assertSame([], $fallos, implode(PHP_EOL, $fallos));
    }

    public function test_listados_y_rutas_con_id_manual_no_mezclan_sucursales(): void
    {
        $fallos = [];
        $venta = $this->crear(Venta::class, $this->tenant, $this->sucursalA2, $this->usuario);
        $apartado = $this->crear(Apartado::class, $this->tenant, $this->sucursalA2, $this->usuario);
        $devolucion = $this->crear(Devolucion::class, $this->tenant, $this->sucursalA2, $this->usuario);
        $cotizacion = $this->crear(Cotizacion::class, $this->tenant, $this->sucursalA2, $this->usuario);
        $cxc = $this->crear(CuentaCobrar::class, $this->tenant, $this->sucursalA2, $this->usuario);
        $cxp = $this->crear(CuentaPagar::class, $this->tenant, $this->sucursalA2, $this->usuario);
        $pedido = $this->crear(Pedido::class, $this->tenant, $this->sucursalA2, $this->usuario);
        $nota = $this->crear(NotaCredito::class, $this->tenant, $this->sucursalA2, $this->usuario);

        $casos = [
            '/api/v1/ventas' => $venta,
            '/api/v1/apartados' => $apartado,
            '/api/v1/devoluciones' => $devolucion,
            '/api/v1/cotizaciones' => $cotizacion,
            '/api/v1/cuentas-cobrar' => $cxc,
            '/api/v1/cuentas-pagar' => $cxp,
            '/api/v1/pedidos' => $pedido,
        ];

        foreach ($casos as $url => $recurso) {
            $data = $this->actingAs($this->usuario)->getJson($url)->assertOk()->json('data');

            if (in_array($recurso->getKey(), array_column($data, 'id'), true)) {
                $fallos[] = "{$url} expuso el recurso {$recurso->getKey()} de la sucursal A2.";
            }
        }

        $ventasCliente = $this->actingAs($this->usuario)
            ->getJson("/api/v1/clientes/{$this->cliente->id}/ventas")
            ->assertOk()
            ->json('data');
        if (in_array($venta->getKey(), array_column($ventasCliente, 'id'), true)) {
            $fallos[] = 'GET /clientes/{cliente}/ventas expuso una venta de A2.';
        }

        $notasCliente = $this->actingAs($this->usuario)
            ->getJson("/api/v1/clientes/{$this->cliente->id}/notas-credito")
            ->assertOk()
            ->json('data');
        if (in_array($nota->getKey(), array_column($notasCliente, 'id'), true)) {
            $fallos[] = 'GET /clientes/{cliente}/notas-credito expuso una nota de A2.';
        }

        Kardex::create([
            'variante_id' => $this->variante->id,
            'sucursal_id' => $this->sucursalA2->id,
            'tipo' => 'entrada',
            'cantidad' => 1,
            'motivo' => 'ajuste',
            'stock_resultante' => 1,
            'usuario_id' => $this->usuario->id,
        ]);
        $kardex = $this->actingAs($this->usuario)
            ->getJson("/api/v1/producto-variantes/{$this->variante->id}/kardex")
            ->assertOk()
            ->json('data');
        if (in_array($this->sucursalA2->id, array_column($kardex, 'sucursal_id'), true)) {
            $fallos[] = 'GET kardex expuso movimientos de A2.';
        }

        $caja = CajaSesion::factory()->create([
            'sucursal_id' => $this->sucursalA2->id,
            'usuario_id' => $this->usuario->id,
        ]);
        Gasto::create([
            'caja_sesion_id' => $caja->id,
            'sucursal_id' => $this->sucursalA2->id,
            'usuario_id' => $this->usuario->id,
            'descripcion' => 'Gasto A2',
            'monto' => 10,
        ]);
        $gastos = $this->actingAs($this->usuario)
            ->getJson('/api/v1/gastos?caja_sesion_id='.$caja->id)
            ->assertOk()
            ->json('data');
        if ($gastos !== []) {
            $fallos[] = 'GET gastos expuso gastos de A2.';
        }

        $manuales = [
            ['PUT', "/api/v1/cotizaciones/{$cotizacion->getKey()}", ['items' => [['variante_id' => $this->variante->id, 'cantidad' => 1]]]],
            ['POST', "/api/v1/cuentas-cobrar/{$cxc->getKey()}/abonos", ['monto' => 1, 'metodo_pago_id' => $this->metodoPago->id]],
            ['POST', "/api/v1/cuentas-pagar/{$cxp->getKey()}/pagos", ['monto' => 1, 'metodo_pago_id' => $this->metodoPago->id]],
            ['PATCH', "/api/v1/pedidos/{$pedido->getKey()}/estado", ['estado' => 'preparando']],
        ];

        $orden = OrdenProduccion::factory()->create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursalA2->id,
            'usuario_id' => $this->usuario->id,
        ]);
        $nomina = Nomina::factory()->create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursalA2->id,
        ]);
        $manuales[] = ['PATCH', "/api/v1/ordenes-produccion/{$orden->id}/estado", ['estado' => 'cancelada']];
        $manuales[] = ['PATCH', "/api/v1/nominas/{$nomina->id}/pagar", []];

        foreach ($manuales as [$metodo, $url, $payload]) {
            $estado = $this->actingAs($this->usuario)->json($metodo, $url, $payload)->getStatusCode();

            if ($estado !== 404) {
                $fallos[] = "{$metodo} {$url}: {$estado}";
            }
        }

        $this->assertSame([], $fallos, implode(PHP_EOL, $fallos));
    }

    /**
     * @return list<array{string, string, class-string}>
     */
    private function rutasConBinding(): array
    {
        $rutas = [];

        foreach (Route::getRoutes() as $route) {
            if (! in_array('auth:sanctum', $route->gatherMiddleware(), true)) {
                continue;
            }

            $bindings = collect($route->signatureParameters(UrlRoutable::class))
                ->mapWithKeys(fn ($parametro) => [$parametro->getName() => $parametro->getType()?->getName()]);

            if ($bindings->isEmpty()) {
                continue;
            }

            $rutas[] = [$route->methods()[0], $route->uri(), $bindings->first()];
        }

        return $rutas;
    }

    private function esExenta(string $uri): bool
    {
        foreach (array_keys(self::EXENTAS) as $prefijo) {
            if (str_starts_with($uri, $prefijo)) {
                return true;
            }
        }

        return false;
    }

    private function sustituir(string $uri, string $clase, $tenant, Sucursal $sucursal, Usuario $usuario): string
    {
        preg_match_all('/\{([^}]+)\}/', $uri, $coincidencias);

        foreach ($coincidencias[1] as $nombre) {
            $modelo = $this->crear($clase, $tenant, $sucursal, $usuario);
            $uri = str_replace('{'.$nombre.'}', (string) $modelo->getRouteKey(), $uri);
        }

        return $uri;
    }

    private function crear(string $clase, $tenant, Sucursal $sucursal, Usuario $usuario): UrlRoutable
    {
        if ($clase === Usuario::class) {
            return Usuario::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id]);
        }

        if ($clase === CajaSesion::class) {
            return CajaSesion::factory()->create(['sucursal_id' => $sucursal->id, 'usuario_id' => $usuario->id]);
        }

        if ($clase === ProductoVariante::class) {
            $producto = Producto::factory()->create(['tenant_id' => $tenant->id]);

            return ProductoVariante::factory()->create(['producto_id' => $producto->id]);
        }

        if ($clase === Venta::class) {
            return Venta::factory()->create([
                'tenant_id' => $tenant->id,
                'sucursal_id' => $sucursal->id,
                'usuario_id' => $usuario->id,
            ]);
        }

        if ($clase === Apartado::class) {
            return Apartado::factory()->create([
                'tenant_id' => $tenant->id,
                'sucursal_id' => $sucursal->id,
                'usuario_id' => $usuario->id,
            ]);
        }

        if ($clase === Devolucion::class) {
            $venta = Venta::factory()->create([
                'tenant_id' => $tenant->id,
                'sucursal_id' => $sucursal->id,
                'usuario_id' => $usuario->id,
            ]);

            return Devolucion::factory()->create(['tenant_id' => $tenant->id, 'venta_id' => $venta->id]);
        }

        if ($clase === Cotizacion::class) {
            return Cotizacion::factory()->create([
                'tenant_id' => $tenant->id,
                'sucursal_id' => $sucursal->id,
                'usuario_id' => $usuario->id,
            ]);
        }

        if ($clase === CuentaCobrar::class) {
            $venta = Venta::factory()->create([
                'tenant_id' => $tenant->id,
                'sucursal_id' => $sucursal->id,
                'usuario_id' => $usuario->id,
            ]);

            return CuentaCobrar::factory()->create(['tenant_id' => $tenant->id, 'venta_id' => $venta->id]);
        }

        if ($clase === CuentaPagar::class) {
            $compra = Compra::factory()->create([
                'tenant_id' => $tenant->id,
                'sucursal_id' => $sucursal->id,
                'usuario_id' => $usuario->id,
            ]);

            return CuentaPagar::factory()->create(['tenant_id' => $tenant->id, 'compra_id' => $compra->id]);
        }

        if ($clase === Pedido::class) {
            return Pedido::factory()->create([
                'tenant_id' => $tenant->id,
                'sucursal_id' => $sucursal->id,
                'usuario_id' => $usuario->id,
            ]);
        }

        if ($clase === NotaCredito::class) {
            $venta = Venta::factory()->create([
                'tenant_id' => $tenant->id,
                'sucursal_id' => $sucursal->id,
                'usuario_id' => $usuario->id,
            ]);
            $devolucion = Devolucion::factory()->create(['tenant_id' => $tenant->id, 'venta_id' => $venta->id]);

            return NotaCredito::factory()->create(['tenant_id' => $tenant->id, 'devolucion_id' => $devolucion->id]);
        }

        if ($clase === Empleado::class) {
            return Empleado::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id]);
        }

        if ($clase === Nomina::class) {
            return Nomina::factory()->create(['tenant_id' => $tenant->id, 'sucursal_id' => $sucursal->id]);
        }

        if ($clase === Prestamo::class) {
            return Prestamo::factory()->create(['tenant_id' => $tenant->id]);
        }

        if ($clase === Insumo::class) {
            return Insumo::factory()->create(['tenant_id' => $tenant->id]);
        }

        if ($clase === PlanPagoCliente::class) {
            return PlanPagoCliente::factory()->create(['tenant_id' => $tenant->id]);
        }

        if ($clase === GiftCard::class) {
            return GiftCard::factory()->create(['tenant_id' => $tenant->id]);
        }

        return $clase::factory()->create(['tenant_id' => $tenant->id]);
    }
}
