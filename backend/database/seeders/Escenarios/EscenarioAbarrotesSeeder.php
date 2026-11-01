<?php

namespace Database\Seeders\Escenarios;

use App\Modules\Nucleo\Http\Middleware\ModuloActivo;
use App\Modules\Nucleo\Services\TenantContext;
use App\Modules\Precios\Models\ReglaPrecio;

class EscenarioAbarrotesSeeder extends EscenarioSeederBase
{
    public function run(): void
    {
        $tenant = $this->preparar('Abarrotes Escenario Granel', 1201);

        if ($tenant === null) {
            return;
        }

        app(TenantContext::class)->set($tenant);

        try {
            $this->configurarModulos($tenant, ModuloActivo::MODULOS_DEFAULT);

            $sucursal = $this->crearSucursal($tenant, 'Abarrotes Centro');
            $admin = $this->crearUsuario($tenant, $sucursal, 'admin@abarrotes.test', 'Admin Abarrotes', $this->rolGlobal('admin'), true);
            $vendedor = $this->crearUsuario($tenant, $sucursal, 'vendedor@abarrotes.test', 'Vendedor Abarrotes', $this->rolGlobal('vendedor'));

            $proveedor = $this->crearProveedor($tenant, 'Proveedor Abarrotes del Campo');
            $departamento = $this->crearDepartamento($tenant, 'Abarrotes');
            $granel = $this->crearCategoria($tenant, 'Granel');
            $envasados = $this->crearCategoria($tenant, 'Envasados');
            $bebidas = $this->crearCategoria($tenant, 'Bebidas');

            $unidad = $this->unidadId('und');
            $kilogramo = $this->unidadId('kg');

            $definiciones = [
                ['Arroz a granel', 18, 32, $granel, 'kg'],
                ['Frijol a granel', 22, 38, $granel, 'kg'],
                ['Azucar a granel', 15, 28, $granel, 'kg'],
                ['Cafe a granel', 120, 190, $granel, 'kg'],
                ['Avena a granel', 20, 35, $granel, 'kg'],
                ['Agua 1L', 8, 18, $bebidas, 'und'],
                ['Refresco 600ml', 10, 22, $bebidas, 'und'],
                ['Galletas Surtidas', 12, 25, $envasados, 'und'],
                ['Atun en lata', 15, 30, $envasados, 'und'],
                ['Jabon de barra', 9, 20, $envasados, 'und'],
            ];

            $productos = [];

            foreach ($definiciones as [$nombre, $precioCompra, $precioVenta, $categoria, $unidadAbreviatura]) {
                $producto = $this->crearProducto(
                    $tenant,
                    $departamento,
                    $categoria,
                    $nombre,
                    (float) $precioCompra,
                    (float) $precioVenta,
                );

                $productos[] = [
                    'producto' => $producto,
                    'variante' => $this->crearVariante(
                        $producto,
                        null,
                        null,
                        $unidadAbreviatura === 'kg' ? $kilogramo : $unidad,
                    ),
                ];
            }

            ReglaPrecio::factory()->create([
                'tenant_id' => $tenant->id,
                'nombre' => 'Mayoreo 3x2 agua',
                'tipo' => 'nxm',
                'valor' => null,
                'cantidad_compra' => 3,
                'cantidad_paga' => 2,
                'aplica_a' => 'producto',
                'producto_id' => $productos[5]['producto']->id,
                'activo' => true,
            ]);

            $clientes = [];

            for ($i = 1; $i <= 5; $i++) {
                $clientes[] = $this->crearCliente($tenant, "Cliente Abarrotes {$i}");
            }

            $compra = [];

            foreach ($productos as $producto) {
                $compra[] = [
                    'variante' => $producto['variante'],
                    'cantidad' => 40,
                    'precio' => (float) $producto['producto']->precio_compra,
                ];
            }

            $this->comprar($tenant, $sucursal, $admin['usuario'], $proveedor, $compra);
            $this->abrirCaja($sucursal, $vendedor['usuario']);

            $this->vender($tenant, $vendedor['usuario'], $clientes[0], [[
                'variante' => $productos[0]['variante'],
                'cantidad' => 2,
            ]]);
            $this->vender($tenant, $vendedor['usuario'], $clientes[1], [[
                'variante' => $productos[5]['variante'],
                'cantidad' => 3,
            ]]);
            $this->vender($tenant, $vendedor['usuario'], $clientes[2], [[
                'variante' => $productos[6]['variante'],
                'cantidad' => 2,
            ]]);
            $this->vender($tenant, $vendedor['usuario'], $clientes[3], [[
                'variante' => $productos[2]['variante'],
                'cantidad' => 1,
            ]]);
            $this->vender($tenant, $vendedor['usuario'], $clientes[4], [[
                'variante' => $productos[8]['variante'],
                'cantidad' => 4,
            ]], true);

            $this->imprimirCuentas([
                [
                    'correo' => 'admin@abarrotes.test',
                    'rol' => 'admin',
                    'sucursal' => $sucursal->nombre,
                    'secreto' => $admin['secreto'],
                ],
                [
                    'correo' => 'vendedor@abarrotes.test',
                    'rol' => 'vendedor',
                    'sucursal' => $sucursal->nombre,
                    'secreto' => null,
                ],
            ]);
        } finally {
            app(TenantContext::class)->set(null);
        }
    }
}
