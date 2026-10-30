<?php

namespace Tests\Support;

use App\Modules\Apartados\Models\Apartado;
use App\Modules\Apartados\Services\ApartadoService;
use App\Modules\Cotizaciones\Services\CotizacionService;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Crm\Models\PlanPagoCliente;
use App\Modules\Crm\Models\PlanPagoClienteCuota;
use App\Modules\Crm\Services\VentasPlazosService;
use App\Modules\CuentasCobrar\Models\CuentaCobrar;
use App\Modules\Devoluciones\Models\Devolucion;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Compra;
use App\Modules\Inventario\Models\Departamento;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\NotasCredito\Models\NotaCredito;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Produccion\Models\Insumo;
use App\Modules\Produccion\Models\Receta;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\CajaService;
use App\Modules\Tpv\Services\VentaService;
use App\Modules\UnidadesMedida\Models\UnidadMedida;

trait PreparaNegocio
{
    private Tenant $tenant;

    private Sucursal $sucursal;

    private Usuario $usuario;

    private Cliente $cliente;

    private Producto $producto;

    private ProductoVariante $variante;

    private ProductoVariante $varianteExtra;

    private MetodoPago $metodoPago;

    private Proveedor $proveedor;

    private CajaSesion $caja;

    private Tenant $tenantB;

    private Sucursal $sucursalB;

    private Usuario $usuarioB;

    private ProductoVariante $varianteB;

    private Cliente $clienteB;

    private Proveedor $proveedorB;

    private MetodoPago $metodoPagoB;

    private MetodoPago $metodoPagoGlobal;

    private Categoria $categoriaB;

    private Producto $productoB;

    private Departamento $departamentoB;

    private CajaSesion $cajaB;

    private Venta $ventaB;

    private NotaCredito $notaCreditoB;

    private PlanPagoCliente $planB;

    private PlanPagoClienteCuota $cuotaB;

    private Insumo $insumoB;

    private Receta $recetaB;

    private UnidadMedida $unidadMedidaB;

    private UnidadMedida $unidadMedidaGlobal;

    private Rol $rolB;

    private Rol $rolGlobal;

    private Compra $compra;

