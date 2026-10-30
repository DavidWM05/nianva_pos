<?php

namespace Tests\Support;

use App\Modules\Cotizaciones\Services\CotizacionService;
use App\Modules\Crm\Models\Cliente;
use App\Modules\Crm\Models\PlanPagoCliente;
use App\Modules\Crm\Services\VentasPlazosService;
use App\Modules\Inventario\Models\Categoria;
use App\Modules\Inventario\Models\Producto;
use App\Modules\Inventario\Models\ProductoVariante;
use App\Modules\Inventario\Models\Proveedor;
use App\Modules\Inventario\Services\InventarioService;
use App\Modules\Nucleo\Models\MetodoPago;
use App\Modules\Nucleo\Models\Permiso;
use App\Modules\Nucleo\Models\Rol;
use App\Modules\Nucleo\Models\Sucursal;
use App\Modules\Nucleo\Models\Tenant;
use App\Modules\Nucleo\Models\Usuario;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Tpv\Models\CajaSesion;
use App\Modules\Tpv\Models\Venta;
use App\Modules\Tpv\Services\CajaService;
use App\Modules\Tpv\Services\VentaService;

trait PreparaNegocio
{
    private Tenant $tenant;

    private Sucursal $sucursal;

    private Usuario $usuario;

    private Cliente $cliente;

    private ProductoVariante $variante;

    private ProductoVariante $varianteExtra;

    private MetodoPago $metodoPago;

    private Proveedor $proveedor;

    private CajaSesion $caja;

    private Tenant $tenantB;

    private ProductoVariante $varianteB;

    private Cliente $clienteB;

    private Proveedor $proveedorB;

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
        $producto = Producto::create([
            'tenant_id' => $this->tenant->id,
            'categoria_id' => $categoria->id,
            'nombre' => 'Playera',
            'precio_compra' => 50,
            'precio_venta' => 100,
        ]);
        $this->variante = ProductoVariante::create(['producto_id' => $producto->id, 'talla' => 'M']);
        $this->varianteExtra = ProductoVariante::create(['producto_id' => $producto->id, 'talla' => 'L']);

        $this->metodoPago = MetodoPago::create([
            'tenant_id' => $this->tenant->id,
            'nombre' => 'Efectivo',
            'tipo' => 'efectivo',
        ]);

        app(InventarioService::class)->registrarCompra(
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
        $categoriaB = Categoria::create(['tenant_id' => $this->tenantB->id, 'nombre' => 'Ropa B']);
        $productoB = Producto::create([
            'tenant_id' => $this->tenantB->id,
            'categoria_id' => $categoriaB->id,
            'nombre' => 'Playera B',
            'precio_compra' => 50,
            'precio_venta' => 100,
        ]);
        $this->varianteB = ProductoVariante::create(['producto_id' => $productoB->id, 'talla' => 'M']);
        $this->clienteB = Cliente::sinTenant()
            ->where('tenant_id', $this->tenantB->id)
            ->where('nombre', 'Publico General')
            ->firstOrFail();
        $this->proveedorB = Proveedor::create([
            'tenant_id' => $this->tenantB->id,
            'razon_social' => 'Proveedor B',
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

    private function payloadVenta(array $overrides = []): array
    {
        return array_merge([
            'cliente_id' => $this->cliente->id,
            'items' => [['variante_id' => $this->variante->id, 'cantidad' => 1]],
            'pagos' => [['metodo_pago_id' => $this->metodoPago->id, 'monto' => 100]],
        ], $overrides);
    }
}
