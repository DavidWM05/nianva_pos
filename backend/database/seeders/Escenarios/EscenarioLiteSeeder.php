<?php

namespace Database\Seeders\Escenarios;

use App\Modules\Nucleo\Models\LicenciaLocal;
use App\Modules\Nucleo\Models\PlanSuscripcion;
use App\Modules\Nucleo\Services\TenantContext;

class EscenarioLiteSeeder extends EscenarioSeederBase
{
    public function run(): void
    {
        $tenant = $this->preparar('Tienda Escenario Lite', 1401);

        if ($tenant === null) {
            return;
        }

        app(TenantContext::class)->set($tenant);

        try {
            $this->configurarModulos($tenant, []);

            $sucursal = $this->crearSucursal($tenant, 'Lite Centro');
            $admin = $this->crearUsuario($tenant, $sucursal, 'admin@lite.test', 'Admin Lite', $this->rolGlobal('admin'), true);
            $vendedor = $this->crearUsuario($tenant, $sucursal, 'vendedor@lite.test', 'Vendedor Lite', $this->rolGlobal('vendedor'));

            $plan = PlanSuscripcion::factory()->create([
                'nombre' => 'Lite',
                'slug' => 'lite',
                'limite_usuarios' => 3,
                'limite_sucursales' => 1,
            ]);

            LicenciaLocal::factory()->create([
                'tenant_id' => $tenant->id,
                'tipo' => 'saas',
                'plan_id' => $plan->id,
                'estado' => 'activa',
                'token_firmado' => null,
            ]);

            $proveedor = $this->crearProveedor($tenant, 'Proveedor Lite');
            $departamento = $this->crearDepartamento($tenant, 'Catalogo Lite');
            $categoria = $this->crearCategoria($tenant, 'General Lite');
            $unidad = $this->unidadId('und');

            $productos = [];

            for ($i = 1; $i <= 8; $i++) {
                $producto = $this->crearProducto(
                    $tenant,
                    $departamento,
                    $categoria,
                    "Producto Lite {$i}",
                    30 + ($i * 5),
                    70 + ($i * 10),
                );

                $productos[] = [
                    'producto' => $producto,
                    'variante' => $this->crearVariante($producto, 'Unica', 'Natural', $unidad),
                ];
            }

            $clientes = [];

            for ($i = 1; $i <= 3; $i++) {
                $clientes[] = $this->crearCliente($tenant, "Cliente Lite {$i}");
            }

            $compra = [];

            foreach ($productos as $producto) {
                $compra[] = [
                    'variante' => $producto['variante'],
                    'cantidad' => 20,
                    'precio' => (float) $producto['producto']->precio_compra,
                ];
            }

            $this->comprar($tenant, $sucursal, $admin['usuario'], $proveedor, $compra);
            $this->abrirCaja($sucursal, $vendedor['usuario']);

            for ($i = 0; $i < 5; $i++) {
                $this->vender($tenant, $vendedor['usuario'], $clientes[$i % count($clientes)], [[
                    'variante' => $productos[$i]['variante'],
                    'cantidad' => $i === 2 ? 2 : 1,
                ]], $i === 3);
            }

            $this->imprimirCuentas([
                ['correo' => 'admin@lite.test', 'rol' => 'admin', 'sucursal' => $sucursal->nombre, 'secreto' => $admin['secreto']],
                ['correo' => 'vendedor@lite.test', 'rol' => 'vendedor', 'sucursal' => $sucursal->nombre, 'secreto' => null],
            ]);
        } finally {
            app(TenantContext::class)->set(null);
        }
    }
}