    /**
     * @param  list<string>  $permisos
     */
    private function prepararNegocio(array $permisos): void
    {
        $this->tenant = Tenant::create(['nombre' => 'Tenant A', 'pais' => 'MX', 'activo' => true]);
        $this->sucursal = Sucursal::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Centro A']);
        $this->usuario = Usuario::create([
            'tenant_id' => $this->tenant->id,
            'sucursal_id' => $this->sucursal->id,
            'nombre' => 'Ana',
            'correo' => uniqid('validaciones-').'@test.com',
            'password' => 'password-valida-123',
        ]);

        app(TenantContext::class)->set($this->tenant);
        $this->darPermisos($permisos);

        $this->proveedor = Proveedor::create(['tenant_id' => $this->tenant->id, 'razon_social' => 'Proveedor A']);
        $categoria = Categoria::create(['tenant_id' => $this->tenant->id, 'nombre' => 'Ropa']);
        $this->producto = Producto::create([
            'tenant_id' => $this->tenant->id,
            'categoria_id' => $categoria->id,
            'nombre' => 'Playera',
            'precio_compra' => 50,
            'precio_venta' => 100,
        ]);
        $this->variante = ProductoVariante::create(['producto_id' => $this->producto->id, 'talla' => 'M']);
        $this->varianteExtra = ProductoVariante::create(['producto_id' => $this->producto->id, 'talla' => 'L']);

        $this->metodoPago = MetodoPago::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'Efectivo',
            'tipo' => 'efectivo',
        ]);

        $this->compra = app(InventarioService::class)->registrarCompra(
            [
                'tenant_id' => $this->tenant->id,
                'proveedor_id' => $this->proveedor->id,
                'sucursal_id' => $this->sucursal->id,
                'usuario_id' => $this->usuario->id,
            ],
            [
                ['variante_id' => $this->variante->id, 'cantidad' => 50, 'precio_compra' => 50],
                ['variante_id' => $this->varianteExtra->id, 'cantidad' => 50, 'precio_compra' => 50],
            ],
        );

        $this->caja = app(CajaService::class)->abrirCaja($this->sucursal->id, $this->usuario->id, 500);

        $this->cliente = Cliente::sinTenant()
            ->where('tenant_id', $this->tenant->id)
            ->where('nombre', 'Publico General')
            ->firstOrFail();

        $this->tenantB = Tenant::create(['nombre' => 'Tenant B', 'pais' => 'MX', 'activo' => true]);
        $this->sucursalB = Sucursal::create(['tenant_id' => $this->tenantB->id, 'nombre' => 'Centro B']);
        $this->usuarioB = Usuario::create([
            'tenant_id' => $this->tenantB->id,
            'sucursal_id' => $this->sucursalB->id,
            'nombre' => 'Beto',
            'correo' => uniqid('validaciones-b-').'@test.com',
            'password' => 'password-valida-123',
        ]);
        $this->cajaB = CajaSesion::create([
            'sucursal_id' => $this->sucursalB->id,
            'usuario_id' => $this->usuarioB->id,
            'monto_apertura' => 0,
            'estado' => 'abierta',
        ]);

        $this->categoriaB = Categoria::create(['tenant_id' => $this->tenantB->id, 'nombre' => 'Ropa B']);
        $this->productoB = Producto::create([
            'tenant_id' => $this->tenantB->id,
            'categoria_id' => $this->categoriaB->id,
            'nombre' => 'Playera B',
            'precio_compra' => 50,
            'precio_venta' => 100,
        ]);
        $this->varianteB = ProductoVariante::create(['producto_id' => $this->productoB->id, 'talla' => 'M']);
        $this->clienteB = Cliente::sinTenant()
            ->where('tenant_id', $this->tenantB->id)
            ->where('nombre', 'Publico General')
            ->firstOrFail();
        $this->proveedorB = Proveedor::create([
            'tenant_id' => $this->tenantB->id,
            'razon_social' => 'Proveedor B',
        ]);
        $this->departamentoB = Departamento::create([
            'tenant_id' => $this->tenantB->id,
            'nombre' => 'Departamento B',
        ]);
        $this->metodoPagoB = MetodoPago::create([
            'tenant_id' => $this->tenantB->id,
            'nombre' => 'Efectivo B',
            'tipo' => 'efectivo',
        ]);
        $this->metodoPagoGlobal = MetodoPago::create([
            'tenant_id' => null,
            'nombre' => 'Global',
            'tipo' => 'otro',
        ]);
        $this->unidadMedidaB = UnidadMedida::create([
            'tenant_id' => $this->tenantB->id,
            'nombre' => 'Unidad B',
            'abreviatura' => 'ub',
            'tipo' => 'entero',
        ]);
        $this->unidadMedidaGlobal = UnidadMedida::create([
            'tenant_id' => null,
            'nombre' => 'Unidad Global',
            'abreviatura' => 'ug',
            'tipo' => 'entero',
        ]);
        $this->rolB = Rol::create([
            'tenant_id' => $this->tenantB->id,
            'nombre' => 'rol-b-'.uniqid(),
            'es_sistema' => false,
        ]);
        $this->rolGlobal = Rol::create([
            'tenant_id' => null,
            'nombre' => 'rol-global-'.uniqid(),
            'es_sistema' => false,
        ]);
        $this->insumoB = Insumo::create([
            'tenant_id' => $this->tenantB->id,
            'nombre' => 'Insumo B',
            'unidad_medida_id' => $this->unidadMedidaGlobal->id,
        ]);
        $this->recetaB = Receta::create([
            'tenant_id' => $this->tenantB->id,
            'variante_id' => $this->varianteB->id,
            'nombre' => 'Receta B',
        ]);

        $this->ventaB = Venta::create([
            'tenant_id' => $this->tenantB->id,
            'sucursal_id' => $this->sucursalB->id,
            'caja_sesion_id' => $this->cajaB->id,
            'usuario_id' => $this->usuarioB->id,
            'cliente_id' => $this->clienteB->id,
            'total' => 100,
            'estado' => 'completada',
        ]);
        $devolucionB = Devolucion::create([
            'tenant_id' => $this->tenantB->id,
            'sucursal_id' => $this->sucursalB->id,
            'venta_id' => $this->ventaB->id,
            'usuario_id' => $this->usuarioB->id,
            'tipo' => 'devolucion',
            'monto_devolucion' => 100,
            'monto_cambio' => 0,
            'diferencia' => -100,
        ]);
        $this->notaCreditoB = NotaCredito::create([
            'tenant_id' => $this->tenantB->id,
            'cliente_id' => $this->clienteB->id,
            'devolucion_id' => $devolucionB->id,
            'monto_original' => 100,
            'saldo_disponible' => 100,
        ]);
        $this->planB = PlanPagoCliente::create([
            'tenant_id' => $this->tenantB->id,
            'cliente_id' => $this->clienteB->id,
            'venta_id' => $this->ventaB->id,
            'concepto' => 'Plan B',
            'monto_total' => 100,
            'interes_total' => 0,
            'tasa_interes' => 0,
            'numero_cuotas' => 2,
            'periodicidad' => 'mensual',
            'fecha_inicio' => now()->toDateString(),
        ]);
        $this->cuotaB = PlanPagoClienteCuota::create([
            'plan_pago_cliente_id' => $this->planB->id,
            'numero_cuota' => 1,
            'monto' => 50,
            'fecha_vencimiento' => now()->addMonth()->toDateString(),
            'estado' => 'pendiente',
        ]);
    }

    /**
     * @param  list<string>  $nombres
     */
    private function darPermisos(array $nombres): void
    {
        $rol = Rol::create(['tenant_id' => null, 'nombre' => 'rol-validaciones-'.uniqid(), 'es_sistema' => false]);

        foreach ($nombres as $nombre) {
            [$modulo, $accion] = explode('.', $nombre);
            $permiso = Permiso::firstOrCreate(['nombre' => $nombre], ['modulo' => $modulo, 'accion' => $accion]);
            $rol->permisos()->attach($permiso->id);
        }

        $this->usuario->roles()->attach($rol->id);
    }

    private function crearVenta(): Venta
    {
        return app(VentaService::class)->registrarVenta(
            [
                'tenant_id' => $this->tenant->id,
                'sucursal_id' => $this->sucursal->id,
                'usuario_id' => $this->usuario->id,
                'cliente_id' => $this->cliente->id,
            ],
            [['variante_id' => $this->variante->id, 'cantidad' => 1]],
            [['metodo_pago_id' => $this->metodoPago->id, 'monto' => 100]],
        );
    }

    private function crearPlan(Venta $venta): PlanPagoCliente
    {
        return app(VentasPlazosService::class)->crearPlan($venta, [
            'numero_cuotas' => 2,
            'periodicidad' => 'mensual',
        ]);
    }

    private function crearCotizacion(): int
    {
        $cotizacion = app(CotizacionService::class)->crear(
            [
                'tenant_id' => $this->tenant->id,
                'sucursal_id' => $this->sucursal->id,
                'usuario_id' => $this->usuario->id,
                'cliente_id' => $this->cliente->id,
                'validez_dias' => 15,
                'descuento' => 0,
                'observaciones' => null,
                'uso_cfdi' => null,
            ],
            [['variante_id' => $this->variante->id, 'cantidad' => 1, 'precio_unitario' => 100, 'descuento' => 0]],
        );

        return $cotizacion->id;
    }

    /**
     * @param  list<string>  $nombres
     */
    private function darPermisosA(Usuario $usuario, array $nombres): void
    {
        $rol = Rol::create(['tenant_id' => null, 'nombre' => 'rol-validaciones-'.uniqid(), 'es_sistema' => false]);

        foreach ($nombres as $nombre) {
            [$modulo, $accion] = explode('.', $nombre);
            $permiso = Permiso::firstOrCreate(['nombre' => $nombre], ['modulo' => $modulo, 'accion' => $accion]);
            $rol->permisos()->attach($permiso->id);
        }

        $usuario->roles()->attach($rol->id);
    }

    private function payloadVenta(array $overrides = []): array
    {
        return array_merge([
            'cliente_id' => $this->cliente->id,
            'items' => [['variante_id' => $this->variante->id, 'cantidad' => 1]],
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => 100]],
        ], $overrides);
    }

    private function crearApartado(): Apartado
    {
        return app(ApartadoService::class)->crearApartado(
            [
                'tenant_id' => $this->tenant->id,
                'sucursal_id' => $this->sucursal->id,
                'cliente_id' => $this->cliente->id,
                'usuario_id' => $this->usuario->id,
            ],
            [['variante_id' => $this->variante->id, 'cantidad' => 1]],
        );
    }

    private function crearCuentaCobrar(): CuentaCobrar
    {
        $venta = $this->crearVenta();

        return CuentaCobrar::create([
            'tenant_id' => $this->tenant->id,
            'venta_id' => $venta->id,
            'cliente_id' => $this->cliente->id,
            'monto_total' => 100,
            'saldo_pendiente' => 100,
            'estado' => 'pendiente',
        ]);
    }

    private function crearInsumo(): Insumo
    {
        return Insumo::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'Insumo A',
            'unidad_medida_id' => $this->unidadMedidaGlobal->id,
        ]);
    }
}
